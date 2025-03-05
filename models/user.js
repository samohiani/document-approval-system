const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const Role = require("./role");
const Department = require("./department");
const College = require("./college");

const User = sequelize.define(
  "User",
  {
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Role,
        key: "id",
      },
      allowNull: false,
    },
    college_id: {
      type: DataTypes.INTEGER,
      references: {
        model: College,
        key: "id",
      },
      allowNull: true,
    },
    department_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Department,
        key: "id",
      },
      allowNull: true,
    },
  },
  {
    timestamps: true,
    createdAt: "created_on",
    updatedAt: "updated_on",
  }
);

module.exports = User;
