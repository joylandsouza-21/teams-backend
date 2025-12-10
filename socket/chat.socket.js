const sanitize = require("../utils/sanitize");
const MessageService = require("../modules/messages/message.service");
const ConversationService = require("../modules/conversations/conversation.service");
const User = require("../modules/users/user.model.pg");

module.exports = function (io, socket) {

  socket.on("join_conversation", async ({ conversationId }) => {
    const userId = socket.user.id;

    if (!await ConversationService.isMember(userId, conversationId)) {
      return socket.emit("error", "NOT_ALLOWED");
    }

    socket.join(`conversation:${conversationId}`);
  });

  socket.on("leave_conversation", ({ conversationId }) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on("send_message", async ({ conversationId, content, replyTo, attachments }) => {
    const userId = socket.user.id;

    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "profile_pic"]
    });

    if (!user) throw new Error("Sender not found");

    if (!await ConversationService.isMember(userId, conversationId)) {
      return socket.emit("error", "UNAUTHORIZED");
    }

    const clean = sanitize(content);
    // if (!clean.trim()) return;

    let replyPreview = null;
    if (replyTo) {
      replyPreview = await MessageService.getMessagePreview(replyTo)
    }

    const message = await MessageService.sendMessage({
      conversationId,
      senderId: userId,
      sender: {
        id: user.id,
        name: user.name,
        profile_pic: user.profile_pic
      },
      content: clean,
      replyPreview,
      replyTo: replyTo,
      attachments,
    });

    io.to(`conversation:${conversationId}`).emit("new_message", message);

    // Emit BACKGROUND alert to ALL members (including unopened chats)
    const members = await ConversationService.getConversationMembers(conversationId);

    const userRooms = members.map(m => `user:${m.id}`);

    io.to(userRooms).emit("background_message", {
      conversationId,
      messageId: message._id,
      senderId: userId
    });
  });

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

  socket.on("delete_message", async ({ messageId }) => {
    const userId = socket.user.id;

    const msg = await MessageService.deleteMessage({
      messageId,
      userId,
    });

    if (!msg) return socket.emit("error", "NOT_ALLOWED");

    io.to(`conversation:${msg.conversationId}`).emit("message_deleted", msg);
  });

  socket.on("react_message", async ({ messageId, emoji }) => {
    const userId = socket.user.id;

    const msg = await MessageService.reactMessage({
      messageId,
      userId,
      emoji,
    });

    io.to(`conversation:${msg.conversationId}`).emit("message_reacted", msg);
  });

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

};
