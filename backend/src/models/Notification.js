import mongoose from "mongoose";
import { generateNextId } from "../utils/idGenerator.js";

const notificationSchema = new mongoose.Schema(
  {
    notification_id: {
      type: String,
      unique: true,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
      match: [/^USR\d{6}$/, "User ID must match USR000123"],
    },
    type: {
      type: String,
      required: true,
      enum: [
        "order_confirmed",
        "order_shipped",
        "order_delivered",
        "order_received",
        "order_cancelled",
        "return_requested",
        "rent_confirmed",
        "rent_out_for_delivery",
        "rent_ongoing",
        "rent_return_requested",
        "rent_return_label_created",
        "rent_return_reminder",
        "rent_return_shipped",
        "rent_return_received",
        "rent_inspected",
        "rent_closed",
        "rent_cancelled",
        "rent_violated",
        "deposit_refunded",
        "contact_received",
        "contact_handled",
      ],
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    entity_type: {
      type: String,
      required: true,
      enum: ["sales_order", "rent_order", "contact"],
      index: true,
    },
    entity_id: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    is_read: {
      type: Boolean,
      default: false,
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: "notifications",
  },
);

notificationSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.notification_id) {
      this.notification_id = await generateNextId(
        this.constructor,
        "notification_id",
        "NTF",
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });

export default mongoose.model("Notification", notificationSchema);
