const sanitize = require("../utils/sanitize");
const MessageService = require("../modules/messages/message.service");
const ConversationService = require("../modules/conversations/conversation.service");
const conversationService = require("../modules/conversations/conversation.service");

module.exports = function (io, socket) {

  // ============================
  // JOIN CONVERSATION
  // ============================
  socket.on("join_conversation", async ({ conversationId }) => {
    const userId = socket.user.id;

    if (!await ConversationService.isMember(userId, conversationId)) {
      return socket.emit("error", "NOT_ALLOWED");
    }

    socket.join(`conversation:${conversationId}`);
  });



  // ============================
  // SEND MESSAGE + REPLY
  // ============================
  socket.on("send_message", async ({ conversationId, content, replyTo }) => {
    const userId = socket.user.id;

    if (!await ConversationService.isMember(userId, conversationId)) {
      return socket.emit("error", "UNAUTHORIZED");
    }

    const clean = sanitize(content);
    if (!clean.trim()) return;

    const message = await MessageService.sendMessage({
      conversationId,
      senderId: userId,
      content: clean,
      replyTo: replyTo || null,
    });

    io.to(`conversation:${conversationId}`).emit("new_message", message);
  });



  // ============================
  // EDIT MESSAGE
  // ============================
  socket.on("edit_message", async ({ messageId, content }) => {
    const userId = socket.user.id;

    const clean = sanitize(content);
    if (!clean.trim()) return;

    const msg = await MessageService.editMessage({
      messageId,
      userId,
      content: clean,
    });

    if (!msg) return socket.emit("error", "NOT_ALLOWED");

    io.to(`conversation:${msg.conversationId}`).emit("message_edited", msg);
  });



  // ============================
  // DELETE MESSAGE
  // ============================
  socket.on("delete_message", async ({ messageId }) => {
    const userId = socket.user.id;

    const msg = await MessageService.deleteMessage({
      messageId,
      userId,
    });

    if (!msg) return socket.emit("error", "NOT_ALLOWED");

    io.to(`conversation:${msg.conversationId}`).emit("message_deleted", msg);
  });



  // ============================
  // REACT TO MESSAGE
  // ============================
  socket.on("react_message", async ({ messageId, emoji }) => {
    const userId = socket.user.id;

    const msg = await MessageService.reactMessage({
      messageId,
      userId,
      emoji,
    });

    io.to(`conversation:${msg.conversationId}`).emit("message_reacted", msg);
  });



  // ============================
  // MARK AS READ
  // ============================
  socket.on("mark_read", async ({ conversationId, lastMessageId }) => {
    const userId = socket.user.id;

    await MessageService.markAsRead({
      conversationId,
      userId,
      lastMessageId,
    });

    io.to(`conversation:${conversationId}`).emit("read_receipt", {
      userId,
      messageId: lastMessageId,
    });
  });



  // ============================
  // TYPING INDICATOR
  // ============================
  socket.on("typing", ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit("typing", {
      userId: socket.user.id,
    });
  });

  socket.on("stop_typing", ({ conversationId }) => {
    socket.to(`conversation:${conversationId}`).emit("stop_typing", {
      userId: socket.user.id,
    });
  });

  socket.on("add_member", async ({ conversationId, userId }) => {
    const adminId = socket.user.id;

    // 1️⃣ Update DB
    await conversationService.addMembers({
      conversationId,
      members: [userId],
      userId: adminId,
    });

    // 2️⃣ Emit realtime update ✅
    io.to(`conversation:${conversationId}`).emit("member_added", { userId });
  });


  socket.on("remove_member", async ({ conversationId, userId }) => {
    const adminId = socket.user.id;

    await ConversationService.removeMember({
      conversationId,
      userId,
      adminId,
    });

    io.to(`conversation:${conversationId}`).emit("member_removed", { userId });
  });


  socket.on("convert_to_group", async ({ conversationId, name, newMembers }) => {
    const adminId = socket.user.id;

    await ConversationService.convertDirectToGroup({
      conversationId,
      userId: adminId,
      name,
      newMembers,
    });

    io.to(`conversation:${conversationId}`).emit("group_converted", { conversationId });
  });

};
