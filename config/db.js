require("dotenv").config();
const { Sequelize } = require("sequelize");
const fs = require("fs");

const logFile = fs.createWriteStream("sequelize.log", { flags: "a" });

const { DB_HOST, DB_USERNAME, PASSWORD, DB_NAME } = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USERNAME, PASSWORD, {
  host: DB_HOST,
  dialect: "postgres",
  port: 5432,
  timezone: "+01:00",
  logging: (msg) => logFile.write(`${msg}\n`),
});

module.exports = sequelize;
