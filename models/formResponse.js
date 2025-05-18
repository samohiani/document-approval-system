const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const Form = require("./form.js");
const User = require("./user.js");

const FormResponse = sequelize.define(
  "FormResponse",
  {
    form_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Form,
        key: "id",
      },
      onUpdate: "CASCADE",
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
  },
  {
    timestamps: true,
    createdAt: "created_on",
    updatedAt: "updated_on",
  }
);

module.exports = FormResponse;
