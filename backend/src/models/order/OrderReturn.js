import mongoose from "mongoose";
import { generateNextId } from "../../utils/idGenerator.js";

const addressSchema = new mongoose.Schema(
  {
    province: { type: String, trim: true },
    district: { type: String, trim: true, default: "" },
    ward: { type: String, trim: true },
    detail: { type: String, trim: true },
    address_detail: { type: String, trim: true },
  },
  { _id: false },
);

const customerInfoSchema = new mongoose.Schema(
  {
    full_name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: addressSchema,
  },
  { _id: false },
);

const returnItemSchema = new mongoose.Schema(
  {
    product_id: { type: Number, required: true },
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    thumbnail: { type: String, default: "" },
    size: { type: String, default: null, trim: true },
    color: { type: String, default: null, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    total_price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    from: { type: String },
    to: { type: String },
    note: { type: String, default: "" },
    changed_by: { type: String, default: null },
    changed_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const returnShippingSchema = new mongoose.Schema(
  {
    provider: { type: String, trim: true, default: null },
    tracking_code: { type: String, trim: true, default: null },
    label_code: { type: String, trim: true, default: null },
    created_at: { type: Date, default: null },
    received_label_at: { type: Date, default: null },
    shipped_at: { type: Date, default: null },
    received_at: { type: Date, default: null },
  },
  { _id: false },
);

const refundSchema = new mongoose.Schema(
  {
    requested_amount: { type: Number, default: 0, min: 0 },
    approved_amount: { type: Number, default: 0, min: 0 },
    adjusted_amount: { type: Number, default: 0, min: 0 },
    method: { type: String, trim: true, default: null },
    note: { type: String, trim: true, default: "" },
    processed_at: { type: Date, default: null },
    receipt_url: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const orderReturnSchema = new mongoose.Schema(
  {
    return_id: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    order_id: {
      type: String,
      required: true,
      index: true,
    },
    order_code: {
      type: String,
      required: true,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        "submitted",
        "need_more_info",
        "approved",
        "awaiting_return_shipment",
        "return_in_transit",
        "received_inspecting",
        "refund_processing",
        "refunded",
        "closed",
      ],
      index: true,
    },
    reason: { type: String, trim: true, default: "" },
    customer_note: { type: String, trim: true, default: "" },
    admin_note: { type: String, trim: true, default: "" },
    closed_reason: { type: String, trim: true, default: "" },
    customer_info: customerInfoSchema,
    items: { type: [returnItemSchema], default: [] },
    total_amount: { type: Number, default: 0, min: 0 },
    return_shipping: { type: returnShippingSchema, default: null },
    refund: { type: refundSchema, default: null },
    status_history: { type: [statusHistorySchema], default: [] },
    requested_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "order_returns",
  },
);

orderReturnSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.return_id) {
      this.return_id = await generateNextId(this.constructor, "return_id", "RET");
    }
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("OrderReturn", orderReturnSchema);
