import mongoose from "mongoose";

const userAdminSettingSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email_notifications: {
      type: Boolean,
      default: true,
    },
    order_notifications: {
      type: Boolean,
      default: true,
    },
    return_notifications: {
      type: Boolean,
      default: true,
    },
    contact_notifications: {
      type: Boolean,
      default: true,
    },
    compact_table: {
      type: Boolean,
      default: false,
    },
    reduce_motion: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      trim: true,
      default: "en",
    },
    timezone: {
      type: String,
      trim: true,
      default: "Asia/Bangkok",
    },
    start_page: {
      type: String,
      trim: true,
      default: "dashboard",
    },
    auto_refresh_seconds: {
      type: Number,
      min: 15,
      max: 300,
      default: 45,
    },
    enable_two_factor: {
      type: Boolean,
      default: false,
    },
    session_timeout: {
      type: String,
      trim: true,
      default: "30 minutes",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "user_admin_settings",
  },
);

export default mongoose.model("UserAdminSetting", userAdminSettingSchema);
