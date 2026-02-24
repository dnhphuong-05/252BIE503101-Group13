import mongoose from "mongoose";

const userReviewSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    productId: {
      type: Number,
      required: true,
      index: true,
    },
    variantId: {
      type: Number,
      default: null,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    content: {
      type: String,
      required: true,
    },
    images: [String],
    helpful: {
      type: Number,
      default: 0,
    },
    not_helpful: {
      type: Number,
      default: 0,
    },
    verified_purchase: {
      type: Boolean,
      default: true,
    },
    seller_response: {
      content: String,
      responded_at: Date,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: "users_reviews",
  },
);

// Indexes
userReviewSchema.index({ productId: 1, status: 1 });
userReviewSchema.index({ customerId: 1 });
userReviewSchema.index({ created_at: -1 });

export default mongoose.model("UserReview", userReviewSchema);
