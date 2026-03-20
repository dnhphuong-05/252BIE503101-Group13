import mongoose from "mongoose";
import { generateNextId } from "../../utils/idGenerator.js";

const userProfileSchema = new mongoose.Schema(
  {
    profile_id: {
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
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: null,
    },
    birthday: {
      type: Date,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    weight: {
      type: Number,
      default: null,
    },
    size_standard: {
      type: String,
      enum: ["XS", "S", "M", "L", "XL"],
      default: null,
    },
    job_title: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      default: "",
    },
    timezone: {
      type: String,
      trim: true,
      default: "Asia/Bangkok",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "user_profiles",
  },
);

userProfileSchema.index({ full_name: 1 });

userProfileSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.profile_id) {
      this.profile_id = await generateNextId(
        this.constructor,
        "profile_id",
        "PRO",
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("UserProfile", userProfileSchema);
