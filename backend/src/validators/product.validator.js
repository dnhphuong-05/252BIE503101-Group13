import Joi from "joi";

/**
 * Product validation schemas
 */

export const getProductsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(12),
  sortBy: Joi.string()
    .valid("created_at", "name", "price_buy", "rating_average", "sold_count", "views")
    .default("created_at"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  search: Joi.string().trim().allow("").max(200),
  category: Joi.string().trim().allow(""),
  category_id: Joi.number().integer(),
  minPrice: Joi.number().min(0).default(0),
  maxPrice: Joi.number().min(0).default(999999999),
  status: Joi.string().valid("active", "inactive", "draft", "all").default("active"),
  colors: Joi.string().trim().allow(""),
  sizes: Joi.string().trim().allow(""),
  gender: Joi.string()
    .valid("male", "female", "unisex", "Nam", "Nữ", "Nu", "Unisex", "nam", "nữ", "nu")
    .allow(""),
});

export const getProductByIdSchema = Joi.object({
  id: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .required()
    .messages({
      "any.required": "Product ID is required",
      "alternatives.match": "Invalid product ID",
    }),
});

export const createProductSchema = Joi.object({
  product_id: Joi.number().integer().min(1),
  name: Joi.string().required().trim().min(3).max(200),
  slug: Joi.string().trim().allow(""),
  sku: Joi.string().trim().allow(""),
  description: Joi.string().allow("").max(5000),
  short_description: Joi.string().allow("").max(1000),
  category_id: Joi.number().integer(),
  category_name: Joi.string().trim().allow(""),
  category: Joi.string().trim().allow(""),
  price_buy: Joi.number().min(0),
  price_sale: Joi.number().min(0).allow(null),
  price_sell: Joi.number().min(0).allow(null),
  salePrice: Joi.number().min(0).allow(null),
  price_rent: Joi.number().min(0),
  rentPrice: Joi.number().min(0),
  deposit_amount: Joi.number().min(0),
  deposit: Joi.number().min(0),
  stock_quantity: Joi.number().integer().min(0),
  stock: Joi.number().integer().min(0),
  status: Joi.string()
    .valid("active", "inactive", "draft", "published")
    .default("draft"),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string().trim()), Joi.string().allow("")),
  attributes: Joi.object({
    sizes: Joi.array().items(Joi.string().trim()),
    colors: Joi.array().items(Joi.string().trim()),
    features: Joi.array().items(Joi.string().trim()),
  }).allow(null),
  features: Joi.string().allow(""),
  size: Joi.string().allow(""),
  color: Joi.string().allow(""),
  era: Joi.string().allow(""),
  material: Joi.string().allow(""),
  craftsmanship: Joi.string().allow(""),
  gender: Joi.string()
    .valid("male", "female", "unisex", "Nam", "Nữ", "Nu", "Unisex", "nam", "nữ", "nu")
    .allow(""),
  origin: Joi.string().allow(""),
  thumbnail: Joi.string().allow(""),
  images: Joi.array().items(Joi.string().allow("")),
  gallery: Joi.array().items(Joi.string().allow("")),
  tailor_available: Joi.boolean(),
  stock_status: Joi.string().valid("in_stock", "out_of_stock", "on_order"),
})
  .or("price_buy", "salePrice")
  .or("category_name", "category")
  .unknown(true);

export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200),
  slug: Joi.string().trim().allow(""),
  sku: Joi.string().trim().allow(""),
  description: Joi.string().allow("").max(5000),
  short_description: Joi.string().allow("").max(1000),
  category_id: Joi.number().integer(),
  category_name: Joi.string().trim().allow(""),
  category: Joi.string().trim().allow(""),
  price_buy: Joi.number().min(0),
  price_sale: Joi.number().min(0).allow(null),
  price_sell: Joi.number().min(0).allow(null),
  salePrice: Joi.number().min(0).allow(null),
  price_rent: Joi.number().min(0),
  rentPrice: Joi.number().min(0),
  deposit_amount: Joi.number().min(0),
  deposit: Joi.number().min(0),
  stock_quantity: Joi.number().integer().min(0),
  stock: Joi.number().integer().min(0),
  status: Joi.string().valid("active", "inactive", "draft", "published"),
  tags: Joi.alternatives().try(Joi.array().items(Joi.string().trim()), Joi.string().allow("")),
  attributes: Joi.object({
    sizes: Joi.array().items(Joi.string().trim()),
    colors: Joi.array().items(Joi.string().trim()),
    features: Joi.array().items(Joi.string().trim()),
  }).allow(null),
  features: Joi.string().allow(""),
  size: Joi.string().allow(""),
  color: Joi.string().allow(""),
  era: Joi.string().allow(""),
  material: Joi.string().allow(""),
  craftsmanship: Joi.string().allow(""),
  gender: Joi.string()
    .valid("male", "female", "unisex", "Nam", "Nữ", "Nu", "Unisex", "nam", "nữ", "nu")
    .allow(""),
  origin: Joi.string().allow(""),
  thumbnail: Joi.string().allow(""),
  images: Joi.array().items(Joi.string().allow("")),
  gallery: Joi.array().items(Joi.string().allow("")),
  tailor_available: Joi.boolean(),
  stock_status: Joi.string().valid("in_stock", "out_of_stock", "on_order"),
})
  .min(1)
  .unknown(true);
