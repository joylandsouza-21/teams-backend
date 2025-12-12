// models/call.model.pg.js
const { DataTypes } = require("sequelize");
const sequelize = require("../../config/postgres");

const Call = sequelize.define(
  "Call",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    conversationId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(20),
      allowNull: false, // 'audio' | 'video'
    },
    started_by: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    livekit_room: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "ongoing", // 'ongoing', 'ended', 'missed', 'cancelled'
    },
    duration_seconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "calls",
    timestamps: false,
  }
);

module.exports = Call;
