const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true,
  },

  senderId: {
    type: Number,
    required: true,
    index: true,
  },

  content: {
    type: String,
    default: "",
  },

  attachments: {
    type: Array,
    default: [],
  },

  // Reply functionality
  replyTo: {
    type: String, // store message _id of parent message
    default: null,
  },

  replyPreview: {
    content: {
      type: String,
      default: null,
    },
    senderId: {
      type: Number,
      default: null,
    },
  },

  // Reactions: like :thumbsup:, :heart:
  reactions: {
    type: Map,
    of: [Number],  // array of userIds who reacted
    default: {},   // e.g., { "👍": [1, 3], "❤️": [5] }
  },

  // Edited messages
  edited: {
    type: Boolean,
    default: false,
  },

  // Soft delete (don't remove from DB)
  deleted: {
    type: Boolean,
    default: false,
  },

}, {
  timestamps: true,
});

module.exports = mongoose.model("Message", MessageSchema);
