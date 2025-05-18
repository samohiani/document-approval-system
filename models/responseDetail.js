const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const FormResponse = require("./formResponse.js");
const Question = require("./question.js");

const ResponseDetail = sequelize.define(
  "ResponseDetail",
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
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Question,
        key: "id",
      },
      onUpdate: "CASCADE",
    },
    answer_text: {
      type: DataTypes.TEXT, // can be text answer or selected option for multiple choice
      allowNull: true,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = ResponseDetail;
