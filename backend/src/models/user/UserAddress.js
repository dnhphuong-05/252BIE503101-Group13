import mongoose from "mongoose";
import { generateNextId } from "../../utils/idGenerator.js";

const userAddressSchema = new mongoose.Schema(
  {
    address_id: {
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
    receiver_name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    province: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
      default: "",
    },
    ward: {
      type: String,
      required: true,
      trim: true,
    },
    address_detail: {
      type: String,
      required: true,
      trim: true,
    },
    note: {
      type: String,
      default: null,
    },
    is_default: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "user_addresses",
  },
);

userAddressSchema.index({ user_id: 1, is_default: 1 });

userAddressSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.address_id) {
      this.address_id = await generateNextId(
        this.constructor,
        "address_id",
        "ADR",
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("UserAddress", userAddressSchema);
