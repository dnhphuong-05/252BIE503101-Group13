import catchAsync from "../utils/catchAsync.js";
import {
  successResponse,
  successResponseWithPagination,
  createdResponse,
} from "../utils/response.js";
import notificationService from "../services/notification.service.js";

export const getMyNotifications = catchAsync(async (req, res) => {
  const user_id = req.user.user_id;
  const { page = 1, limit = 20, unread } = req.query;

  const filter = { user_id };
  if (unread === true) {
    filter.is_read = false;
  }

  const result = await notificationService.getAll(filter, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: "-created_at",
  });

  return successResponseWithPagination(
    res,
    result.items,
    result.pagination,
    "Notifications retrieved successfully",
  );
});

export const markNotificationRead = catchAsync(async (req, res) => {
  const user_id = req.user.user_id;
  const { notification_id } = req.params;

  const notification = await notificationService.markAsRead(
    user_id,
    notification_id,
  );

  return successResponse(res, notification, "Notification marked as read");
});

export const markAllNotificationsRead = catchAsync(async (req, res) => {
  const user_id = req.user.user_id;
  const result = await notificationService.markAllRead(user_id);
  return successResponse(res, result, "All notifications marked as read");
});

export const createNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.createNotification(req.body);
  return createdResponse(res, notification, "Notification created");
});
