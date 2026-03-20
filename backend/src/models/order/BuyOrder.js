import mongoose from "mongoose";

const customerInfoSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: [true, "Há» tÃªn lÃ  báº¯t buá»™c"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Sá»‘ Ä‘iá»‡n thoáº¡i lÃ  báº¯t buá»™c"],
      trim: true,
      match: [/^(0|\+84)[0-9]{9,10}$/, "Sá»‘ Ä‘iá»‡n thoáº¡i khÃ´ng há»£p lá»‡"],
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value) =>
          !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Email khÃ´ng há»£p lá»‡",
      },
    },
    address: {
      province: {
        type: String,
        required: [true, "Tá»‰nh/ThÃ nh phá»‘ lÃ  báº¯t buá»™c"],
        trim: true,
      },
      district: {
        type: String,
        trim: true,
        default: "",
      },
      ward: {
        type: String,
        required: [true, "XÃ£/PhÆ°á»ng/Äáº·c khu lÃ  báº¯t buá»™c"],
        trim: true,
      },
      detail: {
        type: String,
        required: [true, "Äá»‹a chá»‰ chi tiáº¿t lÃ  báº¯t buá»™c"],
        trim: true,
      },
    },
  },
  { _id: false },
);

const orderItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: Number,
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      default: "",
    },
    size: {
      type: String,
      default: null,
      trim: true,
    },
    color: {
      type: String,
      default: null,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    total_price: {
      type: Number,
      required: false,
      min: 0,
      default: function () {
        return this.price * this.quantity;
      },
    },
  },
  { _id: false },
);

const buyOrderSchema = new mongoose.Schema(
  {
    order_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: [/^ORD\d{10}$/, "Order ID pháº£i cÃ³ Ä‘á»‹nh dáº¡ng ORD2402030001"],
    },
    order_code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: [
        /^PHUC-BUY-\d{10}$/,
        "Order code pháº£i cÃ³ Ä‘á»‹nh dáº¡ng PHUC-BUY-2402030001",
      ],
    },
    user_id: {
      type: String,
      default: null,
      index: true,
      match: [/^USR\d{6}$/, "User ID pháº£i cÃ³ Ä‘á»‹nh dáº¡ng USR000123"],
    },
    guest_id: {
      type: String,
      default: null,
      index: true,
      match: [/^GST\d{6}$/, "Guest ID pháº£i cÃ³ Ä‘á»‹nh dáº¡ng GST000456"],
    },
    customer_info: {
      type: customerInfoSchema,
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "ÄÆ¡n hÃ ng pháº£i cÃ³ Ã­t nháº¥t 1 sáº£n pháº©m",
      },
    },
    subtotal_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    shipping_fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    payment_method: {
      type: String,
      required: true,
      enum: {
        values: ["cod", "vnpay", "momo", "bank_transfer"],
        message: "PhÆ°Æ¡ng thá»©c thanh toÃ¡n khÃ´ng há»£p lá»‡",
      },
      index: true,
    },
    payment_status: {
      type: String,
      default: "unpaid",
      enum: {
        values: ["unpaid", "partial", "paid", "failed", "refunded"],
        message: "Tráº¡ng thÃ¡i thanh toÃ¡n khÃ´ng há»£p lá»‡",
      },
      index: true,
    },
    payment_transaction_code: {
      type: String,
      default: null,
      trim: true,
    },
    paid_at: {
      type: Date,
      default: null,
    },
    refund_status: {
      type: String,
      default: "none",
      enum: {
        values: ["none", "pending", "refunded"],
        message: "Trang thai hoan tien khong hop le",
      },
    },
    order_status: {
      type: String,
      default: "pending",
      enum: {
        values: [
          "pending",
          "confirmed",
          "processing",
          "shipping",
          "completed",
          "cancelled",
        ],
        message: "Tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng khÃ´ng há»£p lá»‡",
      },
      index: true,
    },
    shipping_provider: {
      type: String,
      default: null,
      trim: true,
    },
    shipping_status: {
      type: String,
      default: "pending",
      enum: {
        values: ["pending", "ready_to_ship", "shipped", "delivered", "delivery_failed"],
        message: "Trạng thái vận chuyển không hợp lệ",
      },
      index: true,
    },
    shipping_status_detail: {
      type: String,
      default: null,
      trim: true,
    },
    shipping_method: {
      type: String,
      default: null,
      trim: true,
    },
    tracking_code: {
      type: String,
      default: null,
      trim: true,
    },
    tracking_created_at: {
      type: Date,
      default: null,
    },
    estimated_delivery_at: {
      type: Date,
      default: null,
    },
    shipped_at: {
      type: Date,
      default: null,
    },
    delivered_at: {
      type: Date,
      default: null,
    },
    customer_received_at: {
      type: Date,
      default: null,
    },
    contact_channel: {
      type: String,
      default: null,
      trim: true,
      enum: ["zalo", "phone", "web"],
    },
    contacted_at: {
      type: Date,
      default: null,
    },
    contacted_by: {
      type: String,
      default: null,
      trim: true,
    },
    return_request: {
      return_id: { type: String, default: null },
      status: {
        type: String,
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
        default: null,
      },
      note: { type: String, default: "", trim: true },
      requested_at: { type: Date, default: null },
      updated_at: { type: Date, default: null },
    },
    admin_note: {
      type: String,
      default: "",
      trim: true,
    },
    cancel_reason: {
      type: String,
      default: "",
      trim: true,
    },
    cancelled_at: {
      type: Date,
      default: null,
    },
    cancelled_by: {
      type: String,
      default: null,
      trim: true,
    },
    confirmed_at: {
      type: Date,
      default: null,
    },
    confirmed_by: {
      type: String,
      default: null,
      trim: true,
    },
    processing_at: {
      type: Date,
      default: null,
    },
    processing_by: {
      type: String,
      default: null,
      trim: true,
    },
    status_history: [
      {
        from: { type: String },
        to: { type: String },
        changed_by: { type: String, default: null },
        note: { type: String, default: "" },
        changed_at: { type: Date, default: Date.now },
      },
    ],
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: "buy_orders",
  },
);

// Middleware to update updated_at
buyOrderSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

// Validation: Pháº£i cÃ³ user_id HOáº¶C guest_id
buyOrderSchema.pre("save", function (next) {
  if (!this.user_id && !this.guest_id) {
    next(
      new Error(
        "ÄÆ¡n hÃ ng pháº£i cÃ³ user_id (Ä‘Ã£ Ä‘Äƒng nháº­p) hoáº·c guest_id (khÃ¡ch)",
      ),
    );
  }
  next();
});

// Indexes
buyOrderSchema.index({ created_at: -1 });
buyOrderSchema.index({ order_status: 1, created_at: -1 });

export default mongoose.model("BuyOrder", buyOrderSchema);
