  const { DataTypes } = require("sequelize");
  const sequelize = require("../../config/postgres");
  const ConversationMember = require("./conversationMember.model.pg");

  const Conversation = sequelize.define("conversations", {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    type: {
      type: DataTypes.ENUM("direct", "group", "channel"),
      allowNull: false,
      defaultValue: "direct",
    },

    name: {
      type: DataTypes.STRING,
      allowNull: true, // only for group or channel
    },

  }, {
    timestamps: true,
  });

  module.exports = Conversation;
