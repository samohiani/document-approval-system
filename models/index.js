const Role = require("./role");
const User = require("./user");
const ApprovalFlow = require("./approvalFlow");
const College = require("./college");
const Department = require("./department");
const Form = require("./form");
const Question = require("./question");
const FormResponse = require("./formResponse");
const ResponseDetail = require("./ResponseDetail");
const Approval = require("./approval");

// Role and User
Role.hasMany(User, { foreignKey: "role_id" });
User.belongsTo(Role, { foreignKey: "role_id", as: "role" });

// College and User
College.hasMany(User, { foreignKey: "college_id" });
User.belongsTo(College, { foreignKey: "college_id", as: "college" });

// Department and User
Department.hasMany(User, { foreignKey: "department_id" });
User.belongsTo(Department, { foreignKey: "department_id", as: "department" });

// Form and Question
Form.hasMany(Question, { foreignKey: "form_id", as: "questions" });
Question.belongsTo(Form, { foreignKey: "form_id", as: "form" });

// Form and FormResponse
Form.hasMany(FormResponse, { foreignKey: "form_id", as: "responses" });
FormResponse.belongsTo(Form, { foreignKey: "form_id", as: "form" });

// User and FormResponse
User.hasMany(FormResponse, { foreignKey: "user_id", as: "responses" });
FormResponse.belongsTo(User, { foreignKey: "user_id", as: "user" });

FormResponse.hasMany(Approval, { foreignKey: "response_id", as: "approvals" });
Approval.belongsTo(FormResponse, { foreignKey: "response_id", as: "response" });

Form.hasOne(ApprovalFlow, { foreignKey: "form_id", as: "approvalFlow" });
ApprovalFlow.belongsTo(Form, { foreignKey: "form_id", as: "form" });

FormResponse.hasMany(ResponseDetail, {
  foreignKey: "response_id",
  as: "details",
});
ResponseDetail.belongsTo(FormResponse, {
  foreignKey: "response_id",
  as: "response",
});

Question.hasMany(ResponseDetail, { foreignKey: "question_id", as: "answers" });
ResponseDetail.belongsTo(Question, {
  foreignKey: "question_id",
  as: "question",
});

Approval.belongsTo(User, { foreignKey: "approver_id", as: "approver" });
User.hasMany(Approval, { foreignKey: "approver_id", as: "approvals" });
module.exports = {
  Role,
  User,
  College,
  Department,
  Form,
  Question,
  FormResponse,
  ResponseDetail,
  Approval,
  ApprovalFlow,
};
