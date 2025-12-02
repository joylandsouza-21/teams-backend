const sequelize = require("../../config/postgres");
const User = require("../users/user.model.pg");
const Conversation = require("./conversation.model.pg");
const ConversationMember = require("./conversationMember.model.pg");
const { Op } = require("sequelize");

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

        // ✅ 1️⃣ Get only conversations where this user is a member
        const conversations = await Conversation.findAll({
            subQuery: false,
            attributes: ["id", "type", "name"],
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

        const conversationIds = conversations.map(c => c.id);

        // ✅ 2️⃣ Load ALL members + their user data (INCLUDING current user)
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

        // ✅ 3️⃣ Convert members → users[] per conversation
        const conversationMap = {};

        conversations.forEach(c => {
            conversationMap[c.id] = {
                ...c.toJSON(),
                members: []
            };

        });

        members.forEach(m => {
            if (conversationMap[m.conversationId] && m.user) {
                conversationMap[m.conversationId].members.push(m.user);
            }
        });

        return conversations.map(c => conversationMap[c.id]);
    },

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

    }

};
