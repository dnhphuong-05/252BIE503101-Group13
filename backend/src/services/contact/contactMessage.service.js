import BaseService from "../BaseService.js";
import ContactMessage from "../../models/ContactMessage.js";
import ApiError from "../../utils/ApiError.js";
import notificationService from "../notification.service.js";
import User from "../../models/user/User.js";
import GuestCustomer from "../../models/GuestCustomer.js";

/**
 * Contact Message Service
 * Xử lý business logic cho contact messages
 */
class ContactMessageService extends BaseService {
  constructor() {
    super(ContactMessage);
  }

  normalizeStatus(status) {
    if (status === "done" || status === "cancelled") {
      return "closed";
    }
    return status;
  }

  normalizePurpose(purpose) {
    const validPurposes = ["consult", "rent", "buy", "custom", "cooperation"];
    if (!purpose || !validPurposes.includes(purpose)) {
      return null;
    }
    return purpose;
  }

  normalizeSort(sort) {
    if (!sort) return "-created_at";
    if (sort.includes("createdAt")) {
      return sort.replace("createdAt", "created_at");
    }
    if (sort.includes("updatedAt")) {
      return sort.replace("updatedAt", "updated_at");
    }
    return sort;
  }

  /**
   * Tạo contact message mới từ form liên hệ
   * @param {Object} data - Dữ liệu từ form
   * @returns {Object} Contact message đã tạo
   */
  async createContactMessage(data, user = null) {
    const fullName = data.full_name || data.fullName || data.name;
    const phone = data.phone;
    const email = data.email;
    const purpose = this.normalizePurpose(data.purpose);
    const message = data.message;

    if (!fullName || !phone || !email || !purpose || !message) {
      throw new ApiError(400, "Vui lòng điền đầy đủ thông tin");
    }

    let user_id = null;
    let guest_id = null;

    if (user?.user_id) {
      user_id = user.user_id;
    } else {
      const guestCustomer = await GuestCustomer.findOrCreate({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
      });
      guest_id = guestCustomer?.guest_id || null;
    }

    const contactMessage = new ContactMessage({
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      purpose,
      message: message.trim(),
      status: "new",
      user_id,
      guest_id,
    });

    await contactMessage.save();

    return contactMessage;
  }

  /**
   * Lấy danh sách contact messages với phân trang và lọc
   * @param {Object} filters - Bộ lọc
   * @param {Object} options - Options cho phân trang
   * @returns {Object} Danh sách messages và thông tin phân trang
   */
  async getContactMessages(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = "-created_at",
      status,
      purpose,
      search,
      from,
      to,
    } = options;

    const andConditions = [];

    if (status) {
      const normalizedStatus = this.normalizeStatus(status);
      if (normalizedStatus === "closed") {
        andConditions.push({
          status: { $in: ["closed", "done", "cancelled"] },
        });
      } else {
        andConditions.push({ status: normalizedStatus });
      }
    }

    if (purpose) {
      andConditions.push({ purpose });
    }

    const searchTerm = typeof search === "string" ? search.trim() : "";
    if (searchTerm) {
      andConditions.push({
        $or: [
          { full_name: { $regex: searchTerm, $options: "i" } },
          { fullName: { $regex: searchTerm, $options: "i" } },
          { email: { $regex: searchTerm, $options: "i" } },
          { phone: { $regex: searchTerm, $options: "i" } },
        ],
      });
    }

    if (from || to) {
      const range = {};
      if (from) {
        const startDate = new Date(from);
        startDate.setHours(0, 0, 0, 0);
        range.$gte = startDate;
      }
      if (to) {
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        range.$lte = endDate;
      }
      andConditions.push({
        $or: [{ created_at: range }, { createdAt: range }],
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const result = await this.getAll(query, {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: this.normalizeSort(sort),
    });

    return result;
  }

  /**
   * Lấy chi tiết một contact message
   * @param {String} contactId - ID của contact message
   * @returns {Object} Contact message
   */
  async getContactMessageById(contactId) {
    const message = await this.model.findOne({
      contact_id: Number(contactId),
    });

    if (!message) {
      throw new ApiError(404, "Không tìm thấy tin nhắn liên hệ");
    }

    return message;
  }

  /**
   * Cập nhật trạng thái contact message
   * @param {String} contactId - ID của contact message
   * @param {String} status - Trạng thái mới
   * @param {String} adminNote - Ghi chú nội bộ
   * @param {String} repliedBy - Admin ID
   * @returns {Object} Contact message đã cập nhật
   */
  async updateContactStatus(contactId, status, adminNote, repliedBy = null) {
    const numericId = Number(contactId);
    if (!Number.isFinite(numericId)) {
      throw new ApiError(400, "Contact ID không hợp lệ");
    }

    const existing = await this.model
      .findOne({ contact_id: numericId })
      .select("status email phone contact_id")
      .lean();

    if (!existing) {
      throw new ApiError(404, "Không tìm thấy tin nhắn liên hệ");
    }

    const normalizedStatus = this.normalizeStatus(status);
    const validStatuses = ["new", "processing", "replied", "closed"];
    if (!validStatuses.includes(normalizedStatus)) {
      throw new ApiError(400, "Trạng thái không hợp lệ");
    }

    const updateData = {
      status: normalizedStatus,
    };

    if (adminNote !== undefined) {
      updateData.admin_note = adminNote;
    }

    if (normalizedStatus === "replied") {
      updateData.replied_at = new Date();
      if (repliedBy) {
        updateData.replied_by = repliedBy;
      }
    }

    const message = await this.model.findOneAndUpdate(
      { contact_id: numericId },
      { $set: updateData, $unset: { note: 1 } },
      { new: true },
    );

    if (!message) {
      throw new ApiError(404, "Không tìm thấy tin nhắn liên hệ");
    }

    try {
      await this.notifyContactStatusChange(
        this.normalizeStatus(existing.status),
        message,
      );
    } catch (error) {
      console.error("Contact notification failed:", error);
    }

    return message;
  }

  /**
   * Xóa contact message
   * @param {String} contactId - ID của contact message
   * @returns {Object} Kết quả xóa
   */
  async deleteContactMessage(contactId) {
    const message = await this.getContactMessageById(contactId);
    await message.deleteOne();

    return { message: "Đã xóa tin nhắn liên hệ thành công" };
  }

  async notifyContactStatusChange(previousStatus, message) {
    const nextStatus = this.normalizeStatus(message.status);
    const shouldNotifyReceived =
      previousStatus === "new" && nextStatus === "processing";
    const shouldNotifyHandled =
      nextStatus === "replied" && previousStatus !== "replied";

    if (!shouldNotifyReceived && !shouldNotifyHandled) {
      return;
    }

    let userId = message.user_id || null;

    if (!userId) {
      const email = message.email ? message.email.toLowerCase().trim() : "";
      const phone = message.phone ? message.phone.trim() : "";

      if (!email && !phone) {
        return;
      }

      const user = await User.findOne({
        $or: [{ email }, { phone }],
      })
        .select("user_id")
        .lean();

      if (!user?.user_id) {
        return;
      }

      userId = user.user_id;
    }

    if (!message.contact_id) {
      return;
    }

    const notification = {
      user_id: userId,
      type: shouldNotifyReceived ? "contact_received" : "contact_handled",
      title: "Liên hệ",
      message: shouldNotifyReceived
        ? "Phục đã nhận được yêu cầu của bạn"
        : "Phục đã liên hệ với bạn",
      entity_type: "contact",
      entity_id: String(message.contact_id),
      link: "/contact",
      is_read: false,
    };

    await notificationService.createNotification(notification, {
      silent: true,
    });
  }

  /**
   * Lấy thống kê contact messages
   * @returns {Object} Thống kê
   */
  async getStatistics() {
    const stats = await ContactMessage.getStatistics();

    const purposeStats = await this.model.aggregate([
      {
        $group: {
          _id: "$purpose",
          count: { $sum: 1 },
        },
      },
    ]);

    const recentMessages = await this.model
      .find()
      .sort({ created_at: -1, createdAt: -1 })
      .limit(5)
      .select("contact_id full_name fullName email status created_at createdAt")
      .lean();

    return {
      statusStats: stats,
      purposeStats,
      recentMessages,
    };
  }
}

export default new ContactMessageService();
