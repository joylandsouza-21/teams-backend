const sequelize = require("../../config/postgres");
const User = require("../users/user.model.pg");
const Conversation = require("./conversation.model.pg");
const ConversationMember = require("./conversationMember.model.pg");
const Message = require("../messages/message.model.mongo");

const { Op } = require("sequelize");
const ConversationRead = require("./conversationRead.model.pg");

module.exports = {

    async createOrFindDirect(user1Id, user2Id) {

        // 1️⃣ Find if a direct conversation already exists between these two users
        const existing = await Conversation.findOne({
            where: { type: "direct" },
            subQuery: false,
            include: [
                {
                    model: ConversationMember,
                    as: "members",
                    attributes: [],
                    required: true,
                    where: {
                        userId: {
                            [Op.in]: [user1Id, user2Id]
                        }
                    }
                }
            ],
            group: ["conversations.id"],
            having: sequelize.where(
                sequelize.fn("COUNT", sequelize.col("members.userId")),
                2
            )
        });

        if (existing) {
            return existing;
        }

        // 2️⃣ Create new direct conversation
        const conversation = await Conversation.create({
            type: "direct"
        });

        // 3️⃣ Add both users as members
        await ConversationMember.bulkCreate([
            {
                conversationId: conversation.id,
                userId: user1Id,
                role: "member"
            },
            {
                conversationId: conversation.id,
                userId: user2Id,
                role: "member"
            }
        ]);

        return conversation;
    },

    async createGroupConversation({ creatorId, name, members }) {

        // Remove duplicates + ensure creator is included
        const uniqueMembers = Array.from(new Set([creatorId, ...members]));

        const conversation = await Conversation.create({
            type: "group",
            name,
        });

        // Creator = admin, others = members
        await ConversationMember.bulkCreate(
            uniqueMembers.map(userId => ({
                conversationId: conversation.id,
                userId,
                role: userId === creatorId ? "admin" : "member",
            }))
        );

        return conversation;
    },

    async convertDirectToGroup({ conversationId, userId, name, newMembers }) {
        const convo = await Conversation.findByPk(conversationId);

        if (!convo || convo.type !== "direct") {
            throw new Error("Only direct chats can be converted");
        }

        // ✅ Make it a group now
        convo.type = "group";
        convo.name = name;
        await convo.save();

        // ✅ Add new users as members
        await ConversationMember.bulkCreate(
            newMembers.map(uid => ({
                conversationId,
                userId: uid,
                role: "member",
            }))
        );

        return convo;
    },

    async addMembers({ conversationId, members, userId }) {

        // ✅ Check admin
        const admin = await ConversationMember.findOne({
            where: { conversationId, userId, role: "admin" }
        });

        if (!admin) throw new Error("Only admin can add members");

        await ConversationMember.bulkCreate(
            members.map(uid => ({
                conversationId,
                userId: uid,
                role: "member"
            })),
            { ignoreDuplicates: true }
        );

        return true;
    },

    async removeMember({ conversationId, userId, adminId }) {

        const admin = await ConversationMember.findOne({
            where: { conversationId, userId: adminId, role: "admin" }
        });

        if (!admin) throw new Error("Only admin can remove members");

        await ConversationMember.destroy({
            where: { conversationId, userId }
        });

        return true;
    },

    async createChannelConversation({ creatorId, name }) {

        const conversation = await Conversation.create({
            type: "channel",
            name,
        });

        // Creator is admin
        await ConversationMember.create({
            conversationId: conversation.id,
            userId: creatorId,
            role: "admin",
        });

        return conversation;
    },

    async isMember(userId, conversationId) {
        const member = await ConversationMember.findOne({
            where: { userId, conversationId }
        });

        return !!member;
    },

    async getAllConversations(userId) {

        //  Get user's conversations
        const conversations = await Conversation.findAll({
            subQuery: false,
            attributes: ["id", "type", "name", "createdAt"],
            include: [
                {
                    model: ConversationMember,
                    as: "members",
                    attributes: [],
                    required: true,
                    where: { userId }
                }
            ],
            order: [["createdAt", "DESC"]]
        });

        if (!conversations.length) return [];

        const conversationIds = conversations.map(c => String(c.id));

        // Load ALL members with user data
        const members = await ConversationMember.findAll({
            where: {
                conversationId: {
                    [Op.in]: conversationIds
                }
            },
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: ["id", "name", "email", "profile_pic"]
                }
            ]
        });

        // Load last read message per conversation (Postgres)
        const reads = await ConversationRead.findAll({
            where: {
                userId,
                conversationId: {
                    [Op.in]: conversationIds
                }
            }
        });

        const readMap = {};
        reads.forEach(r => {
            readMap[String(r.conversationId)] = r.lastMessageId;
        });

        // ✅ 4️⃣ 🔥 SINGLE MONGO AGGREGATION FOR UNREAD COUNTS
        const unreadAggregation = await Message.aggregate([
            {
                $match: {
                    conversationId: { $in: conversationIds }
                }
            },
            {
                $group: {
                    _id: "$conversationId",
                    lastMessageId: { $max: "$_id" },
                    totalMessages: { $sum: 1 }
                }
            }
        ]);

        // Count unread per conversation using readMap
        const unreadMap = {};

        for (const convo of unreadAggregation) {
            const conversationId = convo._id;
            const lastReadMessageId = readMap[conversationId];

            if (!lastReadMessageId) {
                // ✅ All messages are unread
                unreadMap[conversationId] = convo.totalMessages;
            } else {
                // ✅ Count only those AFTER last read
                unreadMap[conversationId] = await Message.countDocuments({
                    conversationId,
                    _id: { $gt: lastReadMessageId }
                });
            }
        }

        // ✅ 6️⃣ Build conversation map
        const conversationMap = {};

        conversations.forEach(c => {
            conversationMap[c.id] = {
                ...c.toJSON(),
                members: [],
                unreadCount: unreadMap[String(c.id)] || 0
            };
        });

        members.forEach(m => {
            if (conversationMap[m.conversationId] && m.user) {
                conversationMap[m.conversationId].members.push(m.user);
            }
        });

        return conversations.map(c => conversationMap[c.id]);
    }
    ,

    async updateConversationService({ conversationId, name }) {
        const conversation = await Conversation.findOne({
            where: { id: conversationId }
        })

        if (!conversation) throw new Error("No conversation found!")

        // Avoid useless DB update
        if (conversation.name === name) {
            return conversation;
        }

        // Update and return updated record
        await conversation.update({ name });

        return conversation;

    },

    async getConversationMembers(conversationId) {
        if (!conversationId) {
            throw new Error("Conversation ID is required");
        }

        const members = await ConversationMember.findAll({
            where: { conversationId },
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: ["id", "name", "email", "profile_pic"],
                },
            ],
            attributes: ["id", "role", "createdAt"],
        });

        return members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            profilePic: m.user.profile_pic,
            role: m.role,
            joinedAt: m.createdAt,
        }));
    }

};
