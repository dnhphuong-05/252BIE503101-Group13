import mongoose from "mongoose";
import { generateNextId } from "../../utils/idGenerator.js";

const cartItemSchema = new mongoose.Schema(
  {
    cart_item_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    cart_id: {
      type: String,
      required: true,
      index: true,
      match: [/^CRT\d{6}$/, "Cart ID phải có định dạng CRT000123"],
    },
    product_id: {
      type: Number,
      required: true,
      index: true,
    },
    product_name_snapshot: {
      type: String,
      required: true,
      trim: true,
    },
    thumbnail_snapshot: {
      type: String,
      default: "",
    },
    price_snapshot: {
      type: Number,
      required: true,
      min: 0,
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
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "cart_items",
    versionKey: false,
  },
);

cartItemSchema.pre("validate", async function (next) {
  try {
    if (this.isNew && !this.cart_item_id) {
      this.cart_item_id = await generateNextId(
        this.constructor,
        "cart_item_id",
        "CIT",
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

cartItemSchema.index({ cart_id: 1, created_at: -1 });
cartItemSchema.index({ cart_id: 1, product_id: 1, size: 1, color: 1 });

export default mongoose.model("CartItem", cartItemSchema);
