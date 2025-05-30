const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  getNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notificationController");

// All notification routes require authentication
router.use(auth());

// Get all notifications for the authenticated user
router.get("/", getNotifications);

// Get a specific notification by ID
router.get("/:id", getNotificationById);

// Mark a specific notification as read
router.put("/:id", markNotificationAsRead);

// Mark all notifications as read
router.put("/", markAllNotificationsAsRead);

module.exports = router;
