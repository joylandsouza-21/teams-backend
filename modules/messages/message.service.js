const Message = require("./message.model.mongo");
const ConversationRead = require("../conversations/conversationRead.model.pg");

module.exports = {

  // ======================================
  // GET MESSAGE HISTORY (PAGINATED)
  // ======================================
  async getHistory({ conversationId, limit = 50, before }) {
    const filter = { conversationId };

    if (before) {
      filter._id = { $lt: before };
    }

    const messages = await Message.find(filter)
      .sort({ _id: -1 })          // newest first
      .limit(limit + 1)          // ✅ fetch extra 1
      .lean();

    const hasMore = messages.length > limit;

    if (hasMore) {
      messages.pop();
    }

    return {
      messages: messages.reverse(),
      hasMore
    };
  },



  // ======================================
  // SEND MESSAGE (supports reply + attachments)
  // ======================================
  async sendMessage({ conversationId, senderId, content, replyPreview, replyTo, attachments = [] }) {
    const msg = await Message.create({
      conversationId,
      senderId,
      content,
      replyPreview,
      replyTo: replyTo || null,
      attachments,
    });

    return msg.toObject();
  },



  // ======================================
  // EDIT MESSAGE
  // Only message owner can edit
  // ======================================
  async editMessage({ messageId, userId, content }) {
    const msg = await Message.findOneAndUpdate(
      { _id: messageId, senderId: userId },   // permission check
      { content, edited: true },
      { new: true, lean: true }
    );

    if (!msg) throw new Error("Message not found or not allowed");

    return msg;
  },



  // ======================================
  // DELETE MESSAGE (soft delete)
  // ======================================
  async deleteMessage({ messageId, userId }) {
    const msg = await Message.findOneAndUpdate(
      { _id: messageId, senderId: userId },   // permission
      { deleted: true, content: "" },
      { new: true }
    );

    if (!msg) throw new Error("Message not found or not allowed");

    return msg.toObject();
  },



  // ======================================
  // REACT TO MESSAGE (toggle)
  // reactions: { "👍": [1,2], "❤️": [4] }
  // ======================================
  async reactMessage({ messageId, userId, emoji }) {
    const msg = await Message.findById(messageId);
    if (!msg) throw new Error("Message not found");

    if (!msg.reactions.has(emoji)) {
      msg.reactions.set(emoji, []);
    }

    const users = msg.reactions.get(emoji);
    const index = users.indexOf(userId);

    if (index >= 0) {
      users.splice(index, 1);   // ✅ remove reaction
    } else {
      users.push(userId);      // ✅ add reaction
    }

    msg.markModified("reactions");
    await msg.save();

    const plain = msg.toObject();

    // ✅ ✅ ✅ FORCE MAP TO OBJECT (CRITICAL)
    plain.reactions = Object.fromEntries(
      [...msg.reactions.entries()]
    );

    return plain;
  },


  // ======================================
  // MARK AS READ
  // Saves latest read message id per user
  // ======================================
  async markAsRead({ conversationId, userId, lastMessageId }) {
    await ConversationRead.upsert({
      conversationId,
      userId,
      lastMessageId,
    });

    return { success: true };
  },

  async getMessagePreview(replyTo) {
    const parentMsg = await Message.findById(replyTo)
      .select("content senderId")
      .lean();

    if (parentMsg) {
      return {
        content: parentMsg.content,
        senderId: parentMsg.senderId
      };
    } else {
      return {
        content: "Original message deleted",
        senderId: null
      };
    }
  }

};
