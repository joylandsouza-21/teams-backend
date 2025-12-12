// models/callParticipant.model.pg.js
const { DataTypes } = require("sequelize");
const sequelize = require("../../config/postgres");

const CallParticipant = sequelize.define(
  "CallParticipant",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    call_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    joined_at: {
      type: DataTypes.DATE,
    },
    left_at: {
      type: DataTypes.DATE,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "ringing", // 'ringing', 'accepted', 'declined', 'missed', 'left'
    },
  },
  {
    tableName: "call_participants",
    timestamps: false,
  }
);

module.exports = CallParticipant;
