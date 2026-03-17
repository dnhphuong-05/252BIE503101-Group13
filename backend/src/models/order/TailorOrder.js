import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema(
  {
    from: { type: String, default: null },
    to: { type: String, required: true, trim: true },
    changed_by: { type: String, default: null, trim: true },
    note: { type: String, default: "", trim: true },
    changed_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const tailorOrderSchema = new mongoose.Schema(
  {
    tailor_order_id: {
      type: String,
      unique: true,
      index: true,
    },
    source_contact_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    source_message: {
      type: String,
      default: "",
      trim: true,
    },
    customer: {
      customer_code: { type: String, default: "", trim: true },
      full_name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      zalo_contact: { type: String, default: "", trim: true },
      address: { type: String, default: "", trim: true },
      customer_note: { type: String, default: "", trim: true },
      user_id: { type: String, default: null, trim: true },
      guest_id: { type: String, default: null, trim: true },
    },
    communication: {
      channel: {
        type: String,
        enum: ["zalo", "phone", "web"],
        default: "zalo",
      },
      handled_by: { type: String, default: null, trim: true },
      customer_confirmed_at: { type: Date, default: Date.now },
      note: { type: String, default: "", trim: true },
    },
    product: {
      reference_product_id: { type: Number, default: null },
      reference_model_code: { type: String, default: "", trim: true },
      reference_product_name: { type: String, default: "", trim: true },
      reference_sku: { type: String, default: "", trim: true },
      title: { type: String, default: "", trim: true },
      category_name: { type: String, default: "", trim: true },
      base_description: { type: String, default: "", trim: true },
      base_price: { type: Number, default: 0, min: 0 },
      era: { type: String, default: "", trim: true },
      material: { type: String, default: "", trim: true },
      craftsmanship: { type: String, default: "", trim: true },
      color_palette: { type: String, default: "", trim: true },
      pattern_note: { type: String, default: "", trim: true },
      style_adjustments: { type: String, default: "", trim: true },
      custom_request: { type: String, default: "", trim: true },
      size_note: { type: String, default: "", trim: true },
      measurement_note: { type: String, default: "", trim: true },
      extra_price: { type: Number, default: 0, min: 0 },
      quantity: { type: Number, default: 1, min: 1 },
      accessories: { type: String, default: "", trim: true },
      customization_note: { type: String, default: "", trim: true },
      thumbnail: { type: String, default: "", trim: true },
      measurements: {
        height: { type: Number, default: null },
        weight: { type: Number, default: null },
        chest: { type: Number, default: null },
        waist: { type: Number, default: null },
        hip: { type: Number, default: null },
        shoulder: { type: Number, default: null },
        sleeve_length: { type: Number, default: null },
        top_length: { type: Number, default: null },
        bottom_length: { type: Number, default: null },
        other_measurements: { type: String, default: "", trim: true },
      },
      attachments: {
        customer_reference_images: { type: [String], default: [] },
        fabric_images: { type: [String], default: [] },
        final_design_images: { type: [String], default: [] },
      },
      tailor_note: { type: String, default: "", trim: true },
    },
    pricing: {
      quoted_price: { type: Number, default: 0, min: 0 },
      deposit_amount: { type: Number, default: 0, min: 0 },
      shipping_fee: { type: Number, default: 0, min: 0 },
      total_amount: { type: Number, default: 0, min: 0 },
    },
    finance: {
      payment_method: {
        type: String,
        enum: ["cash", "bank_transfer", "zalo_pay", "other"],
        default: "bank_transfer",
      },
      payment_status: {
        type: String,
        enum: ["unpaid", "deposited", "partial", "paid"],
        default: "unpaid",
      },
      paid_amount: { type: Number, default: 0, min: 0 },
      payment_date: { type: Date, default: null },
      transaction_code: { type: String, default: "", trim: true },
      material_cost: { type: Number, default: 0, min: 0 },
      labor_cost: { type: Number, default: 0, min: 0 },
      accessory_cost: { type: Number, default: 0, min: 0 },
      other_cost: { type: Number, default: 0, min: 0 },
      total_cost: { type: Number, default: 0, min: 0 },
      expected_profit: { type: Number, default: 0 },
      note: { type: String, default: "", trim: true },
    },
    timeline: {
      consulted_at: { type: Date, default: null },
      sample_confirmed_at: { type: Date, default: null },
      tailoring_started_at: { type: Date, default: null },
      fitting_adjustment_at: { type: Date, default: null },
      completed_at: { type: Date, default: null },
      delivered_at: { type: Date, default: null },
      cancelled_at: { type: Date, default: null },
      // Legacy fields kept for compatibility with older records.
      quoted_at: { type: Date, default: null },
      order_confirmed_at: { type: Date, default: null },
      shipment_created_at: { type: Date, default: null },
    },
    shipping: {
      receive_method: {
        type: String,
        enum: ["pickup_at_store", "home_delivery"],
        default: "home_delivery",
      },
      carrier_name: { type: String, default: "", trim: true },
      tracking_code: { type: String, default: "", trim: true },
      label_code: { type: String, default: "", trim: true },
      note: { type: String, default: "", trim: true },
      created_at: { type: Date, default: null },
      estimated_delivery_at: { type: Date, default: null },
      actual_delivery_at: { type: Date, default: null },
      delivered_at: { type: Date, default: null },
    },
    status: {
      type: String,
      enum: [
        "created",
        "consulted",
        "sample_confirmed",
        "tailoring",
        "fitting_adjustment",
        "completed",
        "delivered",
        "cancelled",
        // Legacy statuses for backward compatibility.
        "confirmed_request",
        "quoted",
        "order_confirmed",
        "shipping",
      ],
      default: "created",
      index: true,
    },
    cancel_reason: {
      type: String,
      default: "",
      trim: true,
    },
    admin_note: {
      type: String,
      default: "",
      trim: true,
    },
    status_history: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "tailor_orders",
  },
);

tailorOrderSchema.index({ status: 1, created_at: -1 });
tailorOrderSchema.index({ "customer.user_id": 1, created_at: -1 });
tailorOrderSchema.index({ "customer.guest_id": 1, created_at: -1 });
tailorOrderSchema.index({ "customer.phone": 1 });
tailorOrderSchema.index({ "customer.email": 1 });

tailorOrderSchema.pre("save", async function (next) {
  this.pricing = this.pricing || {};
  this.finance = this.finance || {};

  const quotedPrice = Number(this.pricing?.quoted_price || 0);
  const shippingFee = Number(this.pricing?.shipping_fee || 0);
  this.pricing.total_amount = Math.max(0, quotedPrice + shippingFee);

  const materialCost = Number(this.finance?.material_cost || 0);
  const laborCost = Number(this.finance?.labor_cost || 0);
  const accessoryCost = Number(this.finance?.accessory_cost || 0);
  const otherCost = Number(this.finance?.other_cost || 0);
  this.finance.total_cost = Math.max(0, materialCost + laborCost + accessoryCost + otherCost);
  this.finance.expected_profit = this.pricing.total_amount - this.finance.total_cost;

  const paidAmount = Number(this.finance?.paid_amount || 0);
  const depositAmount = Number(this.pricing?.deposit_amount || 0);
  const totalAmount = Number(this.pricing?.total_amount || 0);
  if (totalAmount <= 0 || paidAmount <= 0) {
    this.finance.payment_status = "unpaid";
  } else if (paidAmount >= totalAmount) {
    this.finance.payment_status = "paid";
  } else if (paidAmount >= depositAmount && depositAmount > 0) {
    this.finance.payment_status = paidAmount > depositAmount ? "partial" : "deposited";
  } else {
    this.finance.payment_status = "partial";
  }

  if (!this.tailor_order_id) {
    try {
      const lastOrder = await this.constructor
        .findOne()
        .sort({ tailor_order_id: -1 })
        .select("tailor_order_id")
        .lean();

      const lastNumber = Number(
        String(lastOrder?.tailor_order_id || "")
          .replace(/\D/g, "")
          .trim(),
      );
      const nextNumber = Number.isFinite(lastNumber) && lastNumber > 0 ? lastNumber + 1 : 1;
      this.tailor_order_id = `TLR${String(nextNumber).padStart(6, "0")}`;
    } catch (error) {
      return next(error);
    }
  }

  next();
});

export default mongoose.model("TailorOrder", tailorOrderSchema);
