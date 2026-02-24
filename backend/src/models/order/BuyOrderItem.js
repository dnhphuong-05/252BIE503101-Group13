import mongoose from "mongoose";

const buyOrderItemSchema = new mongoose.Schema(
  {
    order_item_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      match: [/^ITEM\d{10}$/, "Order Item ID phải có định dạng ITEM2402030001"],
    },
    order_id: {
      type: String,
      required: true,
      index: true,
      match: [/^ORD\d{10}$/, "Order ID phải có định dạng ORD2402030001"],
    },
    product_id: {
      type: Number,
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
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
      min: [0, "Giá sản phẩm không được âm"],
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Số lượng phải ít nhất là 1"],
    },
    total_price: {
      type: Number,
      required: true,
      min: [0, "Tổng giá không được âm"],
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: "order_items",
  }
);

// Middleware để tự động tính total_price
buyOrderItemSchema.pre("save", function (next) {
  if (this.price && this.quantity) {
    this.total_price = this.price * this.quantity;
  }
  next();
});

export default mongoose.model("BuyOrderItem", buyOrderItemSchema);
