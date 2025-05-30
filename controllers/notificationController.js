require("dotenv").config();
const sequelize = require("../config/db");
const { Notification } = require("../models");

/**
 * Get all notifications for a user
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.findAll({
      where: { user_id: userId, read: false },
      order: [["created_on", "DESC"]],
    });

    return res.status(200).json({
      status: "success",
      message: "Notifications retrieved successfully",
      data: notifications,
    });
  } catch (error) {
    console.error("Error retrieving notifications:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve notifications",
      data: null,
    });
  }
};

/**
 * Get a specific notification by ID
 */
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: { id, user_id: userId, read: false },
    });

    if (!notification) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
        data: null,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Notification retrieved successfully",
      data: notification,
    });
  } catch (error) {
    console.error("Error retrieving notification:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to retrieve notification",
      data: null,
    });
  }
};

/**
 * Mark a notification as read
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: { id, user_id: userId, read: false },
    });

    if (!notification) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
        data: null,
      });
    }

    notification.read = true;
    notification.updated_on = new Date();
    await notification.save();

    return res.status(200).json({
      status: "success",
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to mark notification as read",
      data: null,
    });
  }
};

/**
 * Mark all notifications as read
 */
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.update(
      {
        read: true,
        updated_on: new Date(),
      },
      {
        where: {
          user_id: userId,
          read: false,
        },
      }
    );

    return res.status(200).json({
      status: "success",
      message: "All notifications marked as read",
      data: [],
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to mark all notifications as read",
      data: null,
    });
  }
};

module.exports = {
  getNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
