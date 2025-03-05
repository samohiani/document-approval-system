const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const College = require("./college");

const Department = sequelize.define("Department", {
  name: {
    type: DataTypes.STRING,
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
});

module.exports = Department;
