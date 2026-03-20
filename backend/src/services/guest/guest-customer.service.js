import GuestCustomer from "../../models/GuestCustomer.js";
import User from "../../models/user/User.js";
import emailService from "../email/email.service.js";
import ApiError from "../../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

/**
 * Guest Customer Service
 *
 * @description Service để quản lý khách hàng không đăng nhập (guest customers)
 * @module services/guest/guest-customer
 */

class GuestCustomerService {
  /**
   * Tạo guest customer mới
   * @param {Object} guestData - Dữ liệu guest customer
   * @param {string} guestData.full_name - Họ và tên
   * @param {string} guestData.phone - Số điện thoại
   * @param {string} guestData.email - Email (optional)
   * @param {Object} guestData.address - Địa chỉ giao hàng
   * @returns {Promise<Object>} Guest customer đã tạo
   */
  async createGuestCustomer(guestData) {
    try {
      // Kiểm tra phone đã tồn tại chưa
      const existingGuest = await GuestCustomer.findOne({
        phone: guestData.phone,
      });

      if (existingGuest) {
        // Nếu đã tồn tại, cập nhật thông tin và trả về
        return await this.updateGuestCustomer(
          existingGuest.guest_id,
          guestData,
        );
      }

      // Tạo guest_id mới
      const guest_id = await GuestCustomer.generateGuestId();

      // Tạo guest customer mới
      const guestCustomer = await GuestCustomer.create({
        ...guestData,
        guest_id,
      });

      return guestCustomer;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        if (error.keyPattern.phone) {
          throw new ApiError(
            StatusCodes.CONFLICT,
            "Số điện thoại này đã được sử dụng",
          );
        }
        if (error.keyPattern.email) {
          throw new ApiError(StatusCodes.CONFLICT, "Email này đã được sử dụng");
        }
      }
      throw error;
    }
  }

  /**
   * Lấy thông tin guest customer theo guest_id
   * @param {string} guestId - Guest ID
   * @returns {Promise<Object>} Guest customer
   */
  async getGuestCustomerById(guestId) {
    const guestCustomer = await GuestCustomer.findOne({ guest_id: guestId });

    if (!guestCustomer) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "Không tìm thấy thông tin khách hàng",
      );
    }

    return guestCustomer;
  }

  /**
   * Lấy thông tin guest customer theo phone
   * @param {string} phone - Số điện thoại
   * @returns {Promise<Object|null>} Guest customer hoặc null
   */
  async getGuestCustomerByPhone(phone) {
    return await GuestCustomer.findOne({ phone });
  }

  /**
   * Lấy thông tin guest customer theo email
   * @param {string} email - Email
   * @returns {Promise<Object|null>} Guest customer hoặc null
   */
  async getGuestCustomerByEmail(email) {
    if (!email) return null;
    return await GuestCustomer.findOne({ email });
  }

  /**
   * Cập nhật thông tin guest customer
   * @param {string} guestId - Guest ID
   * @param {Object} updateData - Dữ liệu cập nhật
   * @returns {Promise<Object>} Guest customer đã cập nhật
   */
  async updateGuestCustomer(guestId, updateData) {
    const guestCustomer = await this.getGuestCustomerById(guestId);

    // Cập nhật các trường được phép
    const allowedFields = ["full_name", "phone", "email", "address", "notes"];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        guestCustomer[field] = updateData[field];
      }
    });

    await guestCustomer.save();
    return guestCustomer;
  }

  /**
   * Xóa guest customer
   * @param {string} guestId - Guest ID
   * @returns {Promise<Object>} Guest customer đã xóa
   */
  async deleteGuestCustomer(guestId) {
    const guestCustomer = await this.getGuestCustomerById(guestId);
    await guestCustomer.deleteOne();
    return guestCustomer;
  }

  /**
   * Lấy danh sách guest customers với phân trang và lọc
   * @param {Object} options - Tùy chọn query
   * @param {number} options.page - Trang hiện tại
   * @param {number} options.limit - Số lượng items per page
   * @param {string} options.sortBy - Trường để sort
   * @param {string} options.sortOrder - Thứ tự sort (asc/desc)
   * @param {string} options.search - Từ khóa tìm kiếm
   * @param {string} options.status - Trạng thái khách hàng (new/active/inactive)
   * @returns {Promise<Object>} Danh sách guest customers và metadata
   */
  async getGuestCustomers(options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "desc",
      search = "",
      status = "",
    } = options;

    // Build query
    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { full_name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { guest_id: { $regex: search, $options: "i" } },
      ];
    }

    // Status filter
    if (status === "new") {
      query.order_count = 0;
    } else if (status === "active") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.last_order_at = { $gte: thirtyDaysAgo };
      query.order_count = { $gt: 0 };
    } else if (status === "inactive") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.last_order_at = { $lt: thirtyDaysAgo };
      query.order_count = { $gt: 0 };
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const skip = (page - 1) * limit;

    const [guests, total] = await Promise.all([
      GuestCustomer.find(query).sort(sort).skip(skip).limit(limit).lean(),
      GuestCustomer.countDocuments(query),
    ]);

    return {
      data: guests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Ghi nhận đơn hàng mới cho guest customer
   * @param {string} guestId - Guest ID
   * @param {number} orderAmount - Giá trị đơn hàng
   * @returns {Promise<Object>} Guest customer đã cập nhật
   */
  async recordOrder(guestId, orderAmount = 0) {
    const guestCustomer = await this.getGuestCustomerById(guestId);
    await guestCustomer.recordOrder(orderAmount);
    return guestCustomer;
  }

  /**
   * Tìm hoặc tạo guest customer theo phone
   * @param {Object} guestData - Dữ liệu guest customer
   * @returns {Promise<Object>} Guest customer
   */
  async findOrCreate(guestData) {
    return await GuestCustomer.findOrCreate(guestData);
  }

  /**
   * Gui email moi guest customer dang ky tai khoan
   * @param {string} guestId - Guest ID
   * @param {Object} invitedBy - User thuc hien moi
   * @returns {Promise<Object>} Ket qua gui email
   */
  async inviteRegister(guestId, invitedBy) {
    const guestCustomer = await this.getGuestCustomerById(guestId);
    const guestEmail = guestCustomer.email?.trim().toLowerCase();

    if (!guestEmail) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Khách này chưa có email để gửi lời mời",
      );
    }

    const existedUser = await User.findOne({ email: guestEmail }).lean();
    if (existedUser) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Email này đã có tài khoản, không cần gửi lời mời",
      );
    }

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:4200")
      .trim()
      .replace(/\/+$/, "");
    const query = new URLSearchParams({
      email: guestEmail,
      full_name: guestCustomer.full_name || "",
      phone: guestCustomer.phone || "",
      source: "guest_invite",
      guest_id: guestCustomer.guest_id || "",
    });
    const registerUrl = `${frontendUrl}/register?${query.toString()}`;

    const emailResult = await emailService.sendRegisterInvitation({
      email: guestEmail,
      fullName: guestCustomer.full_name || "",
      phone: guestCustomer.phone || "",
      guestId: guestCustomer.guest_id || "",
      registerUrl,
      invitedBy: invitedBy?.email || invitedBy?.user_id || "Admin",
    });

    if (!emailResult.success) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        emailResult.error || "Gửi email mời đăng ký thất bại",
      );
    }

    return {
      guest_id: guestCustomer.guest_id,
      email: guestEmail,
      register_url: registerUrl,
      sent_at: new Date().toISOString(),
      message_id: emailResult.messageId,
    };
  }

  /**
   * Thống kê guest customers
   * @returns {Promise<Object>} Thống kê
   */
  async getStatistics() {
    const total = await GuestCustomer.countDocuments();

    const newCustomers = await GuestCustomer.countDocuments({ order_count: 0 });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeCustomers = await GuestCustomer.countDocuments({
      last_order_at: { $gte: thirtyDaysAgo },
      order_count: { $gt: 0 },
    });

    const inactiveCustomers = total - newCustomers - activeCustomers;

    // Tổng doanh thu từ guest customers
    const revenueResult = await GuestCustomer.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total_spent" },
          avgOrderValue: { $avg: "$total_spent" },
        },
      },
    ]);

    const revenue = revenueResult[0] || { totalRevenue: 0, avgOrderValue: 0 };

    return {
      total,
      new: newCustomers,
      active: activeCustomers,
      inactive: inactiveCustomers,
      totalRevenue: revenue.totalRevenue,
      avgOrderValue: revenue.avgOrderValue,
    };
  }
}

export default new GuestCustomerService();
