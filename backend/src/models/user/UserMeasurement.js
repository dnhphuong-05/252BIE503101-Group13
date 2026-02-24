import mongoose from "mongoose";
import { generateNextId } from "../../utils/idGenerator.js";

const userMeasurementSchema = new mongoose.Schema(
  {
    measurement_id: {
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
    neck: { type: Number, default: null },
    shoulder: { type: Number, default: null },
    chest: { type: Number, default: null },
    waist: { type: Number, default: null },
    hip: { type: Number, default: null },
    sleeve: { type: Number, default: null },
    arm: { type: Number, default: null },
    back_length: { type: Number, default: null },
    leg_length: { type: Number, default: null },
    unit: {
      type: String,
      enum: ["cm"],
      default: "cm",
    },
    measured_at: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    collection: "user_measurements",
  },
);

userMeasurementSchema.index({ user_id: 1, measured_at: -1 });

userMeasurementSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.measurement_id) {
      this.measurement_id = await generateNextId(
        this.constructor,
        "measurement_id",
        "MEA",
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("UserMeasurement", userMeasurementSchema);
