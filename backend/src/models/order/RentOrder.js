import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    province: { type: String, trim: true, default: "" },
    district: { type: String, trim: true, default: "" },
    ward: { type: String, trim: true, default: "" },
    address_detail: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const customerInfoSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^(0|\+84)[0-9]{9,10}$/, "Invalid phone number"],
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Invalid email",
      },
    },
    delivery_method: {
      type: String,
      required: true,
      enum: ["ship", "pickup"],
    },
    address: {
      type: addressSchema,
      default: null,
    },
  },
  { _id: false },
);

const rentItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    sku: { type: String, required: true, trim: true },
    name_snapshot: { type: String, required: true, trim: true },
    thumbnail_snapshot: { type: String, default: "" },
    rent_price_per_day: { type: Number, required: true, min: 0 },
    deposit_amount: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    condition_out: {
      photos: { type: [String], default: [] },
      note: { type: String, default: "", trim: true },
    },
    condition_in: {
      photos: { type: [String], default: [] },
      note: { type: String, default: "", trim: true },
    },
  },
  { _id: false },
);

const rentalPeriodSchema = new mongoose.Schema(
  {
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    days: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const pricingSchema = new mongoose.Schema(
  {
    rent_fee_expected: { type: Number, required: true, min: 0 },
    deposit_required: { type: Number, required: true, min: 0 },
    shipping_fee: { type: Number, default: 0, min: 0 },
    discount_amount: { type: Number, default: 0, min: 0 },
    total_due_today: { type: Number, required: true, min: 0 },
    refund_expected: { type: Number, default: 0, min: 0 },
    late_fee: { type: Number, default: 0, min: 0 },
    damage_fee: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    payment_method: {
      type: String,
      required: true,
      enum: ["cod", "bank", "momo", "vnpay"],
      index: true,
    },
    deposit_paid: { type: Number, default: 0, min: 0 },
    payment_status: {
      type: String,
      default: "unpaid",
      enum: ["unpaid", "partial", "paid"],
      index: true,
    },
    paid_at: { type: Date, default: null },
  },
  { _id: false },
);

const settlementSchema = new mongoose.Schema(
  {
    rent_fee_actual: { type: Number, default: null, min: 0 },
    late_fee: { type: Number, default: null, min: 0 },
    damage_fee: { type: Number, default: null, min: 0 },
    cleaning_fee: { type: Number, default: null, min: 0 },
    penalty_fee: { type: Number, default: null, min: 0 },
    penalty_total: { type: Number, default: null, min: 0 },
    refund_expected: { type: Number, default: null, min: 0 },
    refund_paid: { type: Number, default: null, min: 0 },
    refund_amount: { type: Number, default: null, min: 0 },
    refund_receipt_url: { type: String, default: null, trim: true },
    refund_note: { type: String, default: null, trim: true },
    extra_charge: { type: Number, default: null, min: 0 },
    settled_at: { type: Date, default: null },
    refunded_at: { type: Date, default: null },
    settlement_status: {
      type: String,
      default: null,
      enum: ["pending", "refunded", "extra_paid", "no_refund", null],
    },
  },
  { _id: false },
);

const shippingSchema = new mongoose.Schema(
  {
    shipping_provider: { type: String, default: null, trim: true },
    tracking_code: { type: String, default: null, trim: true },
    shipping_status: {
      type: String,
      default: null,
      enum: ["not_shipped", "shipping", "delivered", null],
    },
  },
  { _id: false },
);

const shippingOutSchema = new mongoose.Schema(
  {
    provider: { type: String, default: null, trim: true },
    tracking_code: { type: String, default: null, trim: true },
    shipped_at: { type: Date, default: null },
    delivered_at: { type: Date, default: null },
  },
  { _id: false },
);

const shippingBackSchema = new mongoose.Schema(
  {
    provider: { type: String, default: null, trim: true },
    tracking_code: { type: String, default: null, trim: true },
    created_by_shop: { type: Boolean, default: false },
    shipped_at: { type: Date, default: null },
    delivered_at: { type: Date, default: null },
  },
  { _id: false },
);

const returnRequestSchema = new mongoose.Schema(
  {
    requested_at: { type: Date, default: null },
    note: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const rentOrderSchema = new mongoose.Schema(
  {
    rent_order_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: [/^RNT\d{10}$/, "Invalid rent order id format"],
    },
    rent_order_code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: [/^PHUC-RNT-\d{10}$/, "Invalid rent order code format"],
    },
    user_id: {
      type: String,
      default: null,
      index: true,
      match: [/^USR\d{6}$/, "Invalid user id format"],
    },
    guest_id: {
      type: String,
      default: null,
      index: true,
      match: [/^GST\d{6}$/, "Invalid guest id format"],
    },
    customer_info: {
      type: customerInfoSchema,
      required: true,
    },
    item: {
      type: rentItemSchema,
      required: true,
    },
    rental_period: {
      type: rentalPeriodSchema,
      required: true,
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
    payment: {
      type: paymentSchema,
      required: true,
    },
    rent_status: {
      type: String,
      default: "booked",
      enum: [
        "booked",
        "ongoing",
        "return_requested",
        "returning",
        "returned",
        "closed",
        "cancelled",
        "violated",
      ],
      index: true,
    },
    settlement: {
      type: settlementSchema,
      default: null,
    },
    shipping: {
      type: shippingSchema,
      default: null,
    },
    shipping_out: { type: shippingOutSchema, default: null },
    shipping_back: { type: shippingBackSchema, default: null },
    return_request: { type: returnRequestSchema, default: null },
    contact_channel: {
      type: String,
      default: null,
      trim: true,
      enum: ["zalo", "phone", "web"],
    },
    contacted_at: { type: Date, default: null },
    contacted_by: { type: String, default: null, trim: true },
    confirmed_at: { type: Date, default: null },
    confirmed_by: { type: String, default: null, trim: true },
    admin_note: { type: String, default: "", trim: true },
    cancel_reason: { type: String, default: "", trim: true },
    cancelled_at: { type: Date, default: null },
    cancelled_by: { type: String, default: null, trim: true },
    status_history: [
      {
        from: { type: String },
        to: { type: String },
        changed_by: { type: String, default: null },
        note: { type: String, default: "" },
        changed_at: { type: Date, default: Date.now },
      },
    ],
    created_at: { type: Date, default: Date.now, index: true },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: "rent_orders",
  },
);

rentOrderSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

rentOrderSchema.pre("validate", function (next) {
  if (!this.user_id && !this.guest_id) {
    return next(new Error("Rent order requires user_id or guest_id"));
  }
  if (this.customer_info?.delivery_method === "ship" && !this.customer_info.address) {
    return next(new Error("Shipping address is required for delivery"));
  }
  return next();
});

rentOrderSchema.index({ rent_status: 1, created_at: -1 });

export default mongoose.model("RentOrder", rentOrderSchema);
