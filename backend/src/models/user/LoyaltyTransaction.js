import mongoose from "mongoose";
import { generateNextId } from "../../utils/idGenerator.js";

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    txn_id: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["earn", "spend", "adjust"],
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      default: "",
    },
    ref_type: {
      type: String,
      enum: ["order", "admin"],
      default: null,
    },
    ref_id: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    collection: "loyalty_transactions",
  },
);

loyaltyTransactionSchema.index({ user_id: 1, created_at: -1 });

loyaltyTransactionSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.txn_id) {
      this.txn_id = await generateNextId(this.constructor, "txn_id", "LTX");
    }
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("LoyaltyTransaction", loyaltyTransactionSchema);
