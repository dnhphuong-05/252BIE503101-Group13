import express from "express";
import { validate } from "../middlewares/validate.js";
import { protect } from "../middlewares/auth.middleware.js";
import { requireStaff } from "../middlewares/role.middleware.js";
import * as validator from "../validators/notification.validator.js";
import * as controller from "../controllers/notification.controller.js";

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for current user
 * @access  Private
 */
router.get(
  "/",
  protect,
  validate(validator.getNotifications),
  controller.getMyNotifications,
);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch("/read-all", protect, controller.markAllNotificationsRead);

/**
 * @route   PATCH /api/notifications/:notification_id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.patch(
  "/:notification_id/read",
  protect,
  validate(validator.markNotificationRead),
  controller.markNotificationRead,
);

/**
 * @route   POST /api/notifications
 * @desc    Create notification (admin/staff)
 * @access  Private/Staff
 */
router.post(
  "/",
  protect,
  requireStaff,
  validate(validator.createNotification),
  controller.createNotification,
);

export default router;
