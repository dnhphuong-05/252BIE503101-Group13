import BaseService from "../BaseService.js";
import mongoose from "mongoose";
import BuyOrder from "../../models/order/BuyOrder.js";
import BuyOrderItem from "../../models/order/BuyOrderItem.js";
import GuestCustomer from "../../models/GuestCustomer.js";
import User from "../../models/user/User.js";
import ApiError from "../../utils/ApiError.js";
import emailService from "../email/email.service.js";
import notificationService from "../notification.service.js";
import loyaltyService from "../user/loyalty.service.js";
import returnService from "./return.service.js";

const buildOrderLink = (orderId) => `/profile/orders/${orderId}`;

const statusNotificationMap = {
  confirmed: {
    type: "order_confirmed",
    title: "Đơn mua đã xác nhận",
    message: (orderCode) => `Đơn mua ${orderCode} đã được xác nhận.`,
  },
  shipping: {
    type: "order_shipped",
    title: "Đơn mua đang giao",
    message: (orderCode) => `Đơn mua ${orderCode} đang được giao.`,
  },
  completed: {
    type: "order_delivered",
    title: "Đơn mua hoàn thành",
    message: (orderCode) => `Đơn mua ${orderCode} đã được giao thành công.`,
  },
  cancelled: {
    type: "order_cancelled",
    title: "Đơn mua đã hủy",
    message: (orderCode) => `Đơn mua ${orderCode} đã bị hủy.`,
  },
};

const notifyAdmins = async ({ type, title, message, entityType, entityId, link }) => {
  const admins = await User.find({
    role: { $in: ["admin", "super_admin", "staff"] },
    status: "active",
  })
    .select("user_id")
    .lean();
  const targets = (admins || []).map((admin) => admin.user_id).filter(Boolean);
  await Promise.all(
    targets.map((userId) =>
      notificationService.createNotification(
        {
          user_id: userId,
          type,
          title,
          message,
          entity_type: entityType,
          entity_id: entityId,
          link: link || "",
          is_read: false,
        },
        { silent: true },
      ),
    ),
  );
};

class BuyOrderService extends BaseService {
  constructor() {
    super(BuyOrder);
  }

  buildIdentifierQuery(identifier) {
    if (!identifier) {
      throw ApiError.badRequest("Order ID is required");
    }
    const or = [{ order_id: identifier }, { order_code: identifier }];
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      or.push({ _id: new mongoose.Types.ObjectId(identifier) });
    }
    return { $or: or };
  }

  /**
   * Generate order_id tự động
   * Format: ORD + YYMMDDnnnn (10 số)
   */
  async generateOrderId() {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const datePrefix = `${year}${month}${day}`;

    // Đếm số đơn hàng trong ngày
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const count = await this.model.countDocuments({
      created_at: { $gte: startOfDay, $lte: endOfDay },
    });

    const sequence = String(count + 1).padStart(4, "0");
    return `ORD${datePrefix}${sequence}`;
  }

  /**
   * Generate order_code
   * Format: PHUC-BUY-YYMMDDnnnn
   */
  async generateOrderCode() {
    const orderId = await this.generateOrderId();
    return `PHUC-BUY-${orderId.replace("ORD", "")}`;
  }

  /**
   * Generate order_item_id
   * Format: ITEM + YYMMDDnnnn (10 số)
   */
  async generateOrderItemId() {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const datePrefix = `${year}${month}${day}`;

    // Đếm số item trong ngày
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const count = await BuyOrderItem.countDocuments({
      created_at: { $gte: startOfDay, $lte: endOfDay },
    });

    const sequence = String(count + 1).padStart(4, "0");
    return `ITEM${datePrefix}${sequence}`;
  }

  /**
   * Tạo đơn hàng mua nhanh
   */
  async createBuyOrder(orderData) {
    try {
      if (orderData?.customer_info?.address) {
        const address = orderData.customer_info.address;
        if (!address.detail && address.address_detail) {
          address.detail = address.address_detail;
        }
      }
      // Validate: phải có user_id hoặc guest_id
      if (!orderData.user_id && !orderData.guest_id) {
        throw ApiError.badRequest("Đơn hàng phải có user_id hoặc guest_id");
      }

      // Validate: phải có items
      if (!orderData.items || orderData.items.length === 0) {
        throw ApiError.badRequest("Đơn hàng phải có ít nhất 1 sản phẩm");
      }

      // Generate IDs
      const order_id = await this.generateOrderId();
      const order_code = await this.generateOrderCode();

      // Tính toán các giá trị
      const subtotal_amount = orderData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const shipping_fee = orderData.shipping_fee || 0;
      const discount_amount = orderData.discount_amount || 0;
      const total_amount = subtotal_amount + shipping_fee - discount_amount;

      // Tạo order
      const order = await this.create({
        order_id,
        order_code,
        user_id: orderData.user_id || null,
        guest_id: orderData.guest_id || null,
        customer_info: orderData.customer_info,
        items: orderData.items,
        subtotal_amount,
        shipping_fee,
        discount_amount,
        total_amount,
        payment_method: orderData.payment_method || "cod",
        payment_status: "unpaid",
        order_status: "pending",
        shipping_provider: orderData.shipping_provider ?? null,
        shipping_method: orderData.shipping_method ?? null,
        tracking_code: orderData.tracking_code ?? null,
      });

      // Tạo order items trong collection riêng
      const orderItems = [];
      for (const item of orderData.items) {
        const order_item_id = await this.generateOrderItemId();
        const orderItem = await BuyOrderItem.create({
          order_item_id,
          order_id,
          product_id: item.product_id,
          sku: item.sku,
          name: item.name,
          thumbnail: item.thumbnail || "",
          size: item.size || null,
          color: item.color || null,
          price: item.price,
          quantity: item.quantity,
          total_price: item.price * item.quantity,
        });
        orderItems.push(orderItem);
      }

      if (order.user_id) {
        await notificationService.createNotification(
          {
            user_id: order.user_id,
            type: "order_confirmed",
            title: "Đặt hàng thành công",
            message: `Đơn mua ${order_code} đã được tạo thành công.`,
            entity_type: "sales_order",
            entity_id: order_id,
            link: buildOrderLink(order_id),
            is_read: false,
          },
          { silent: true },
        );
      }

      // Gửi email xác nhận nếu có email
      let emailSent = false;
      if (orderData.customer_info?.email) {
        try {
          // Chuẩn bị địa chỉ đầy đủ
          const address = orderData.customer_info.address;
          const full_address = [
            address.detail,
            address.ward,
            address.district,
            address.province,
          ]
            .map((part) => (typeof part === "string" ? part.trim() : ""))
            .filter(Boolean)
            .join(", ");

          // Chuẩn bị dữ liệu email
          const emailData = {
            orderCode: order_code,
            status: "Chờ xác nhận",
            customer: {
              full_name: orderData.customer_info.full_name,
              phone: orderData.customer_info.phone,
              email: orderData.customer_info.email,
              full_address: full_address,
            },
            items: orderData.items.map((item) => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              total: item.price * item.quantity,
              sku: item.sku,
            })),
            subtotal: subtotal_amount,
            shippingFee: shipping_fee,
            total: total_amount,
            trackingUrl: `${process.env.FRONTEND_URL || "http://localhost:4200"}/orders/${order_id}`,
          };

          // Gửi email
          const emailResult =
            await emailService.sendOrderConfirmation(emailData);
          emailSent = emailResult.success;

          if (emailSent) {
            console.log(
              `✅ Email xác nhận đơn hàng ${order_code} đã được gửi đến ${orderData.customer_info.email}`,
            );
          }
        } catch (emailError) {
          console.error("❌ Lỗi khi gửi email xác nhận:", emailError);
          // Không throw error để không làm gián đoạn flow tạo đơn hàng
        }
      }

      return {
        order,
        orderItems,
        emailSent,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy đơn hàng theo order_id
   */
  async getByOrderId(order_id) {
    const order = await this.model
      .findOne(this.buildIdentifierQuery(order_id))
      .lean();
    if (!order) {
      throw ApiError.notFound("Không tìm thấy đơn hàng");
    }

    // Lấy order items
    const orderItems = await BuyOrderItem.find({ order_id: order.order_id }).lean();

    return {
      ...order,
      detailedItems: orderItems,
    };
  }

  /**
   * Lấy đơn hàng theo user_id
   */
  async getByUserId(user_id, options = {}) {
    return await this.getAll({ user_id }, { ...options, sort: "-created_at" });
  }

  /**
   * Lấy đơn hàng theo guest_id
   */
  async getByGuestId(guest_id, options = {}) {
    return await this.getAll({ guest_id }, { ...options, sort: "-created_at" });
  }

  /**
   * Cập nhật trạng thái đơn hàng
   */
  async updateOrderStatus(order_id, payload = {}, actor = null) {
    const order = await this.model.findOne(this.buildIdentifierQuery(order_id));

    if (!order) {
      throw ApiError.notFound("Không tìm thấy đơn hàng");
    }

    const actorId = actor?.user_id || actor?._id || actor?.id || null;
    const nextStatus = payload?.order_status;
    const order_status = nextStatus;
    if (!nextStatus) {
      throw ApiError.badRequest("Order status is required");
    }

    const currentStatus = order.order_status;

    // Validate status flow
    const validTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["processing", "cancelled", "pending"],
      processing: ["shipping", "cancelled"],
      shipping: ["completed", "cancelled", "processing"],
      completed: [],
      cancelled: [],
    };
    if (order.guest_id && !validTransitions.confirmed.includes("shipping")) {
      validTransitions.confirmed.push("shipping");
    }

    if (currentStatus !== nextStatus && !validTransitions[currentStatus]?.includes(nextStatus)) {
      throw ApiError.badRequest(
        `Không thể chuyển từ ${order.order_status} sang ${order_status}`,
      );
    }

    if (typeof payload.admin_note === "string") {
      order.admin_note = payload.admin_note;
    }

    const contactChannelProvided = payload.contact_channel !== undefined;
    const contactAtProvided = payload.contacted_at !== undefined;
    if (contactChannelProvided) {
      order.contact_channel = payload.contact_channel || null;
    }
    if (contactAtProvided) {
      const contactedAt = payload.contacted_at ? new Date(payload.contacted_at) : null;
      order.contacted_at = contactedAt;
      if (contactedAt && actorId) {
        order.contacted_by = actorId;
      }
    } else if (contactChannelProvided && order.contact_channel && !order.contacted_at) {
      order.contacted_at = new Date();
      if (actorId) {
        order.contacted_by = actorId;
      }
    }

    if (payload.shipping_provider !== undefined) {
      order.shipping_provider = payload.shipping_provider || null;
    }

    if (payload.tracking_code !== undefined) {
      order.tracking_code = payload.tracking_code || null;
    }

    if (payload.shipping_status_detail !== undefined) {
      order.shipping_status_detail = payload.shipping_status_detail || null;
    }

    if (nextStatus === "shipping") {
      const provider = payload.shipping_provider ?? order.shipping_provider;
      const tracking = payload.tracking_code ?? order.tracking_code;
      if (!provider || !tracking) {
        throw ApiError.badRequest("Shipping provider and tracking code are required");
      }
      order.shipping_provider = provider;
      order.tracking_code = tracking;
      if (!order.shipped_at) {
        order.shipped_at = new Date();
      }
    }

    if (nextStatus === "confirmed") {
      if (!order.confirmed_at) {
        order.confirmed_at = new Date();
      }
      order.confirmed_by = actorId;
    }

    if (nextStatus === "processing") {
      if (!order.processing_at) {
        order.processing_at = new Date();
      }
      order.processing_by = actorId;
    }

    if (nextStatus === "completed") {
      if (!order.customer_received_at && !order.user_id) {
        order.customer_received_at = new Date();
      }
      if (!order.customer_received_at) {
        throw ApiError.badRequest("Khách hàng chưa xác nhận đã nhận hàng");
      }
      if (
        order.return_request?.status &&
        !["closed", "refunded"].includes(order.return_request.status)
      ) {
        throw ApiError.badRequest("Đơn đang có yêu cầu hoàn trả");
      }
      if (!order.delivered_at) {
        order.delivered_at = new Date();
      }
      if (order.payment_method === "cod" && order.payment_status !== "paid") {
        order.payment_status = "paid";
        if (!order.paid_at) {
          order.paid_at = new Date();
        }
      }
    }

    if (nextStatus === "cancelled") {
      const cancelReason = (payload.cancel_reason || "").trim();
      if (!cancelReason) {
        throw ApiError.badRequest("Cancel reason is required");
      }
      order.cancel_reason = cancelReason;
      order.cancelled_at = new Date();
      order.cancelled_by = actorId;
      if (
        ["paid", "partial"].includes(order.payment_status) &&
        order.refund_status === "none"
      ) {
        order.refund_status = "pending";
      }
    }

    if (currentStatus !== nextStatus) {
      order.order_status = nextStatus;
      order.status_history = order.status_history || [];
      order.status_history.push({
        from: currentStatus,
        to: nextStatus,
        changed_by: actorId,
        note:
          (typeof payload.admin_note === "string" && payload.admin_note.trim()) ||
          (nextStatus === "cancelled" ? order.cancel_reason : "") ||
          "",
        changed_at: new Date(),
      });
    }
    order.updated_at = new Date();
    await order.save();

    if (currentStatus !== nextStatus && order.user_id && statusNotificationMap[nextStatus]) {
      const template = statusNotificationMap[nextStatus];
      await notificationService.createNotification(
        {
          user_id: order.user_id,
          type: template.type,
          title: template.title,
          message: template.message(order.order_code),
          entity_type: "sales_order",
          entity_id: order.order_id,
          link: buildOrderLink(order.order_id),
          is_read: false,
        },
        { silent: true },
      );
    }

    if (
      currentStatus !== nextStatus &&
      nextStatus === "completed" &&
      order.user_id &&
      order.payment_status === "paid"
    ) {
      await loyaltyService.awardOrderPoints({
        userId: order.user_id,
        amount: order.total_amount,
        refId: order.order_id,
        reason: `Hoàn tất đơn mua ${order.order_code}`,
      });
    }

    return order.toObject();
  }

  /**
   * Khách hàng xác nhận đã nhận hàng
   */
  async confirmReceived(order_id, actor) {
    const userId = actor?.user_id || actor?._id || null;
    if (!userId) {
      throw ApiError.unauthorized("Authentication required");
    }
    const order = await this.model.findOne({
      ...this.buildIdentifierQuery(order_id),
      user_id: userId,
    });
    if (!order) {
      throw ApiError.notFound("Không tìm thấy đơn hàng");
    }
    if (order.order_status !== "shipping") {
      throw ApiError.badRequest("Đơn hàng chưa ở trạng thái đang giao");
    }
    if (
      order.return_request?.status &&
      !["closed", "refunded"].includes(order.return_request.status)
    ) {
      throw ApiError.badRequest("Đơn đang có yêu cầu hoàn trả");
    }
    if (order.customer_received_at) {
      throw ApiError.badRequest("Đơn hàng đã được xác nhận nhận");
    }
    if (!order.customer_received_at) {
      order.customer_received_at = new Date();
    }
    order.status_history = order.status_history || [];
    order.status_history.push({
      from: order.order_status,
      to: order.order_status,
      changed_by: userId,
      note: "Khách hàng xác nhận đã nhận hàng",
      changed_at: new Date(),
    });
    order.updated_at = new Date();
    await order.save();

    await notifyAdmins({
      type: "order_received",
      title: "Khách đã nhận hàng",
      message: `Đơn ${order.order_code} đã được khách xác nhận nhận hàng.`,
      entityType: "sales_order",
      entityId: order.order_id,
      link: buildOrderLink(order.order_id),
    });

    return order.toObject();
  }

  /**
   * Khách hàng yêu cầu hoàn trả
   */
  async requestReturn(order_id, payload = {}, actor) {
    const userId = actor?.user_id || actor?._id || null;
    if (!userId) {
      throw ApiError.unauthorized("Authentication required");
    }
    const order = await this.model.findOne({
      ...this.buildIdentifierQuery(order_id),
      user_id: userId,
    });
    if (!order) {
      throw ApiError.notFound("Không tìm thấy đơn hàng");
    }
    if (order.order_status !== "shipping") {
      throw ApiError.badRequest("Đơn hàng chưa ở trạng thái đang giao");
    }
    if (
      order.return_request?.status &&
      !["closed", "refunded"].includes(order.return_request.status)
    ) {
      throw ApiError.badRequest("Đơn đã có yêu cầu hoàn trả đang xử lý");
    }

    const returnRequest = await returnService.createFromOrder(order, payload, actor);

    order.return_request = {
      return_id: returnRequest.return_id,
      status: returnRequest.status,
      note: payload.note || "",
      requested_at: returnRequest.requested_at,
      updated_at: new Date(),
    };
    order.status_history = order.status_history || [];
    order.status_history.push({
      from: order.order_status,
      to: order.order_status,
      changed_by: userId,
      note: "Khách hàng gửi yêu cầu hoàn trả",
      changed_at: new Date(),
    });
    order.updated_at = new Date();
    await order.save();

    await notifyAdmins({
      type: "return_requested",
      title: "Yêu cầu hoàn trả mới",
      message: `Đơn ${order.order_code} vừa gửi yêu cầu hoàn trả.`,
      entityType: "sales_order",
      entityId: order.order_id,
      link: buildOrderLink(order.order_id),
    });

    return { order: order.toObject(), return_request: returnRequest };
  }

  /**
   * Cập nhật trạng thái thanh toán
   */
  async updatePaymentStatus(order_id, payload = {}) {
    const order = await this.model.findOne(this.buildIdentifierQuery(order_id));

    if (!order) {
      throw ApiError.notFound("Không tìm thấy đơn hàng");
    }

    const paymentStatus = payload?.payment_status;
    if (!paymentStatus) {
      throw ApiError.badRequest("Payment status is required");
    }

    const previousStatus = order.payment_status;
    order.payment_status = paymentStatus;

    if (paymentStatus === "paid" || paymentStatus === "partial") {
      if (!order.paid_at) {
        order.paid_at = new Date();
      }
    }

    if (paymentStatus === "unpaid") {
      order.paid_at = null;
    }

    if (paymentStatus === "refunded") {
      order.refund_status = "refunded";
    }
    order.updated_at = new Date();
    await order.save();

    if (
      paymentStatus === "paid" &&
      previousStatus !== "paid" &&
      order.order_status === "completed" &&
      order.user_id
    ) {
      await loyaltyService.awardOrderPoints({
        userId: order.user_id,
        amount: order.total_amount,
        refId: order.order_id,
        reason: `Hoàn tất đơn mua ${order.order_code}`,
      });
    }

    return order.toObject();
  }

  /**
   * Cập nhật tracking code
   */
  async updateTracking(order_id, payload = {}) {
    const order = await this.model.findOne(this.buildIdentifierQuery(order_id));

    if (!order) {
      throw ApiError.notFound("Không tìm thấy đơn hàng");
    }

    const { shipping_provider, tracking_code, shipping_status_detail } = payload;
    order.shipping_provider = shipping_provider;
    order.tracking_code = tracking_code;

    if (shipping_status_detail !== undefined) {
      order.shipping_status_detail = shipping_status_detail || null;
    }

    if (order.order_status === "shipping" && !order.shipped_at) {
      order.shipped_at = new Date();
    }
    order.updated_at = new Date();
    await order.save();

    return order.toObject();
  }

  /**
   * Hủy đơn hàng
   */
  async cancelOrder(order_id, reason = "", actor = null) {
    const order = await this.model.findOne(this.buildIdentifierQuery(order_id));

    if (!order) {
      throw ApiError.notFound("Không tìm thấy đơn hàng");
    }

    // Chỉ cho phép hủy khi admin chưa xác nhận
    const cancelReason = (reason || "").trim();
    if (!cancelReason) {
      throw ApiError.badRequest("Cancel reason is required");
    }

    if (order.order_status !== "pending") {
      throw ApiError.badRequest("Chỉ có thể hủy đơn hàng khi chưa xác nhận");
    }

    const actorId = actor?.user_id || actor?._id || actor?.id || null;
    order.order_status = "cancelled";
    order.cancel_reason = cancelReason;
    order.cancelled_at = new Date();
    order.cancelled_by = actorId;

    if (
      ["paid", "partial"].includes(order.payment_status) &&
      order.refund_status === "none"
    ) {
      order.refund_status = "pending";
    }

    order.status_history = order.status_history || [];
    order.status_history.push({
      from: "pending",
      to: "cancelled",
      changed_by: actorId,
      note: cancelReason,
      changed_at: new Date(),
    });
    order.updated_at = new Date();
    await order.save();

    if (order.user_id) {
      const template = statusNotificationMap.cancelled;
      await notificationService.createNotification(
        {
          user_id: order.user_id,
          type: template.type,
          title: template.title,
          message: template.message(order.order_code),
          entity_type: "sales_order",
          entity_id: order.order_id,
          link: buildOrderLink(order.order_id),
          is_read: false,
        },
        { silent: true },
      );
    }

    return order.toObject();
  }

  /**
   * Lấy thống kê đơn hàng
   */
  async getOrderStats(filters = {}) {
    const pipeline = [];

    // Apply filters
    if (filters.user_id) {
      pipeline.push({ $match: { user_id: filters.user_id } });
    }
    if (filters.guest_id) {
      pipeline.push({ $match: { guest_id: filters.guest_id } });
    }
    if (filters.start_date || filters.end_date) {
      const dateFilter = {};
      if (filters.start_date) dateFilter.$gte = new Date(filters.start_date);
      if (filters.end_date) dateFilter.$lte = new Date(filters.end_date);
      pipeline.push({ $match: { created_at: dateFilter } });
    }

    // Group statistics
    pipeline.push({
      $group: {
        _id: null,
        total_orders: { $sum: 1 },
        total_revenue: { $sum: "$total_amount" },
        avg_order_value: { $avg: "$total_amount" },
        by_status: {
          $push: {
            status: "$order_status",
            amount: "$total_amount",
          },
        },
        by_payment_method: {
          $push: {
            method: "$payment_method",
            amount: "$total_amount",
          },
        },
      },
    });

    const stats = await this.model.aggregate(pipeline);
    return stats[0] || {};
  }
}

export default new BuyOrderService();
