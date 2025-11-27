const Conversation = require("./conversation.model.pg");
const ConversationMember = require("./conversationMember.model.pg");
const { Op } = require("sequelize");

module.exports = {

    // ==========================================
    // CREATE OR GET DIRECT CONVERSATION (DM)
    // ==========================================
    async createOrFindDirect(user1Id, user2Id) {

        // 1️⃣ Find if a direct conversation already exists between these two users
        const existing = await Conversation.findOne({
            where: { type: "direct" },
            include: [
                {
                    model: ConversationMember,
                    where: {
                        userId: {
                            [Op.in]: [user1Id, user2Id]
                        }
                    }
                }
            ],
            group: ["conversations.id"],
            having: sequelize.literal(`COUNT(conversation_members.userId) = 2`)
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

    // ======================================================
    // GROUP CHAT (private multi-user)
    // ======================================================
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


    // ======================================================
    // CHANNEL CHAT (public / team-based)
    // ======================================================
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


    // ==========================================
    // CHECK IF USER IS MEMBER (used by socket)
    // ==========================================
    async isMember(userId, conversationId) {
        const member = await ConversationMember.findOne({
            where: { userId, conversationId }
        });

        return !!member;
    }

};
