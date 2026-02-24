import mongoose from "mongoose";
import { generateNextId } from "../../utils/idGenerator.js";

const cartSchema = new mongoose.Schema(
  {
    cart_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
      match: [/^USR\d{6}$/, "User ID phải có định dạng USR000123"],
    },
    status: {
      type: String,
      enum: ["active", "checked_out"],
      default: "active",
      index: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "carts",
    versionKey: false,
  },
);

cartSchema.pre("validate", async function (next) {
  try {
    if (this.isNew && !this.cart_id) {
      this.cart_id = await generateNextId(this.constructor, "cart_id", "CRT");
    }
    this.updated_at = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

cartSchema.index({ user_id: 1, status: 1, updated_at: -1 });

export default mongoose.model("Cart", cartSchema);
