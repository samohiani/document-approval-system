const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const Form = require("./form.js");

const ApprovalFlow = sequelize.define(
  "ApprovalFlow",
  {
    form_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Form, key: "id" },
      onUpdate: "CASCADE",
    },
    flow_definition: {
      type: DataTypes.JSON,
      allowNull: false,
      // Expected structure: [{ "step": 1, "role_required": "hod" }, { "step": 2, "role_required": "dean" }, ...]
    },
  },
  {
    timestamps: true,
    createdAt: "created_on",
    updatedAt: "updated_on",
  }
);

module.exports = ApprovalFlow;
