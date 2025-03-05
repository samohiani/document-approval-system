const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");

const College = sequelize.define("College", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = College;
