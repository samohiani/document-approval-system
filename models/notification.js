const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.js");
const User = require("./user.js");


const Notification = sequelize.define(
    "Notification",
    {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: "id",
            },
            onUpdate: "CASCADE",
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        read: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        relatedId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        additionalInfo: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    },
    {
        timestamps: true,
        createdAt: "created_on",
        updatedAt: "updated_on",
    }
)

module.exports = Notification;