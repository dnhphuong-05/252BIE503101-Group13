import mongoose from "mongoose";
import { generateNextId } from "../../utils/idGenerator.js";

const userLoyaltySchema = new mongoose.Schema(
  {
    loyalty_id: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    total_points: {
      type: Number,
      default: 0,
      min: 0,
    },
    tier_level: {
      type: Number,
      default: 1,
      min: 1,
      max: 3,
    },
    tier_name: {
      type: String,
      default: "Classic",
      trim: true,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: "updated_at" },
    collection: "user_loyalty",
  },
);

userLoyaltySchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.loyalty_id) {
      this.loyalty_id = await generateNextId(
        this.constructor,
        "loyalty_id",
        "LOY",
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("UserLoyalty", userLoyaltySchema);
