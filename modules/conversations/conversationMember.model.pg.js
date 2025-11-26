const { DataTypes } = require("sequelize");
const sequelize = require("../../config/postgres");
const User = require("../users/user.model.pg");
const Conversation = require("./conversation.model.pg");

const ConversationMember = sequelize.define("conversation_members", {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },

  role: {
    type: DataTypes.ENUM("member", "admin"),
    defaultValue: "member",
  },

}, {
  timestamps: true,
});

Conversation.belongsToMany(User, {
  through: ConversationMember,
  foreignKey: "conversationId",
});

User.belongsToMany(Conversation, {
  through: ConversationMember,
  foreignKey: "userId",
});

module.exports = ConversationMember;
