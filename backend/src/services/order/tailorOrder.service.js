import mongoose from "mongoose";
import BaseService from "../BaseService.js";
import TailorOrder from "../../models/order/TailorOrder.js";
import ContactMessage from "../../models/ContactMessage.js";
import ApiError from "../../utils/ApiError.js";

const LEGACY_STATUS_MAP = {
  confirmed_request: "created",
  quoted: "consulted",
  order_confirmed: "sample_confirmed",
  tailoring: "tailoring",
  shipping: "completed",
  cancelled: "cancelled",
};

const STATUS_TRANSITIONS = {
  created: ["consulted", "cancelled"],
  consulted: ["sample_confirmed", "cancelled"],
  sample_confirmed: ["tailoring", "cancelled"],
  tailoring: ["fitting_adjustment", "cancelled"],
  fitting_adjustment: ["completed", "tailoring", "cancelled"],
  completed: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const normalizeMoney = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed);
};

const normalizePositiveInt = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.round(parsed);
};

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeStatusValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "created";
  return LEGACY_STATUS_MAP[raw] || raw;
};

const hasDeliveredEvidence = (order) =>
  Boolean(
    order?.timeline?.delivered_at ||
      order?.shipping?.delivered_at ||
      order?.shipping?.actual_delivery_at,
  );

const normalizeTrimmedString = (value) => {
  if (value === undefined) return undefined;
  return String(value || "").trim();
};

const normalizeNullableNumber = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

const normalizeStringArray = (value) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0);
};

const generateTrackingCode = () => {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `VPX${datePart}${randomPart}`;
};

const generateLabelCode = () => {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `LBL-${randomPart}`;
};

const generateEstimatedDeliveryDate = (baseDate = new Date()) => {
  const estimated = new Date(baseDate);
  // Simulated carrier ETA because there is no real carrier integration yet.
  estimated.setDate(estimated.getDate() + 3);
  return estimated;
};

const isMockCarrierName = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes("phuc express") || normalized.includes("mock");
};

const sanitizeCarrierName = (value, fallback = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return fallback;
  if (isMockCarrierName(normalized)) return fallback;
  return normalized;
};

const isMockShipmentNote = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("carrier contact simulated for the project") ||
    normalized.includes("mock shipping code") ||
    normalized.includes("đã tạo vận đơn từ trang quản trị") ||
    normalized.includes("da tao van don tu trang quan tri")
  );
};

const sanitizeShipmentNote = (value, fallback = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return fallback;
  if (isMockShipmentNote(normalized)) return fallback;
  return normalized;
};

const toPlainObject = (value) =>
  value && typeof value.toObject === "function" ? value.toObject() : value;

class TailorOrderService extends BaseService {
  constructor() {
    super(TailorOrder);
  }

  resolveIdFilter(id) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return { _id: id };
    }
    return { tailor_order_id: String(id) };
  }

  async getById(orderId, options = {}) {
    const { select = "", populate = "" } = options;
    let query = this.model.findOne(this.resolveIdFilter(orderId));

    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);

    const item = await query.lean();
    if (!item) {
      throw ApiError.notFound(`Tailor order not found with id: ${orderId}`);
    }
    return this.normalizeOrderForResponse(item);
  }

  async getByContactId(contactId) {
    const item = await this.model.findOne({ source_contact_id: Number(contactId) }).lean();
    return item ? this.normalizeOrderForResponse(item) : null;
  }

  async getAllTailorOrders(options = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sort = "-created_at",
      source_contact_id,
    } = options;

    const filters = {};
    if (status && status !== "all") {
      const normalizedStatus = normalizeStatusValue(status);
      const legacyStatus = Object.entries(LEGACY_STATUS_MAP)
        .filter(([, mapped]) => mapped === normalizedStatus)
        .map(([legacy]) => legacy);
      filters.status = { $in: [normalizedStatus, ...legacyStatus] };
    }
    if (source_contact_id) {
      filters.source_contact_id = Number(source_contact_id);
    }
    if (search && String(search).trim()) {
      const regex = new RegExp(String(search).trim(), "i");
      filters.$or = [
        { tailor_order_id: regex },
        { "customer.full_name": regex },
        { "customer.customer_code": regex },
        { "customer.phone": regex },
        { "customer.email": regex },
        { "customer.zalo_contact": regex },
        { "customer.address": regex },
        { "product.title": regex },
        { "product.reference_product_name": regex },
        { "product.reference_model_code": regex },
        { source_message: regex },
        { "finance.note": regex },
      ];
    }

    const result = await this.getAll(filters, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      sort,
    });

    return {
      ...result,
      items: (result.items || []).map((item) => this.normalizeOrderForResponse(item)),
    };
  }

  async getStatistics() {
    const [total, created, consulted, sampleConfirmed, tailoring, fittingAdjustment, completed, delivered, cancelled] =
      await Promise.all([
        this.model.countDocuments({}),
        this.model.countDocuments({ status: { $in: ["created", "confirmed_request"] } }),
        this.model.countDocuments({ status: { $in: ["consulted", "quoted"] } }),
        this.model.countDocuments({ status: { $in: ["sample_confirmed", "order_confirmed"] } }),
        this.model.countDocuments({ status: "tailoring" }),
        this.model.countDocuments({ status: "fitting_adjustment" }),
        this.model.countDocuments({ status: { $in: ["completed", "shipping"] } }),
        this.model.countDocuments({ status: "delivered" }),
        this.model.countDocuments({ status: "cancelled" }),
      ]);

    return {
      total,
      created,
      consulted,
      sample_confirmed: sampleConfirmed,
      tailoring,
      fitting_adjustment: fittingAdjustment,
      completed,
      delivered,
      cancelled,
      in_progress: created + consulted + sampleConfirmed + tailoring + fittingAdjustment + completed,
    };
  }

  async createFromContact(contactId, actor = null) {
    const numericContactId = Number(contactId);
    if (!Number.isFinite(numericContactId)) {
      throw ApiError.badRequest("Invalid contact ID.");
    }

    const existing = await this.getByContactId(numericContactId);
    if (existing) {
      return { order: existing, existed: true };
    }

    const contact = await ContactMessage.findOne({ contact_id: numericContactId }).lean();
    if (!contact) {
      throw ApiError.notFound("Tailoring request not found.");
    }
    if (contact.purpose !== "custom") {
      throw ApiError.badRequest("Only custom tailoring inbox requests can create tailor orders.");
    }

    const now = new Date();
    const handledBy = actor?.user_id || actor?._id || null;

    const order = await this.create({
      source_contact_id: numericContactId,
      source_message: contact.message || "",
      customer: {
        customer_code: contact.user_id || contact.guest_id || "",
        full_name: contact.full_name || contact.fullName || "Customer",
        phone: contact.phone,
        email: contact.email,
        zalo_contact: contact.phone || "",
        address: "",
        customer_note: "",
        user_id: contact.user_id || null,
        guest_id: contact.guest_id || null,
      },
      communication: {
        channel: "zalo",
        handled_by: handledBy ? String(handledBy) : null,
        customer_confirmed_at: now,
        note: "",
      },
      product: {
        title: "",
        quantity: 1,
      },
      finance: {
        payment_method: "bank_transfer",
      },
      status: "created",
      status_history: [
        {
          from: null,
          to: "created",
          changed_by: handledBy ? String(handledBy) : null,
          note: "Tailor order created from inbox.",
          changed_at: now,
        },
      ],
    });

    if (contact.status === "new") {
      await ContactMessage.findOneAndUpdate(
        { contact_id: numericContactId },
        { $set: { status: "processing" } },
      );
    }

    return { order: this.normalizeOrderForResponse(toPlainObject(order)), existed: false };
  }

  async updateTailorOrder(orderId, payload, actor = null) {
    const order = await this.model.findOne(this.resolveIdFilter(orderId));
    if (!order) {
      throw ApiError.notFound(`Tailor order not found with id: ${orderId}`);
    }

    this.normalizeOrderForMutation(order);

    this.applySnapshotPayload(order, payload, actor);

    if (payload.status) {
      this.applyStatusTransition(
        order,
        payload.status,
        actor,
        payload.status_note,
        payload.cancel_reason,
      );
    } else if (payload.cancel_reason !== undefined) {
      order.cancel_reason = String(payload.cancel_reason || "").trim();
    }

    await order.save();
    return this.normalizeOrderForResponse(toPlainObject(order));
  }

  async generateShipment(orderId, payload = {}, actor = null) {
    const order = await this.model.findOne(this.resolveIdFilter(orderId));
    if (!order) {
      throw ApiError.notFound(`Tailor order not found with id: ${orderId}`);
    }

    this.normalizeOrderForMutation(order);

    if (["delivered", "cancelled"].includes(order.status)) {
      throw ApiError.badRequest("Cannot create a shipment for an order that is already closed.");
    }

    if (order.status !== "completed") {
      throw ApiError.badRequest("Only completed orders can generate shipment.");
    }

    const depositAmount = Number(order.pricing?.deposit_amount || 0);
    const paidAmount = Number(order.finance?.paid_amount || 0);
    if (depositAmount <= 0 || paidAmount < depositAmount) {
      throw ApiError.badRequest(
        "Deposit payment must be confirmed before generating shipment.",
      );
    }

    const now = new Date();
    const carrierName = sanitizeCarrierName(payload.carrier_name, "GHTK") || "GHTK";
    const shippingNote = sanitizeShipmentNote(
      payload.note,
      sanitizeShipmentNote(order.shipping?.note),
    );
    const estimatedDeliveryAt =
      order.shipping?.estimated_delivery_at ||
      normalizeDate(payload.estimated_delivery_at) ||
      generateEstimatedDeliveryDate(now);

    order.shipping = {
      ...order.shipping,
      receive_method: order.shipping?.receive_method || "home_delivery",
      carrier_name: carrierName,
      tracking_code: order.shipping?.tracking_code || generateTrackingCode(),
      label_code: order.shipping?.label_code || generateLabelCode(),
      note: shippingNote,
      created_at: order.shipping?.created_at || now,
      estimated_delivery_at: estimatedDeliveryAt,
      actual_delivery_at: order.shipping?.actual_delivery_at || null,
    };

    order.timeline = order.timeline || {};
    order.timeline.shipment_created_at = order.timeline.shipment_created_at || now;
    order.status_history.push({
      from: order.status,
      to: order.status,
      changed_by: actor?.user_id || actor?._id || null,
      note: "Tạo vận đơn.",
      changed_at: now,
    });

    await order.save();
    return this.normalizeOrderForResponse(toPlainObject(order));
  }

  applySnapshotPayload(order, payload, actor = null) {
    order.customer = order.customer || {};
    order.communication = order.communication || {};
    order.product = order.product || {};
    order.pricing = order.pricing || {};
    order.finance = order.finance || {};
    order.shipping = order.shipping || {};

    if (payload.customer) {
      const customer = payload.customer;
      const customerCode = normalizeTrimmedString(customer.customer_code);
      if (customerCode !== undefined) {
        order.customer.customer_code = customerCode;
      }
      const fullName = normalizeTrimmedString(customer.full_name);
      if (fullName !== undefined) {
        order.customer.full_name = fullName || order.customer.full_name;
      }
      const phone = normalizeTrimmedString(customer.phone);
      if (phone !== undefined) {
        order.customer.phone = phone || order.customer.phone;
      }
      const email = normalizeTrimmedString(customer.email);
      if (email !== undefined) {
        order.customer.email = (email || order.customer.email || "").toLowerCase();
      }
      const zaloContact = normalizeTrimmedString(customer.zalo_contact);
      if (zaloContact !== undefined) {
        order.customer.zalo_contact = zaloContact;
      }
      const address = normalizeTrimmedString(customer.address);
      if (address !== undefined) {
        order.customer.address = address;
      }
      if (customer.customer_note !== undefined) {
        order.customer.customer_note = String(customer.customer_note || "").trim();
      }
    }

    if (payload.communication) {
      const communication = payload.communication;
      order.communication.channel =
        communication.channel || order.communication.channel || "zalo";
      if (communication.handled_by !== undefined) {
        order.communication.handled_by = String(communication.handled_by || "").trim() || null;
      }
      if (communication.note !== undefined) {
        order.communication.note = String(communication.note || "").trim();
      }
      if (communication.customer_confirmed_at !== undefined) {
        order.communication.customer_confirmed_at = normalizeDate(
          communication.customer_confirmed_at,
        );
      }
      if (actor?.user_id || actor?._id) {
        order.communication.handled_by = String(actor.user_id || actor._id);
      }
    }

    if (payload.product) {
      const product = payload.product;
      const referenceProductId = normalizePositiveInt(product.reference_product_id);
      if (referenceProductId !== undefined) {
        order.product.reference_product_id = referenceProductId;
      }
      if (product.reference_model_code !== undefined) {
        order.product.reference_model_code = String(product.reference_model_code || "").trim();
      }
      if (product.reference_product_name !== undefined) {
        order.product.reference_product_name = String(product.reference_product_name || "").trim();
      }
      if (product.reference_sku !== undefined) {
        order.product.reference_sku = String(product.reference_sku || "").trim();
      }
      if (product.title !== undefined) {
        order.product.title = String(product.title || "").trim();
      }
      if (product.category_name !== undefined) {
        order.product.category_name = String(product.category_name || "").trim();
      }
      const basePrice = normalizeMoney(product.base_price);
      if (basePrice !== undefined) {
        order.product.base_price = basePrice;
      }
      if (product.base_description !== undefined) {
        order.product.base_description = String(product.base_description || "").trim();
      }
      if (product.era !== undefined) {
        order.product.era = String(product.era || "").trim();
      }
      if (product.material !== undefined) {
        order.product.material = String(product.material || "").trim();
      }
      if (product.craftsmanship !== undefined) {
        order.product.craftsmanship = String(product.craftsmanship || "").trim();
      }
      if (product.color_palette !== undefined) {
        order.product.color_palette = String(product.color_palette || "").trim();
      }
      if (product.pattern_note !== undefined) {
        order.product.pattern_note = String(product.pattern_note || "").trim();
      }
      if (product.style_adjustments !== undefined) {
        order.product.style_adjustments = String(product.style_adjustments || "").trim();
      }
      if (product.custom_request !== undefined) {
        order.product.custom_request = String(product.custom_request || "").trim();
      }
      if (product.size_note !== undefined) {
        order.product.size_note = String(product.size_note || "").trim();
      }
      if (product.measurement_note !== undefined) {
        order.product.measurement_note = String(product.measurement_note || "").trim();
      }
      const extraPrice = normalizeMoney(product.extra_price);
      if (extraPrice !== undefined) {
        order.product.extra_price = extraPrice;
      }
      const quantity = normalizePositiveInt(product.quantity);
      if (quantity !== undefined) {
        order.product.quantity = quantity;
      }
      if (product.accessories !== undefined) {
        order.product.accessories = String(product.accessories || "").trim();
      }
      if (product.customization_note !== undefined) {
        order.product.customization_note = String(product.customization_note || "").trim();
      }
      if (product.thumbnail !== undefined) {
        order.product.thumbnail = String(product.thumbnail || "").trim();
      }

      if (product.measurements) {
        const measurements = product.measurements;
        order.product.measurements = order.product.measurements || {};
        [
          "height",
          "weight",
          "chest",
          "waist",
          "hip",
          "shoulder",
          "sleeve_length",
          "top_length",
          "bottom_length",
        ].forEach((field) => {
          const value = normalizeNullableNumber(measurements[field]);
          if (value !== undefined) {
            order.product.measurements[field] = value;
          }
        });
        if (measurements.other_measurements !== undefined) {
          order.product.measurements.other_measurements = String(
            measurements.other_measurements || "",
          ).trim();
        }
      }

      if (product.attachments) {
        order.product.attachments = order.product.attachments || {};
        const customerReferenceImages = normalizeStringArray(
          product.attachments.customer_reference_images,
        );
        if (customerReferenceImages !== undefined) {
          order.product.attachments.customer_reference_images = customerReferenceImages;
        }
        const fabricImages = normalizeStringArray(product.attachments.fabric_images);
        if (fabricImages !== undefined) {
          order.product.attachments.fabric_images = fabricImages;
        }
        const finalDesignImages = normalizeStringArray(product.attachments.final_design_images);
        if (finalDesignImages !== undefined) {
          order.product.attachments.final_design_images = finalDesignImages;
        }
      }

      if (product.tailor_note !== undefined) {
        order.product.tailor_note = String(product.tailor_note || "").trim();
      }
    }

    if (payload.pricing) {
      const pricing = payload.pricing;
      const quotedPrice = normalizeMoney(pricing.quoted_price);
      if (quotedPrice !== undefined) {
        order.pricing.quoted_price = quotedPrice;
      }
      const depositAmount = normalizeMoney(pricing.deposit_amount);
      if (depositAmount !== undefined) {
        order.pricing.deposit_amount = depositAmount;
      }
      const shippingFee = normalizeMoney(pricing.shipping_fee);
      if (shippingFee !== undefined) {
        order.pricing.shipping_fee = shippingFee;
      }
      order.pricing.total_amount =
        Number(order.pricing.quoted_price || 0) + Number(order.pricing.shipping_fee || 0);
    }

    if (payload.finance) {
      const finance = payload.finance;
      if (finance.payment_method !== undefined) {
        order.finance.payment_method = String(finance.payment_method || "").trim();
      }
      if (finance.payment_status !== undefined) {
        order.finance.payment_status = String(finance.payment_status || "").trim();
      }
      const paidAmount = normalizeMoney(finance.paid_amount);
      if (paidAmount !== undefined) {
        order.finance.paid_amount = paidAmount;
      }
      if (finance.payment_date !== undefined) {
        order.finance.payment_date = normalizeDate(finance.payment_date);
      }
      if (finance.transaction_code !== undefined) {
        order.finance.transaction_code = String(finance.transaction_code || "").trim();
      }
      const materialCost = normalizeMoney(finance.material_cost);
      if (materialCost !== undefined) {
        order.finance.material_cost = materialCost;
      }
      const laborCost = normalizeMoney(finance.labor_cost);
      if (laborCost !== undefined) {
        order.finance.labor_cost = laborCost;
      }
      const accessoryCost = normalizeMoney(finance.accessory_cost);
      if (accessoryCost !== undefined) {
        order.finance.accessory_cost = accessoryCost;
      }
      const otherCost = normalizeMoney(finance.other_cost);
      if (otherCost !== undefined) {
        order.finance.other_cost = otherCost;
      }
      if (finance.note !== undefined) {
        order.finance.note = String(finance.note || "").trim();
      }
      order.finance.total_cost =
        Number(order.finance.material_cost || 0) +
        Number(order.finance.labor_cost || 0) +
        Number(order.finance.accessory_cost || 0) +
        Number(order.finance.other_cost || 0);
      order.finance.expected_profit =
        Number(order.pricing.total_amount || 0) - Number(order.finance.total_cost || 0);
    }

    if (payload.shipping) {
      const shipping = payload.shipping;
      if (shipping.receive_method !== undefined) {
        order.shipping.receive_method = String(shipping.receive_method || "").trim();
      }
      if (shipping.carrier_name !== undefined) {
        order.shipping.carrier_name = sanitizeCarrierName(shipping.carrier_name);
      }
      if (shipping.tracking_code !== undefined) {
        order.shipping.tracking_code = String(shipping.tracking_code || "").trim();
      }
      if (shipping.label_code !== undefined) {
        order.shipping.label_code = String(shipping.label_code || "").trim();
      }
      if (shipping.note !== undefined) {
        order.shipping.note = sanitizeShipmentNote(shipping.note);
      }
      if (shipping.estimated_delivery_at !== undefined) {
        order.shipping.estimated_delivery_at = normalizeDate(shipping.estimated_delivery_at);
      }
      if (shipping.actual_delivery_at !== undefined) {
        const actual = normalizeDate(shipping.actual_delivery_at);
        order.shipping.actual_delivery_at = actual;
        if (actual) {
          order.shipping.delivered_at = actual;
        }
      }
    }

    if (payload.admin_note !== undefined) {
      order.admin_note = String(payload.admin_note || "").trim();
    }
  }

  applyStatusTransition(order, nextStatus, actor = null, note = "", cancelReason = "") {
    const currentStatus = normalizeStatusValue(order.status);
    const rawNextStatus = String(nextStatus || "").trim();
    let normalizedNextStatus = normalizeStatusValue(rawNextStatus);

    if (rawNextStatus === "completed" && currentStatus !== "completed") {
      normalizedNextStatus = "completed";
    }

    if (!normalizedNextStatus || normalizedNextStatus === currentStatus) {
      order.status = currentStatus;
      return;
    }

    const allowed = STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(normalizedNextStatus)) {
      throw ApiError.badRequest(
        `Cannot move tailor order from ${currentStatus} to ${normalizedNextStatus}.`,
      );
    }

    if (
      [
        "sample_confirmed",
        "tailoring",
        "fitting_adjustment",
        "completed",
        "delivered",
      ].includes(
        normalizedNextStatus,
      )
    ) {
      if (!order.product?.title || !order.pricing?.quoted_price) {
        throw ApiError.badRequest(
          "Product setup and a quoted price are required before continuing.",
        );
      }
    }

    if (normalizedNextStatus === "delivered") {
      const depositAmount = Number(order.pricing?.deposit_amount || 0);
      const paidAmount = Number(order.finance?.paid_amount || 0);
      if (depositAmount <= 0 || paidAmount < depositAmount) {
        throw ApiError.badRequest(
          "Deposit payment must be confirmed before confirming delivered.",
        );
      }

      const hasShipmentUpdated = Boolean(order.timeline?.shipment_created_at);
      if (!hasShipmentUpdated) {
        throw ApiError.badRequest(
          "Please update shipment details before confirming delivered.",
        );
      }
    }

    if (normalizedNextStatus === "cancelled") {
      order.cancel_reason = String(cancelReason || "").trim();
    }

    order.timeline = order.timeline || {};
    order.shipping = order.shipping || {};

    const now = new Date();
    if (normalizedNextStatus === "consulted") {
      order.timeline.consulted_at = now;
      order.timeline.quoted_at = order.timeline.quoted_at || now;
    }
    if (normalizedNextStatus === "sample_confirmed") {
      order.timeline.sample_confirmed_at = now;
      order.timeline.order_confirmed_at = order.timeline.order_confirmed_at || now;
    }
    if (normalizedNextStatus === "tailoring") {
      order.timeline.tailoring_started_at = now;
    }
    if (normalizedNextStatus === "fitting_adjustment") {
      order.timeline.fitting_adjustment_at = now;
    }
    if (normalizedNextStatus === "completed") {
      order.timeline.completed_at = now;
    }
    if (normalizedNextStatus === "delivered") {
      order.timeline.delivered_at = now;
      order.shipping.actual_delivery_at = now;
      order.shipping.delivered_at = now;
    }
    if (normalizedNextStatus === "cancelled") {
      order.timeline.cancelled_at = now;
    }

    order.status_history.push({
      from: currentStatus || null,
      to: normalizedNextStatus,
      changed_by: actor?.user_id || actor?._id || null,
      note: String(note || "").trim(),
      changed_at: now,
    });

    order.status = normalizedNextStatus;
  }

  normalizeOrderForMutation(order) {
    order.timeline = order.timeline || {};
    order.shipping = order.shipping || {};

    order.shipping.carrier_name = sanitizeCarrierName(order.shipping.carrier_name);
    order.shipping.note = sanitizeShipmentNote(order.shipping.note);

    const normalizedCurrentStatus = normalizeStatusValue(order.status);
    order.status =
      normalizedCurrentStatus === "completed" && hasDeliveredEvidence(order)
        ? "delivered"
        : normalizedCurrentStatus;

    if (order.timeline.quoted_at && !order.timeline.consulted_at) {
      order.timeline.consulted_at = order.timeline.quoted_at;
    }
    if (order.timeline.order_confirmed_at && !order.timeline.sample_confirmed_at) {
      order.timeline.sample_confirmed_at = order.timeline.order_confirmed_at;
    }
    if (order.timeline.shipment_created_at && !order.timeline.completed_at) {
      order.timeline.completed_at = order.timeline.shipment_created_at;
    }
    if (order.shipping?.delivered_at && !order.timeline.delivered_at) {
      order.timeline.delivered_at = order.shipping.delivered_at;
    }
  }

  normalizeOrderForResponse(order) {
    if (!order) return order;

    const timeline = order.timeline || {};
    const shipping = order.shipping || {};
    let normalizedStatus = normalizeStatusValue(order.status);
    if (
      normalizedStatus === "completed" &&
      (timeline.delivered_at || shipping.actual_delivery_at || shipping.delivered_at)
    ) {
      normalizedStatus = "delivered";
    }

    return {
      ...order,
      status: normalizedStatus,
      timeline: {
        ...timeline,
        consulted_at: timeline.consulted_at || timeline.quoted_at || null,
        sample_confirmed_at:
          timeline.sample_confirmed_at || timeline.order_confirmed_at || null,
        tailoring_started_at: timeline.tailoring_started_at || null,
        fitting_adjustment_at: timeline.fitting_adjustment_at || null,
        completed_at: timeline.completed_at || timeline.shipment_created_at || null,
        delivered_at: timeline.delivered_at || shipping.actual_delivery_at || shipping.delivered_at || null,
        cancelled_at: timeline.cancelled_at || null,
        quoted_at: timeline.quoted_at || null,
        order_confirmed_at: timeline.order_confirmed_at || null,
        shipment_created_at: timeline.shipment_created_at || null,
      },
      shipping: {
        receive_method: shipping.receive_method || "home_delivery",
        carrier_name: sanitizeCarrierName(shipping.carrier_name) || "",
        tracking_code: shipping.tracking_code || "",
        label_code: shipping.label_code || "",
        note: sanitizeShipmentNote(shipping.note) || "",
        created_at: shipping.created_at || null,
        estimated_delivery_at: shipping.estimated_delivery_at || null,
        actual_delivery_at: shipping.actual_delivery_at || shipping.delivered_at || null,
        delivered_at: shipping.delivered_at || shipping.actual_delivery_at || null,
      },
      finance: {
        ...order.finance,
        payment_status: order.finance?.payment_status || "unpaid",
        payment_date: order.finance?.payment_date || null,
        transaction_code: order.finance?.transaction_code || "",
      },
      customer: {
        ...order.customer,
        customer_code: order.customer?.customer_code || "",
        customer_note: order.customer?.customer_note || "",
      },
      product: {
        ...order.product,
        reference_model_code: order.product?.reference_model_code || "",
        base_description: order.product?.base_description || "",
        base_price: Number(order.product?.base_price || 0),
        pattern_note: order.product?.pattern_note || "",
        style_adjustments: order.product?.style_adjustments || "",
        custom_request: order.product?.custom_request || "",
        measurement_note: order.product?.measurement_note || "",
        extra_price: Number(order.product?.extra_price || 0),
        measurements: {
          height: order.product?.measurements?.height ?? null,
          weight: order.product?.measurements?.weight ?? null,
          chest: order.product?.measurements?.chest ?? null,
          waist: order.product?.measurements?.waist ?? null,
          hip: order.product?.measurements?.hip ?? null,
          shoulder: order.product?.measurements?.shoulder ?? null,
          sleeve_length: order.product?.measurements?.sleeve_length ?? null,
          top_length: order.product?.measurements?.top_length ?? null,
          bottom_length: order.product?.measurements?.bottom_length ?? null,
          other_measurements: order.product?.measurements?.other_measurements || "",
        },
        attachments: {
          customer_reference_images:
            order.product?.attachments?.customer_reference_images || [],
          fabric_images: order.product?.attachments?.fabric_images || [],
          final_design_images: order.product?.attachments?.final_design_images || [],
        },
        tailor_note: order.product?.tailor_note || "",
      },
    };
  }
}

export default new TailorOrderService();
