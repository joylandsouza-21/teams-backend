const { DataTypes } = require("sequelize");
const sequelize = require("../../config/postgres");

const User = sequelize.define("users", {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  auth_provider: {
    type: DataTypes.ENUM("local", "azure"),
    allowNull: false,
    defaultValue: "local",
  },

  password: {
    type: DataTypes.STRING,
    allowNull: true,       // only for local users
  },

  azure_id: {
    type: DataTypes.STRING,
    allowNull: true,       // only for Azure users
  },

  role: {
    type: DataTypes.ENUM("user", "admin"),
    defaultValue: "user",
  },

}, {
  timestamps: true,       
  paranoid: true,     
  tableName: "users",
});

module.exports = User;
