import BaseService from "../BaseService.js";
import ApiError from "../../utils/ApiError.js";
import OrderReturn from "../../models/order/OrderReturn.js";
import BuyOrder from "../../models/order/BuyOrder.js";

const STATUS_FLOW = {
  submitted: ["need_more_info", "approved", "closed"],
  need_more_info: ["approved", "closed"],
  approved: ["awaiting_return_shipment", "submitted", "closed"],
  awaiting_return_shipment: ["return_in_transit"],
  return_in_transit: ["received_inspecting"],
  received_inspecting: ["refund_processing", "closed"],
  refund_processing: ["refunded"],
  refunded: ["received_inspecting"],
  closed: ["received_inspecting"],
};

class OrderReturnService extends BaseService {
  constructor() {
    super(OrderReturn);
  }

  async getByReturnId(returnId) {
    const item = await this.model.findOne({ return_id: returnId }).lean();
    if (!item) {
      throw ApiError.notFound("Return request not found");
    }
    return item;
  }

  async createFromOrder(order, payload = {}, actor = null) {
    if (!order) {
      throw ApiError.badRequest("Order is required");
    }
    if (!order.user_id) {
      throw ApiError.badRequest("Order must belong to a user");
    }

    const existing = await this.model
      .findOne({
        order_id: order.order_id,
        status: { $nin: ["closed", "refunded"] },
      })
      .lean();
    if (existing) {
      return existing;
    }

    const created = await this.model.create({
      order_id: order.order_id,
      order_code: order.order_code,
      user_id: order.user_id,
      status: "submitted",
      reason: payload.reason || "",
      customer_note: payload.note || "",
      customer_info: order.customer_info,
      items: (order.items || []).map((item) => ({
        product_id: item.product_id,
        sku: item.sku,
        name: item.name,
        thumbnail: item.thumbnail || "",
        size: item.size || null,
        color: item.color || null,
        price: item.price,
        quantity: item.quantity,
        total_price: item.total_price ?? item.price * item.quantity,
      })),
      total_amount: order.total_amount ?? 0,
      refund: {
        requested_amount: order.total_amount ?? 0,
        approved_amount: order.total_amount ?? 0,
        adjusted_amount: order.total_amount ?? 0,
      },
      status_history: [
        {
          from: null,
          to: "submitted",
          note: payload.note || "Customer submitted return request",
          changed_by: actor?.user_id || actor?._id || null,
          changed_at: new Date(),
        },
      ],
    });

    return created.toObject();
  }

  async updateReturnStatus(returnId, payload = {}, actor = null) {
    const record = await this.model.findOne({ return_id: returnId });
    if (!record) {
      throw ApiError.notFound("Return request not found");
    }

    const nextStatus = payload.status;
    if (nextStatus && nextStatus !== record.status) {
      const allowed = STATUS_FLOW[record.status] || [];
      if (!allowed.includes(nextStatus)) {
        throw ApiError.badRequest(
          `Cannot transition from ${record.status} to ${nextStatus}`,
        );
      }
      record.status_history = record.status_history || [];
      record.status_history.push({
        from: record.status,
        to: nextStatus,
        note: payload.note || "",
        changed_by: actor?.user_id || actor?._id || null,
        changed_at: new Date(),
      });
      record.status = nextStatus;
      if (nextStatus === "closed" && payload.note) {
        record.closed_reason = payload.note;
      }
    } else if (payload.note) {
      record.status_history = record.status_history || [];
      record.status_history.push({
        from: record.status,
        to: record.status,
        note: payload.note,
        changed_by: actor?.user_id || actor?._id || null,
        changed_at: new Date(),
      });
    }

    if (payload.admin_note !== undefined) {
      record.admin_note = payload.admin_note || "";
    }

    if (payload.return_shipping) {
      record.return_shipping = {
        ...(record.return_shipping?.toObject?.() || record.return_shipping || {}),
        ...payload.return_shipping,
      };
      if (payload.return_shipping.tracking_code && !record.return_shipping.created_at) {
        record.return_shipping.created_at = new Date();
      }
    }

    if (payload.refund) {
      record.refund = {
        ...(record.refund?.toObject?.() || record.refund || {}),
        ...payload.refund,
      };
      if (payload.refund.processed_at && !record.refund.processed_at) {
        record.refund.processed_at = payload.refund.processed_at;
      }
    }

    if (record.status === "return_in_transit") {
      record.return_shipping = record.return_shipping || {};
      if (!record.return_shipping.received_label_at) {
        record.return_shipping.received_label_at = new Date();
      }
    }

    if (record.status === "received_inspecting") {
      record.return_shipping = record.return_shipping || {};
      if (!record.return_shipping.received_at) {
        record.return_shipping.received_at = new Date();
      }
    }

    if (record.status === "refunded") {
      record.refund = record.refund || {};
      if (!record.refund.processed_at) {
        record.refund.processed_at = new Date();
      }
    }

    record.updated_at = new Date();
    await record.save();

    await BuyOrder.updateOne(
      { order_id: record.order_id },
      {
        $set: {
          "return_request.status": record.status,
          "return_request.updated_at": new Date(),
        },
      },
    );

    return record.toObject();
  }
}

export default new OrderReturnService();
