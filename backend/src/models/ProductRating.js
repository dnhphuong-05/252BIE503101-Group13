import mongoose from 'mongoose';

const PRODUCT_RATINGS_COLLECTION =
  process.env.PRODUCT_RATINGS_COLLECTION || 'product_ratings';

const productRatingSchema = new mongoose.Schema(
  {
    product_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    product_name: {
      type: String,
      required: true,
    },
    rating_average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    rating_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating_distribution: {
      '5_star': { type: Number, default: 0 },
      '4_star': { type: Number, default: 0 },
      '3_star': { type: Number, default: 0 },
      '2_star': { type: Number, default: 0 },
      '1_star': { type: Number, default: 0 },
    },
  },
  {
    collection: PRODUCT_RATINGS_COLLECTION,
    versionKey: false,
    strict: false,
  }
);

export default mongoose.model('ProductRating', productRatingSchema);
