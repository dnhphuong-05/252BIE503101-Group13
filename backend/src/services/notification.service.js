import BaseService from "./BaseService.js";
import Notification from "../models/Notification.js";
import ApiError from "../utils/ApiError.js";

class NotificationService extends BaseService {
  constructor() {
    super(Notification);
  }

  async createNotification(data, options = { silent: false }) {
    try {
      return await this.create(data);
    } catch (error) {
      if (options?.silent) {
        console.error("Notification create failed:", error);
        return null;
      }
      throw error;
    }
  }

  async markAsRead(user_id, notification_id) {
    const notification = await this.model
      .findOneAndUpdate(
        { user_id, notification_id },
        { $set: { is_read: true } },
        { new: true },
      )
      .lean();

    if (!notification) {
      throw ApiError.notFound("Notification not found");
    }

    return notification;
  }

  async markAllRead(user_id) {
    const result = await this.model.updateMany(
      { user_id, is_read: false },
      { $set: { is_read: true } },
    );
    return { updated: result.modifiedCount || 0 };
  }
}

export default new NotificationService();
