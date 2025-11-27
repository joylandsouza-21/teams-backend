const { DataTypes } = require("sequelize");
const sequelize = require("../../config/postgres");
const User = require("../users/user.model.pg");
const Conversation = require("./conversation.model.pg");

const ConversationRead = sequelize.define("conversation_reads", {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },

  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: User,
      key: "id",
    },
    onDelete: "CASCADE",
  },

  conversationId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: Conversation,
      key: "id",
    },
    onDelete: "CASCADE",
  },

  // MongoDB Message _id (string)
  lastMessageId: {
    type: DataTypes.STRING,
    allowNull: false,
  },

}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ["userId", "conversationId"], // one read state per user per convo
    }
  ]
});

module.exports = ConversationRead;
