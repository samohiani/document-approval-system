const { Notification } = require("./models");

/**
 * Notification types
 * @typedef {'approval' | 'submission' | 'form' | 'system'} NotificationType
 */

/**
 * Creates a notification for a user
 *
 * @param {Object} options - Notification options
 * @param {number} options.userId - User ID to send notification to
 * @param {NotificationType} options.type - Type of notification
 * @param {string} [options.title] - Optional notification title
 * @param {string} options.description - Notification description/message
 * @param {number} [options.relatedId] - Optional ID of related resource (form, submission, etc.)
 * @param {string|Object} [options.additionalInfo] - Optional additional information (will be stringified if object)
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async ({
  userId,
  type,
  title = null,
  description,
  relatedId = null,
  additionalInfo = null,
}) => {
  // Validate required parameters
  if (!userId) throw new Error("User ID is required");
  if (!description) throw new Error("Description is required");

  // Validate notification type
  const validTypes = ["approval", "submission", "form", "system"];
  if (!validTypes.includes(type)) {
    throw new Error(
      `Invalid notification type. Must be one of: ${validTypes.join(", ")}`
    );
  }

  // Process additionalInfo if it's an object
  const processedAdditionalInfo =
    typeof additionalInfo === "object" && additionalInfo !== null
      ? JSON.stringify(additionalInfo)
      : additionalInfo;

  // Generate default title based on type if not provided
  const defaultTitle = title || getDefaultTitle(type);

  try {
    // Create notification
    const notification = await Notification.create({
      user_id: userId,
      title: defaultTitle,
      description,
      type,
      relatedId,
      additionalInfo: processedAdditionalInfo,
      read: false,
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw new Error("Failed to create notification");
  }
};

/**
 * Generate default title based on notification type
 *
 * @param {NotificationType} type - Notification type
 * @returns {string} Default title
 */
const getDefaultTitle = (type) => {
  switch (type) {
    case "approval":
      return "Action Required: New Approval Request";
    case "submission":
      return "New Submission Received";
    case "form":
      return "Form Update";
    case "system":
      return "System Notification";
    default:
      return "New Notification";
  }
};

/**
 * Create notifications for multiple users at once
 *
 * @param {Array<number>} userIds - Array of user IDs to notify
 * @param {Object} notificationData - Notification data (excluding userId)
 * @returns {Promise<Array>} Array of created notifications
 */
const createBulkNotifications = async (userIds, notificationData) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error("Valid array of user IDs is required");
  }

  try {
    // Process additionalInfo if it's an object
    const processedAdditionalInfo =
      typeof notificationData.additionalInfo === "object" &&
      notificationData.additionalInfo !== null
        ? JSON.stringify(notificationData.additionalInfo)
        : notificationData.additionalInfo;

    // Generate default title if not provided
    const title =
      notificationData.title || getDefaultTitle(notificationData.type);

    // Create notification entries for bulk insertion
    const notificationsToCreate = userIds.map((userId) => ({
      user_id: userId,
      title,
      description: notificationData.description,
      type: notificationData.type,
      relatedId: notificationData.relatedId || null,
      additionalInfo: processedAdditionalInfo,
      read: false,
      created_on: new Date(),
      updated_on: new Date(),
    }));

    // Use bulkCreate for better performance with multiple notifications
    const notifications = await Notification.bulkCreate(notificationsToCreate);
    return notifications;
  } catch (error) {
    console.error("Error creating bulk notifications:", error);
    throw new Error("Failed to create bulk notifications");
  }
};

/**
 * Helper function to create an approval notification
 *
 * @param {number} userId - User ID to notify
 * @param {string} description - Notification description
 * @param {number} approvalId - ID of the approval request
 * @param {Object} [additionalData] - Any additional data
 * @returns {Promise<Object>} Created notification
 */
const createApprovalNotification = (
  userId,
  description,
  approvalId,
  additionalData = null
) => {
  return createNotification({
    userId,
    type: "approval",
    description,
    relatedId: approvalId,
    additionalInfo: additionalData,
  });
};

/**
 * Helper function to create a submission notification
 *
 * @param {number} userId - User ID to notify
 * @param {string} description - Notification description
 * @param {number} submissionId - ID of the submission
 * @param {Object} [additionalData] - Any additional data
 * @returns {Promise<Object>} Created notification
 */
const createSubmissionNotification = (
  userId,
  description,
  submissionId,
  additionalData = null
) => {
  return createNotification({
    userId,
    type: "submission",
    description,
    relatedId: submissionId,
    additionalInfo: additionalData,
  });
};

/**
 * Helper function to create a form notification
 *
 * @param {number} userId - User ID to notify
 * @param {string} description - Notification description
 * @param {number} formId - ID of the form
 * @param {Object} [additionalData] - Any additional data
 * @returns {Promise<Object>} Created notification
 */
const createFormNotification = (
  userId,
  description,
  formId,
  additionalData = null
) => {
  return createNotification({
    userId,
    type: "form",
    description,
    relatedId: formId,
    additionalInfo: additionalData,
  });
};

/**
 * Helper function to create a system notification
 *
 * @param {number} userId - User ID to notify
 * @param {string} description - Notification description
 * @param {Object} [additionalData] - Any additional data
 * @returns {Promise<Object>} Created notification
 */
const createSystemNotification = (
  userId,
  description,
  additionalData = null
) => {
  return createNotification({
    userId,
    type: "system",
    description,
    additionalInfo: additionalData,
  });
};

module.exports = {
  createNotification,
  createBulkNotifications,
  createApprovalNotification,
  createSubmissionNotification,
  createFormNotification,
  createSystemNotification,
};
