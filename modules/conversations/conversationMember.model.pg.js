const { DataTypes } = require("sequelize");
const sequelize = require("../../config/postgres");
const User = require("../users/user.model.pg");
const Conversation = require("./conversation.model.pg");

const ConversationMember = sequelize.define("conversation_members", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },

  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },

  conversationId: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },

  role: {
    type: DataTypes.ENUM("member", "admin"),
    defaultValue: "member",
  },

}, { timestamps: true });

module.exports = ConversationMember;
