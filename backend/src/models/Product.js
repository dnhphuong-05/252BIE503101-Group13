import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    product_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      default: "",
    },
    short_description: {
      type: String,
      default: "",
    },
    category_id: {
      type: Number,
      required: true,
      index: true,
    },
    category_name: {
      type: String,
      required: true,
    },
    era: {
      type: String,
      default: "",
    },
    material: {
      type: String,
      default: "",
    },
    origin: {
      type: String,
      default: "Viá»‡t Nam",
    },
    craftsmanship: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["Nam", "Ná»¯", "Unisex"],
      default: "Unisex",
    },
    price_buy: {
      type: Number,
      required: true,
      min: 0,
    },
    price_rent: {
      type: Number,
      default: 0,
      min: 0,
    },
    deposit_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    price_sale: {
      type: Number,
      default: null,
      min: 0,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    images: [String],
    gallery: [String],
    attributes: {
      colors: [String],
      sizes: [String],
      features: [String],
    },
    categories: [String],
    tags: [String],
    stock_status: {
      type: String,
      enum: ["in_stock", "out_of_stock", "on_order"],
      default: "in_stock",
      index: true,
    },
    stock_quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    tailor_available: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
      index: true,
    },
    view_count: {
      type: Number,
      default: 0,
      min: 0,
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
    sold_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    created_at: {
      type: String,
      default: () => new Date().toISOString(),
    },
    updated_at: {
      type: String,
      default: () => new Date().toISOString(),
    },
    meta: {
      og_image: String,
      og_description: String,
    },
  },
  {
    collection: "products",
    versionKey: false,
    strict: false,
  },
);

// Text index for search
productSchema.index({ name: "text", description: "text", tags: "text" });

// Compound indexes
productSchema.index({ category_id: 1, status: 1 });
productSchema.index({ price_buy: 1 });
productSchema.index({ rating_average: -1 });
productSchema.index({ view_count: -1 });

export default mongoose.model("Product", productSchema);
