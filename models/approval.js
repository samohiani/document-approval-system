const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const User = require("./user.js");
const FormResponse = require("./formResponse.js");

const Approval = sequelize.define(
  "Approval",
  {
    response_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: FormResponse,
        key: "id",
      },
      onUpdate: "CASCADE",
    },
    step_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role_required: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    approver_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: "id",
      },
      onUpdate: "CASCADE",
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "pending", // pending, approved, rejected
    },
    comment: {
      type: DataTypes.TEXT,
    },
  },
  {
    timestamps: true,
    createdAt: "created_on",
    updatedAt: "updated_on",
  }
);

module.exports = Approval;
