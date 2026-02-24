import mongoose from 'mongoose';

const PRODUCT_REVIEWS_COLLECTION =
  process.env.PRODUCT_REVIEWS_COLLECTION || 'products_reviews';

const productReviewSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    product_id: {
      type: Number,
      required: true,
      index: true,
    },
    product_name: {
      type: String,
      required: true,
    },
    user_name: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: '',
    },
    created_at: {
      type: String,
      default: () => new Date().toISOString(),
    },
    helpful_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    verified_purchase: {
      type: Boolean,
      default: false,
    },
    images: [String],
    admin_reply: {
      reply_text: { type: String, default: "" },
      replied_by: {
        admin_id: { type: String, default: "" },
        full_name: { type: String, default: "" },
      },
      created_at: { type: String, default: "" },
      updated_at: { type: String, default: "" },
      is_deleted: { type: Boolean, default: false },
    },
    seller_response: {
      content: { type: String, default: "" },
      responded_at: { type: String, default: "" },
      responder_id: { type: String, default: "" },
      responder_name: { type: String, default: "" },
      responder_role: { type: String, default: "" },
    },
  },
  {
    collection: PRODUCT_REVIEWS_COLLECTION,
    versionKey: false,
    strict: false,
  }
);

// Indexes
productReviewSchema.index({ product_id: 1, created_at: -1 });
productReviewSchema.index({ rating: -1 });

export default mongoose.model('ProductReview', productReviewSchema);
