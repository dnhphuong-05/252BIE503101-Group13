import BaseService from "../BaseService.js";
import RentOrder from "../../models/order/RentOrder.js";
import ApiError from "../../utils/ApiError.js";
import notificationService from "../notification.service.js";
import emailService from "../email/email.service.js";
import loyaltyService from "../user/loyalty.service.js";
import User from "../../models/user/User.js";
import Counter from "../../models/Counter.js";

const buildRentLink = (rentOrderId) => `/profile/rentals/${rentOrderId}`;
const buildAdminRentLink = (rentOrderId) => `/orders/rent?order=${rentOrderId}`;

const buildRentTrackingUrl = (rentOrderId, rentOrderCode, isGuest = false) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
  if (isGuest) {
    return `${frontendUrl}/?rentOrder=${encodeURIComponent(rentOrderCode || rentOrderId)}`;
  }
  return `${frontendUrl}/profile/rentals?order=${encodeURIComponent(rentOrderId)}`;
};

const buildRentAddressText = (customerInfo = {}) => {
  if (customerInfo.delivery_method === "pickup") {
    return "Nhan tai cua hang (shop se lien he xac nhan).";
  }
  const address = customerInfo.address || {};
  const parts = [address.address_detail, address.ward, address.province]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
  return parts.join(", ");
};

const formatCurrency = (value) =>
  `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)} đ`;

const buildViolationMessage = (order) => {
  const code = order?.rent_order_code || order?.rent_order_id || "-";
  const lateFee = order?.settlement?.late_fee ?? order?.pricing?.late_fee ?? 0;
  const damageFee = order?.settlement?.damage_fee ?? order?.pricing?.damage_fee ?? 0;
  const penaltyFee = order?.settlement?.penalty_fee ?? 0;
  const parts = [];
  if (lateFee > 0) parts.push(`Phí trễ: ${formatCurrency(lateFee)}`);
  if (damageFee > 0) parts.push(`Phí hư hỏng: ${formatCurrency(damageFee)}`);
  if (penaltyFee > 0) parts.push(`Phạt vi phạm: ${formatCurrency(penaltyFee)}`);
  const total = lateFee + damageFee + penaltyFee;
  const reason =
    order?.item?.condition_in?.note ||
    order?.admin_note ||
    order?.return_request?.note ||
    "";
  const detailText = parts.length ? ` ${parts.join(", ")}.` : "";
  const totalText = total > 0 ? ` Tổng phạt: ${formatCurrency(total)}.` : "";
  const reasonText = reason ? ` Lý do: ${reason}` : "";
  return `Đơn thuê ${code} có phát sinh vi phạm.${detailText}${totalText}${reasonText}`.trim();
};

const calcDepositBase = (order) => {
  const depositRequired = order?.pricing?.deposit_required;
  if (Number.isFinite(depositRequired)) return depositRequired;
  const itemDeposit = order?.item?.deposit_amount;
  const itemQty = order?.item?.quantity;
  if (Number.isFinite(itemDeposit)) {
    const safeQty = Number.isFinite(itemQty) && itemQty > 0 ? itemQty : 1;
    return itemDeposit * safeQty;
  }
  return 0;
};

const calcPenaltyTotal = (order) => {
  const lateFee = order?.settlement?.late_fee ?? order?.pricing?.late_fee ?? 0;
  const damageFee = order?.settlement?.damage_fee ?? order?.pricing?.damage_fee ?? 0;
  const penaltyFee = order?.settlement?.penalty_fee ?? 0;
  const cleaningFee = order?.settlement?.cleaning_fee ?? 0;
  const extraCharge = order?.settlement?.extra_charge ?? 0;
  return lateFee + damageFee + penaltyFee + cleaningFee + extraCharge;
};

const calcTotalDueToday = (order) => {
  const totalDue = order?.pricing?.total_due_today;
  if (Number.isFinite(totalDue)) return totalDue;
  const depositRequired = order?.pricing?.deposit_required ?? calcDepositBase(order);
  const shippingFee = order?.pricing?.shipping_fee ?? 0;
  const discount = order?.pricing?.discount_amount ?? 0;
  return Math.max(0, depositRequired + shippingFee - discount);
};

const deriveRefundAmount = ({ refundPaid, refundExpected }) => {
  if (refundPaid !== null && refundPaid !== undefined) return refundPaid;
  if (refundExpected !== null && refundExpected !== undefined) return refundExpected;
  return null;
};

const deriveSettlementStatus = ({ netRefund, refundPaid }) => {
  if (netRefund <= 0) return netRefund < 0 ? "extra_paid" : "no_refund";
  if (typeof refundPaid === "number") {
    return refundPaid >= netRefund ? "refunded" : "pending";
  }
  return "pending";
};

const rentStatusNotifications = {
  ongoing: {
    type: "rent_ongoing",
    title: "Đơn thuê đã bắt đầu",
    message: (code) => `Đơn thuê ${code} đã được xác nhận và bắt đầu.`,
  },
  return_requested: {
    type: "rent_return_label_created",
    title: "Đã tạo mã trả hàng",
    message: (code, order) => {
      const tracking = order?.shipping_back?.tracking_code;
      const provider = order?.shipping_back?.provider;
      if (tracking || provider) {
        return `Shop đã tạo mã vận đơn trả cho đơn ${code}${provider ? ` (${provider})` : ""}. Mã: ${tracking || "-"}.`;
      }
      return `Shop đã xác nhận yêu cầu trả cho đơn ${code}. Vui lòng kiểm tra vận đơn.`;
    },
  },
  returned: {
    type: "rent_return_received",
    title: "Shop đã nhận hàng",
    message: (code) => `Shop đã nhận lại đơn thuê ${code}.`,
  },
  closed: {
    type: "rent_closed",
    title: "Hoàn tất đơn thuê",
    message: (code) => `Đơn thuê ${code} đã hoàn tất và hoàn cọc.`,
  },
  cancelled: {
    type: "rent_cancelled",
    title: "Đơn thuê đã hủy",
    message: (code) => `Đơn thuê ${code} đã bị hủy.`,
  },
  violated: {
    type: "rent_violated",
    title: "Đơn thuê vi phạm",
    message: (code) => `Đơn thuê ${code} có phát sinh vi phạm.`,
  },
};

const notifyAdmins = async ({ type, title, message, entityId, link }) => {
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
          entity_type: "rent_order",
          entity_id: entityId,
          link: link || "",
          is_read: false,
        },
        { silent: true },
      ),
    ),
  );
};

class RentOrderService extends BaseService {
  constructor() {
    super(RentOrder);
  }

  normalizeCustomerEmail(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
  }

  async resolveCustomerEmailForOrder(orderLike = {}) {
    const order = typeof orderLike?.toObject === "function" ? orderLike.toObject() : orderLike || {};
    const directEmail = this.normalizeCustomerEmail(order?.customer_info?.email);
    if (directEmail) return directEmail;
    if (!order?.user_id) return "";

    try {
      const user = await User.findOne({ user_id: order.user_id })
        .select("email")
        .lean();
      return this.normalizeCustomerEmail(user?.email);
    } catch (error) {
      console.error("Error loading user email for rent confirmation:", error);
      return "";
    }
  }

  buildRentOrderEmailData(orderLike, customerEmail, status = "Da tiep nhan don thue") {
    const order = typeof orderLike?.toObject === "function" ? orderLike.toObject() : orderLike || {};
    const customerInfo = order.customer_info || {};
    const item = order.item || {};
    const rentalPeriod = order.rental_period || {};
    const pricing = order.pricing || {};

    const startDate = rentalPeriod.start_date
      ? new Date(rentalPeriod.start_date).toLocaleDateString("vi-VN")
      : "";
    const endDate = rentalPeriod.end_date
      ? new Date(rentalPeriod.end_date).toLocaleDateString("vi-VN")
      : "";
    const rentDays = Number(rentalPeriod.days) || 0;

    return {
      orderCode: order.rent_order_code,
      status,
      customer: {
        full_name: customerInfo.full_name || "",
        phone: customerInfo.phone || "",
        email: customerEmail,
        full_address: buildRentAddressText(customerInfo),
      },
      items: [
        {
          product_id: item.product_id,
          name: item.name_snapshot || "San pham " + String(item.product_id || ""),
          price: Number(item.rent_price_per_day) || 0,
          quantity: Number(item.quantity) || 1,
          sku: item.sku || "",
          thumbnail: item.thumbnail_snapshot || item.thumbnail || "",
          image: item.thumbnail_snapshot || item.thumbnail || "",
          attributes: {
            "So ngay thue": rentDays > 0 ? String(rentDays) + " ngay" : "",
            "Ngay nhan": startDate,
            "Ngay tra": endDate,
          },
        },
      ],
      subtotal: Number(pricing.deposit_required) || 0,
      shippingFee: Number(pricing.shipping_fee) || 0,
      total: Number(pricing.total_due_today) || 0,
      trackingUrl: buildRentTrackingUrl(
        order.rent_order_id,
        order.rent_order_code,
        Boolean(order.guest_id),
      ),
    };
  }

  /**
   * Generate rent_order_id
   * Format: RNT + YYMMDD + 4 digits
   */
  async generateRentOrderId() {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const datePrefix = `${year}${month}${day}`;

    const counterKey = `rent_order_${datePrefix}`;
    const seed = await this.getRentOrderSeed(datePrefix);
    const counter = await Counter.findOneAndUpdate(
      { _id: counterKey },
      [
        {
          $set: {
            seq: {
              $add: [{ $ifNull: ["$seq", seed] }, 1],
            },
          },
        },
      ],
      { new: true, upsert: true },
    );
    const sequence = String(counter.seq).padStart(4, "0");
    return `RNT${datePrefix}${sequence}`;
  }

  async getRentOrderSeed(datePrefix) {
    const regex = new RegExp(`^RNT${datePrefix}\\d{4,}$`);
    const last = await this.model
      .findOne({ rent_order_id: { $regex: regex } })
      .sort({ rent_order_id: -1 })
      .select("rent_order_id")
      .lean();
    if (!last?.rent_order_id) return 0;
    const suffix = String(last.rent_order_id).replace(`RNT${datePrefix}`, "");
    const parsed = Number.parseInt(suffix, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async createRentOrder(orderData) {
    if (!orderData?.user_id && !orderData?.guest_id) {
      throw ApiError.badRequest("Rent order requires user_id or guest_id");
    }
    if (!orderData?.customer_info) {
      throw ApiError.badRequest("Customer info is required");
    }

    let normalizedCustomerEmail = this.normalizeCustomerEmail(orderData.customer_info.email);

    if (!normalizedCustomerEmail && orderData?.user_id) {
      normalizedCustomerEmail = await this.resolveCustomerEmailForOrder({
        user_id: orderData.user_id,
      });
    }

    orderData.customer_info.email = normalizedCustomerEmail || null;

    if (orderData?.guest_id && !normalizedCustomerEmail) {
      throw ApiError.badRequest("Guest rent orders require email to receive tracking information");
    }

    if (!orderData?.item) {
      throw ApiError.badRequest("Rent item is required");
    }
    if (!orderData?.rental_period) {
      throw ApiError.badRequest("Rental period is required");
    }
    if (!orderData?.pricing) {
      throw ApiError.badRequest("Pricing info is required");
    }
    if (!orderData?.payment) {
      throw ApiError.badRequest("Payment info is required");
    }
    if (
      orderData.customer_info?.delivery_method === "ship" &&
      !orderData.customer_info?.address
    ) {
      throw ApiError.badRequest("Shipping address is required for delivery");
    }

    const rent_order_id = await this.generateRentOrderId();
    const rent_order_code = `PHUC-RNT-${rent_order_id.replace("RNT", "")}`;

    const paymentInput = orderData.payment || {};
    if (paymentInput.payment_status === "paid") {
      const totalDue = calcTotalDueToday(orderData);
      const currentPaid = Number(paymentInput.deposit_paid) || 0;
      if (totalDue > 0 && currentPaid < totalDue) {
        paymentInput.deposit_paid = totalDue;
      }
      if (!paymentInput.paid_at) {
        paymentInput.paid_at = new Date().toISOString();
      }
    }

    const order = await this.create({
      rent_order_id,
      rent_order_code,
      user_id: orderData.user_id || null,
      guest_id: orderData.guest_id || null,
      customer_info: orderData.customer_info,
      item: orderData.item,
      rental_period: orderData.rental_period,
      pricing: orderData.pricing,
      payment: paymentInput,
      rent_status: orderData.rent_status || "booked",
      settlement: orderData.settlement ?? null,
      shipping: orderData.shipping ?? null,
    });

    if (order.user_id) {
      await notificationService.createNotification(
        {
          user_id: order.user_id,
          type: "rent_confirmed",
          title: "Tạo đơn thuê thành công",
          message: `Đơn thuê ${order.rent_order_code} đã được tạo thành công.`,
          entity_type: "rent_order",
          entity_id: order.rent_order_id,
          link: buildRentLink(order.rent_order_id),
          is_read: false,
        },
        { silent: true },
      );
    }

    await notifyAdmins({
      type: "rent_created",
      title: "Đơn thuê mới",
      message: `Có đơn thuê mới ${order.rent_order_code} cần xác nhận.`,
      entityId: order.rent_order_id,
      link: buildAdminRentLink(order.rent_order_id),
    });

    let emailSent = false;
    if (normalizedCustomerEmail) {
      try {
        const emailData = this.buildRentOrderEmailData(
          order,
          normalizedCustomerEmail,
          "Da tiep nhan don thue",
        );

        const emailResult = await emailService.sendOrderConfirmation(emailData);
        emailSent = Boolean(emailResult?.success);
        if (!emailSent && emailResult?.error) {
          console.error("Rent order confirmation email failed:", emailResult.error);
        }
      } catch (error) {
        console.error("Error sending rent order confirmation email:", error);
      }
    }

    return { order, emailSent };
  }

  async getByUserId(userId, options = {}) {
    return await this.getAll({ user_id: userId }, { ...options, sort: "-created_at" });
  }

  async getByGuestId(guestId, options = {}) {
    return await this.getAll({ guest_id: guestId }, { ...options, sort: "-created_at" });
  }

  async getByRentOrderId(rentOrderId) {
    const order = await this.model
      .findOne({
        $or: [{ rent_order_id: rentOrderId }, { rent_order_code: rentOrderId }],
      })
      .lean();
    if (!order) {
      throw ApiError.notFound("Rent order not found");
    }
    return order;
  }

  async requestReturnByUser(rentOrderId, payload = {}, actor = null) {
    const userId = actor?.user_id || null;
    if (!userId) {
      throw ApiError.unauthorized("Authentication required");
    }

    const order = await this.model.findOne({
      $or: [{ rent_order_id: rentOrderId }, { rent_order_code: rentOrderId }],
      user_id: userId,
    });
    if (!order) {
      throw ApiError.notFound("Không tìm thấy đơn thuê");
    }
    if (order.rent_status !== "ongoing") {
      throw ApiError.badRequest("Đơn thuê chưa ở trạng thái đang thuê");
    }

    order.return_request = order.return_request || {};
    if (order.return_request.requested_at) {
      if (typeof payload.note === "string") {
        order.return_request.note = payload.note;
        order.updated_at = new Date();
        await order.save();
      }
      return order.toObject();
    }

    order.return_request.requested_at = new Date();
    if (typeof payload.note === "string") {
      order.return_request.note = payload.note;
    }

    order.status_history = order.status_history || [];
    order.status_history.push({
      from: order.rent_status,
      to: order.rent_status,
      changed_by: userId,
      note: payload.note || "Khách yêu cầu trả hàng",
      changed_at: new Date(),
    });

    order.updated_at = new Date();
    await order.save();

    await notifyAdmins({
      type: "rent_return_requested",
      title: "Yêu cầu trả hàng",
      message: `Khách vừa yêu cầu trả đơn ${order.rent_order_code}.`,
      entityId: order.rent_order_id,
      link: buildAdminRentLink(order.rent_order_id),
    });

    return order.toObject();
  }

  async confirmReturnShipment(rentOrderId, payload = {}, actor = null) {
    const userId = actor?.user_id || null;
    if (!userId) {
      throw ApiError.unauthorized("Authentication required");
    }

    const order = await this.model.findOne({
      $or: [{ rent_order_id: rentOrderId }, { rent_order_code: rentOrderId }],
      user_id: userId,
    });
    if (!order) {
      throw ApiError.notFound("Không tìm thấy đơn thuê");
    }
    if (order.rent_status !== "return_requested") {
      throw ApiError.badRequest("Đơn thuê chưa ở trạng thái yêu cầu trả");
    }
    if (!order.shipping_back?.tracking_code) {
      throw ApiError.badRequest("Chưa có mã vận đơn trả từ shop");
    }

    order.rent_status = "returning";
    order.shipping_back = order.shipping_back || {};
    if (!order.shipping_back.shipped_at) {
      order.shipping_back.shipped_at = new Date();
    }

    order.status_history = order.status_history || [];
    order.status_history.push({
      from: "return_requested",
      to: "returning",
      changed_by: userId,
      note: payload.note || "Khách xác nhận đã gửi hàng",
      changed_at: new Date(),
    });

    order.updated_at = new Date();
    await order.save();

    await notifyAdmins({
      type: "rent_return_shipped",
      title: "Khách đã gửi hàng",
      message: `Khách đã gửi hàng trả cho đơn ${order.rent_order_code}.`,
      entityId: order.rent_order_id,
      link: buildAdminRentLink(order.rent_order_id),
    });

    return order.toObject();
  }

  async cancelRentOrderByUser(rentOrderId, payload = {}, actor = null) {
    const userId = actor?.user_id || null;
    if (!userId) {
      throw ApiError.unauthorized("Authentication required");
    }

    const order = await this.model.findOne({
      $or: [{ rent_order_id: rentOrderId }, { rent_order_code: rentOrderId }],
      user_id: userId,
    });
    if (!order) {
      throw ApiError.notFound("Không tìm thấy đơn thuê");
    }
    if (order.rent_status !== "booked") {
      throw ApiError.badRequest("Đơn thuê đã được xác nhận, không thể hủy");
    }

    const reason = payload.reason?.trim() || "Người dùng hủy đơn";
    order.rent_status = "cancelled";
    order.cancel_reason = reason;
    order.cancelled_at = new Date();
    order.cancelled_by = userId;

    order.status_history = order.status_history || [];
    order.status_history.push({
      from: "booked",
      to: "cancelled",
      changed_by: userId,
      note: reason,
      changed_at: new Date(),
    });

    order.updated_at = new Date();
    await order.save();

    await notifyAdmins({
      type: "rent_cancelled",
      title: "Đơn thuê bị hủy",
      message: `Khách đã hủy đơn thuê ${order.rent_order_code}.`,
      entityId: order.rent_order_id,
      link: buildAdminRentLink(order.rent_order_id),
    });

    return order.toObject();
  }

  async updateRentOrderStatus(rentOrderId, payload = {}, actor = null) {
    const order = await this.model.findOne({
      $or: [{ rent_order_id: rentOrderId }, { rent_order_code: rentOrderId }],
    });
    if (!order) {
      throw ApiError.notFound("Rent order not found");
    }

    const actorId = actor?.user_id || actor?._id || actor?.id || null;
    const nextStatus = payload?.rent_status;
    const currentStatus = order.rent_status;

    if (typeof payload.admin_note === "string") {
      order.admin_note = payload.admin_note;
    }

    if (typeof payload.cancel_reason === "string") {
      order.cancel_reason = payload.cancel_reason;
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
    if (payload.confirmed_at !== undefined) {
      const confirmedAt = payload.confirmed_at ? new Date(payload.confirmed_at) : null;
      order.confirmed_at = confirmedAt;
      if (confirmedAt && actorId) {
        order.confirmed_by = actorId;
      }
    }

    let shouldRecalcRefund = false;
    let shouldUpdateSettlementSummary = false;

    if (payload.deposit_paid !== undefined) {
      const depositPaid = Number(payload.deposit_paid);
      if (Number.isNaN(depositPaid) || depositPaid < 0) {
        throw ApiError.badRequest("deposit_paid must be a number >= 0");
      }
      order.payment = order.payment || {};
      order.payment.deposit_paid = depositPaid;
      shouldRecalcRefund = true;
      shouldUpdateSettlementSummary = true;
    }

    if (payload.payment_status) {
      order.payment = order.payment || {};
      order.payment.payment_status = payload.payment_status;
      if (
        ["paid", "partial"].includes(payload.payment_status) &&
        !order.payment.paid_at
      ) {
        order.payment.paid_at = new Date();
      }
    }

    if (payload.payment_status === "paid") {
      const totalDue = calcTotalDueToday(order);
      if (totalDue > 0) {
        const currentPaid = Number(order.payment?.deposit_paid) || 0;
        if (currentPaid < totalDue) {
          order.payment = order.payment || {};
          order.payment.deposit_paid = totalDue;
          shouldUpdateSettlementSummary = true;
        }
      }
    }

    if (payload.pricing) {
      order.pricing = order.pricing || {};
      shouldUpdateSettlementSummary = true;
      if (payload.pricing.late_fee !== undefined) {
        order.pricing.late_fee = Number(payload.pricing.late_fee) || 0;
        order.settlement = order.settlement || {};
        order.settlement.late_fee = order.pricing.late_fee;
        shouldRecalcRefund = true;
      }
      if (payload.pricing.damage_fee !== undefined) {
        order.pricing.damage_fee = Number(payload.pricing.damage_fee) || 0;
        order.settlement = order.settlement || {};
        order.settlement.damage_fee = order.pricing.damage_fee;
        shouldRecalcRefund = true;
      }
      if (payload.pricing.refund_expected !== undefined) {
        const expected = Number(payload.pricing.refund_expected) || 0;
        order.pricing.refund_expected = expected;
        order.settlement = order.settlement || {};
        order.settlement.refund_expected = expected;
        shouldRecalcRefund = true;
      }
    }

    if (payload.settlement) {
      order.settlement = order.settlement || {};
      shouldUpdateSettlementSummary = true;
      if (payload.settlement.refund_expected !== undefined) {
        const expected = Number(payload.settlement.refund_expected) || 0;
        order.settlement.refund_expected = expected;
        if (order.pricing) {
          order.pricing.refund_expected = expected;
        }
        shouldRecalcRefund = true;
      }
      if (payload.settlement.refund_paid !== undefined) {
        order.settlement.refund_paid = Number(payload.settlement.refund_paid) || 0;
        shouldUpdateSettlementSummary = true;
      }
      if (payload.settlement.refund_receipt_url !== undefined) {
        order.settlement.refund_receipt_url = payload.settlement.refund_receipt_url || null;
      }
      if (payload.settlement.refund_note !== undefined) {
        order.settlement.refund_note = payload.settlement.refund_note || "";
      }
      if (payload.settlement.refunded_at) {
        order.settlement.refunded_at = payload.settlement.refunded_at;
        shouldUpdateSettlementSummary = true;
      }
      if (payload.settlement.penalty_fee !== undefined) {
        order.settlement.penalty_fee = Number(payload.settlement.penalty_fee) || 0;
        shouldRecalcRefund = true;
        shouldUpdateSettlementSummary = true;
      }
      if (payload.settlement.cleaning_fee !== undefined) {
        order.settlement.cleaning_fee = Number(payload.settlement.cleaning_fee) || 0;
        shouldRecalcRefund = true;
        shouldUpdateSettlementSummary = true;
      }
      if (payload.settlement.extra_charge !== undefined) {
        order.settlement.extra_charge = Number(payload.settlement.extra_charge) || 0;
        shouldRecalcRefund = true;
        shouldUpdateSettlementSummary = true;
      }
      if (payload.settlement.late_fee !== undefined) {
        order.settlement.late_fee = Number(payload.settlement.late_fee) || 0;
        if (order.pricing) {
          order.pricing.late_fee = order.settlement.late_fee;
        }
        shouldRecalcRefund = true;
        shouldUpdateSettlementSummary = true;
      }
      if (payload.settlement.damage_fee !== undefined) {
        order.settlement.damage_fee = Number(payload.settlement.damage_fee) || 0;
        if (order.pricing) {
          order.pricing.damage_fee = order.settlement.damage_fee;
        }
        shouldRecalcRefund = true;
        shouldUpdateSettlementSummary = true;
      }
    }

    if (payload.return_request) {
      order.return_request = {
        ...(order.return_request?.toObject?.() || order.return_request || {}),
        ...payload.return_request,
      };
    }

    if (payload.shipping_out) {
      order.shipping_out = {
        ...(order.shipping_out?.toObject?.() || order.shipping_out || {}),
        ...payload.shipping_out,
      };
    }

    if (payload.shipping_back) {
      order.shipping_back = {
        ...(order.shipping_back?.toObject?.() || order.shipping_back || {}),
        ...payload.shipping_back,
      };
    }

    if (payload.condition_out) {
      order.item = order.item || {};
      order.item.condition_out = {
        ...(order.item.condition_out || {}),
        ...payload.condition_out,
      };
    }

    if (payload.condition_in) {
      order.item = order.item || {};
      order.item.condition_in = {
        ...(order.item.condition_in || {}),
        ...payload.condition_in,
      };
    }

    if (shouldRecalcRefund) {
      const depositBase = calcDepositBase(order);
      const rentFee = order.pricing?.rent_fee_expected ?? 0;
      const penaltyTotal = calcPenaltyTotal(order);
      const expected = Math.max(0, depositBase - rentFee - penaltyTotal);
      order.settlement = order.settlement || {};
      order.settlement.refund_expected = expected;
      if (order.pricing) {
        order.pricing.refund_expected = expected;
      }
    }

    const shouldComputeSettlement =
      shouldUpdateSettlementSummary ||
      (nextStatus && ["closed", "violated"].includes(nextStatus));
    if (shouldComputeSettlement) {
      order.settlement = order.settlement || {};
      const depositBase = calcDepositBase(order);
      const rentFee = order.pricing?.rent_fee_expected ?? 0;
      const penaltyTotal = calcPenaltyTotal(order);
      const rawRefund = depositBase - rentFee - penaltyTotal;
      const netRefund = Math.max(0, rawRefund);
      order.settlement.penalty_total = penaltyTotal;
      order.settlement.refund_expected = netRefund;
      if (order.pricing) {
        order.pricing.refund_expected = netRefund;
      }
      const refundPaid = order.settlement.refund_paid;
      order.settlement.refund_amount = deriveRefundAmount({
        refundPaid,
        refundExpected: netRefund,
      });
      order.settlement.settlement_status = deriveSettlementStatus({
        netRefund: rawRefund,
        refundPaid,
      });
      if (
        !order.settlement.settled_at &&
        (nextStatus === "closed" ||
          nextStatus === "violated" ||
          (refundPaid !== null && refundPaid !== undefined))
      ) {
        order.settlement.settled_at = new Date();
      }
    }

    const validTransitions = {
      booked: ["ongoing", "cancelled"],
      ongoing: ["return_requested", "cancelled"],
      return_requested: ["returning", "cancelled"],
      returning: ["returned", "cancelled"],
      returned: ["closed", "violated"],
      closed: [],
      cancelled: [],
      violated: ["closed"],
    };
    if (order.guest_id && !validTransitions.ongoing.includes("returned")) {
      validTransitions.ongoing.push("returned");
    }

    if (nextStatus && nextStatus !== currentStatus) {
      if (!validTransitions[currentStatus]?.includes(nextStatus)) {
        throw ApiError.badRequest(
          `Không thể chuyển từ ${currentStatus} sang ${nextStatus}`,
        );
      }

      order.rent_status = nextStatus;

      if (nextStatus === "return_requested") {
        if (!order.return_request?.requested_at) {
          throw ApiError.badRequest("Khách chưa gửi yêu cầu trả");
        }
        if (!order.shipping_back?.tracking_code) {
          throw ApiError.badRequest("Vui lòng nhập mã vận đơn trả");
        }
        order.return_request = order.return_request || {};
        order.shipping_back = order.shipping_back || {};
        if (payload?.shipping_back?.created_by_shop === undefined) {
          order.shipping_back.created_by_shop = true;
        }
      }

      if (nextStatus === "ongoing" && order.shipping_out && !order.shipping_out.delivered_at) {
        order.shipping_out.delivered_at = new Date();
      }

      if (nextStatus === "returned" && order.shipping_back && !order.shipping_back.delivered_at) {
        order.shipping_back.delivered_at = new Date();
      }

      if (nextStatus === "closed") {
        order.settlement = order.settlement || {};
        if (order.settlement.refund_paid && !order.settlement.refunded_at) {
          order.settlement.refunded_at = new Date();
        }
      }

      if (nextStatus === "cancelled") {
        if (!order.cancel_reason) {
          throw ApiError.badRequest("Cancel reason is required");
        }
        order.cancelled_at = new Date();
        order.cancelled_by = actorId;
      }

      order.status_history = order.status_history || [];
      order.status_history.push({
        from: currentStatus,
        to: nextStatus,
        changed_by: actorId,
        note:
          payload.log_note ||
          order.admin_note ||
          (nextStatus === "cancelled" ? order.cancel_reason : "") ||
          "",
        changed_at: new Date(),
      });
    } else if (payload.log_note) {
      order.status_history = order.status_history || [];
      order.status_history.push({
        from: currentStatus,
        to: currentStatus,
        changed_by: actorId,
        note: payload.log_note,
        changed_at: new Date(),
      });
    }

    order.updated_at = new Date();
    await order.save();

    if (payload?.notify_return_reminder && order.user_id) {
      const tracking = order.shipping_back?.tracking_code;
      const message = tracking
        ? `Vui lòng gửi trả đơn thuê ${order.rent_order_code}. Mã vận đơn: ${tracking}.`
        : `Vui lòng gửi trả đơn thuê ${order.rent_order_code} đúng hạn.`;
      await notificationService.createNotification(
        {
          user_id: order.user_id,
          type: "rent_return_reminder",
          title: "Nhắc nhở trả hàng",
          message,
          entity_type: "rent_order",
          entity_id: order.rent_order_id,
          link: buildRentLink(order.rent_order_id),
          is_read: false,
        },
        { silent: true },
      );
    }

    if (payload?.notify_violation && order.user_id) {
      await notificationService.createNotification(
        {
          user_id: order.user_id,
          type: "rent_violated",
          title: "Cập nhật phí vi phạm",
          message: buildViolationMessage(order),
          entity_type: "rent_order",
          entity_id: order.rent_order_id,
          link: buildRentLink(order.rent_order_id),
          is_read: false,
        },
        { silent: true },
      );
    }

    if (nextStatus && nextStatus !== currentStatus && order.user_id) {
      const template = rentStatusNotifications[nextStatus];
      if (template) {
        await notificationService.createNotification(
          {
            user_id: order.user_id,
            type: template.type,
            title: template.title,
            message: template.message(order.rent_order_code, order),
            entity_type: "rent_order",
            entity_id: order.rent_order_id,
            link: buildRentLink(order.rent_order_id),
            is_read: false,
          },
          { silent: true },
        );
      }
    }

    if (nextStatus === "ongoing" && nextStatus !== currentStatus) {
      try {
        const customerEmail = await this.resolveCustomerEmailForOrder(order);
        if (customerEmail) {
          const emailData = this.buildRentOrderEmailData(
            order,
            customerEmail,
            "Don thue da duoc xac nhan",
          );
          const emailResult = await emailService.sendOrderConfirmation(emailData);
          if (!emailResult?.success) {
            console.error("Error sending rent confirmation email on status update:", emailResult?.error);
          }
        } else {
          console.warn(`Skip rent confirmation email for ${order.rent_order_code}: missing customer email`);
        }
      } catch (error) {
        console.error("Error sending rent confirmation email on status update:", error);
      }
    }

    if (order.user_id && order.rent_status === "closed" && order.payment?.payment_status === "paid") {
      const totalValue = order.pricing?.total_due_today ?? order.pricing?.rent_fee_expected ?? 0;
      await loyaltyService.awardOrderPoints({
        userId: order.user_id,
        amount: totalValue,
        refId: order.rent_order_id,
        reason: `Hoàn tất đơn thuê ${order.rent_order_code}`,
      });
    }

    return order.toObject();
  }
}

export default new RentOrderService();
