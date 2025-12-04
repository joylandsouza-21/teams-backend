const ConversationService = require("./conversation.service");
const { getIO } = require("../../socket");

module.exports = {

    async createOrGetDirect(req, res) {
        try {
            const user1Id = req.user.id;

            const { userId: user2Id } = req.body;

            if (user1Id === user2Id) {
                return res.status(400).json({ error: "Cannot create chat with yourself" });
            }

            const conversation = await ConversationService.createOrFindDirect(user1Id, user2Id);

            const io = getIO();
            io.to(`user:${user1Id}`).emit("refresh_chat", {
                conversationId: conversation.id,
            });

            io.to(`user:${user2Id}`).emit("refresh_chat", {
                conversationId: conversation.id,
            });

            return res.json({
                conversationId: conversation.id
            });

        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    },

    // ===========================
    // GROUP CHAT
    // ===========================
    async createGroup(req, res) {
        try {
            const creatorId = req.user.id;
            const { name, members } = req.body;

            const conversation = await ConversationService.createGroupConversation({
                creatorId,
                name,
                members,
            });

            const io = getIO();

            for (const userId of members) {
                io.to(`user:${userId}`).emit("refresh_chat", {
                    conversationId: conversation.id,
                });
            }

            return res.json({
                conversationId: conversation.id
            });

        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    },

    async convertToGroup(req, res) {
        try {
            const { conversationId } = req.params;
            const { name, newMembers } = req.body;
            const userId = req.user.id; // admin check later

            const convo = await ConversationService.convertDirectToGroup({
                conversationId,
                userId,
                name,
                newMembers
            });

            const io = getIO();
            io.to(`conversation:${conversationId}`).emit("group_converted", { conversationId });

            return res.json({ conversationId: convo.id });

        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    },

    async addMembers(req, res) {
        try {
            const { conversationId } = req.params;
            const { members } = req.body;
            const userId = req.user.id;

            await ConversationService.addMembers({
                conversationId,
                members,
                userId,
            });

            // ✅ 2. Emit real-time update
            const io = getIO();

            members.forEach((userId) => {
                io.to(`conversation:${conversationId}`).emit("member_added", {
                    userId,
                    conversationId,
                });
            });

            res.json({ success: true });

        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    },

    async removeMember(req, res) {
        try {
            const { conversationId, userId } = req.params;
            const adminId = req.user.id;

            await ConversationService.removeMember({
                conversationId,
                userId,
                adminId,
            });

            const io = getIO();
            io.to(`conversation:${conversationId}`).emit("member_removed", { userId });


            res.json({ success: true });

        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    },

    // ===========================
    // CHANNEL CHAT
    // ===========================
    async createChannel(req, res) {
        try {
            const creatorId = req.user.id;
            const { name } = req.body;

            const conversation = await ConversationService.createChannelConversation({
                creatorId,
                name,
            });

            return res.json({
                conversationId: conversation.id
            });

        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    },

    async getAllConversations(req, res) {
        try {
            const creatorId = req.user.id;
            const result = await ConversationService.getAllConversations(creatorId)
            return res.json(result);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    },

    async updateConversation(req, res) {
        try {
            const { conversationId } = req.params;
            const { name } = req.body;
            const result = await ConversationService.updateConversationService({ conversationId, name })

            const members = await ConversationService.getConversationMembers(conversationId)

            const userRooms = members.map(m => `user:${m.id}`);
            
            const io = getIO();
            io.to(userRooms).emit("refresh_chat", {
                conversationId: conversationId,
            });

            return res.status(200).json({
                message: "Conversation updated successfully",
                data: result
            });

        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }


};
