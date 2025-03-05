const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Role = sequelize.define(
  "Role",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    timestamps: true,
    createdAt: "created_on",
    updatedAt: "updated_on",
  }
);

module.exports = Role;
