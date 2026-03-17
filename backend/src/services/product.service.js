import Product from "../models/Product.js";
import { ApiError } from "../utils/index.js";

const DEFAULT_THUMBNAIL = "https://via.placeholder.com/600x600?text=Product";

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const pickNumber = (...values) => {
  for (const value of values) {
    const parsed = toNumber(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
};

const normalizeList = (value, splitter = /[,\n/]+/) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(splitter)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeFeatures = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeGender = (value) => {
  if (!value) return undefined;
  const normalized = String(value).trim();
  const map = {
    male: "Nam",
    female: "Nữ",
    unisex: "Unisex",
    nam: "Nam",
    nu: "Nữ",
    "nữ": "Nữ",
  };
  return map[normalized.toLowerCase()] || normalized;
};

const normalizeStatus = (status) => {
  if (!status) return undefined;
  const normalized = String(status).trim().toLowerCase();
  if (normalized === "published") return "active";
  return normalized;
};

const buildShortDescription = (description = "") => {
  const text = String(description || "").trim();
  if (!text) return "";
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
};

const normalizeSalePrice = (priceBuy, priceSale) => {
  if (priceSale === null) return null;

  const normalizedPriceBuy = toNumber(priceBuy);
  const normalizedPriceSale = toNumber(priceSale);

  if (normalizedPriceSale === undefined || normalizedPriceSale < 0) {
    return null;
  }

  if (normalizedPriceBuy !== undefined && normalizedPriceSale >= normalizedPriceBuy) {
    return null;
  }

  return normalizedPriceSale;
};

class ProductService {
  async getProducts(queryParams) {
    const {
      page = 1,
      limit = 12,
      sortBy = "created_at",
      sortOrder = "desc",
      search = "",
      category = "",
      category_id = "",
      minPrice = 0,
      maxPrice = 999999999,
      status = "active",
      colors = "",
      sizes = "",
      gender = "",
    } = queryParams;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (category) {
      filter.category_name = new RegExp(category, "i");
    }
    if (category_id) {
      filter.category_id = parseInt(category_id);
    }

    filter.price_buy = { $gte: Number(minPrice), $lte: Number(maxPrice) };

    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { tags: new RegExp(search, "i") },
      ];
    }

    if (colors) {
      const colorArray = colors.split(",").map((c) => c.trim());
      filter["attributes.colors"] = { $in: colorArray };
    }

    if (sizes) {
      const sizeArray = sizes.split(",").map((s) => s.trim());
      filter["attributes.sizes"] = { $in: sizeArray };
    }

    if (gender) {
      const normalized = String(gender).trim();
      const map = {
        male: "Nam",
        female: "Nữ",
        unisex: "Unisex",
        nam: "Nam",
        nu: "Nữ",
        "nữ": "Nữ",
      };
      const mapped = map[normalized.toLowerCase()] || normalized;
      filter.gender = mapped;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const productsQuery = Product.find(filter);

    // Use Vietnamese collation so name sorting matches user expectation (A-Z / Z-A)
    if (sortBy === "name") {
      productsQuery.collation({ locale: "vi", strength: 1, numericOrdering: true });
    }

    const [products, total] = await Promise.all([
      productsQuery.sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Product.countDocuments(filter),
    ]);

    return {
      products,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    };
  }

  async getFilterData() {
    const match = { status: "active" };

    const [categories, colorsAttr, sizesAttr, genders, priceStats] = await Promise.all([
      Product.aggregate([
        { $match: match },
        {
          $group: {
            _id: { id: "$category_id", name: "$category_name" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            id: "$_id.id",
            name: "$_id.name",
            count: 1,
          },
        },
        { $sort: { name: 1 } },
      ]),
      Product.distinct("attributes.colors", match),
      Product.distinct("attributes.sizes", match),
      Product.distinct("gender", match),
      Product.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            minPrice: { $min: "$price_buy" },
            maxPrice: { $max: "$price_buy" },
          },
        },
      ]),
    ]);

    const priceInfo = priceStats && priceStats.length > 0 ? priceStats[0] : {};
    const colors = [...(colorsAttr || [])];
    const sizes = [...(sizesAttr || [])];

    return {
      categories,
      colors: Array.from(new Set(colors.filter(Boolean))).sort(),
      sizes: Array.from(new Set(sizes.filter(Boolean))).sort(),
      genders: Array.from(new Set((genders || []).filter(Boolean))).sort(),
      minPrice: priceInfo.minPrice || 0,
      maxPrice: priceInfo.maxPrice || 0,
    };
  }

  async getProductById(id) {
    const filter = isNaN(id) ? { slug: id } : { product_id: parseInt(id) };

    const product = await Product.findOne(filter).lean();

    if (!product) {
      throw ApiError.notFound("Product not found");
    }

    Product.updateOne(filter, { $inc: { view_count: 1 } }).exec();

    return product;
  }

  async createProduct(productData) {
    const payload = await this.normalizeCreatePayload(productData);

    const existingProduct = await Product.findOne({ product_id: payload.product_id });
    if (existingProduct) {
      throw ApiError.conflict("Product ID already exists");
    }

    if (payload.sku) {
      const existingSku = await Product.findOne({ sku: payload.sku });
      if (existingSku) {
        throw ApiError.conflict("SKU already exists");
      }
    }

    if (payload.slug) {
      const existingSlug = await Product.findOne({ slug: payload.slug });
      if (existingSlug) {
        throw ApiError.conflict("Slug already exists");
      }
    }

    const product = await Product.create(payload);
    return product;
  }

  async updateProduct(id, updateData) {
    const filter = isNaN(id) ? { slug: id } : { product_id: parseInt(id) };
    const payload = await this.normalizeUpdatePayload(updateData);

    const product = await Product.findOneAndUpdate(filter, payload, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      throw ApiError.notFound("Product not found");
    }

    return product;
  }

  async deleteProduct(id) {
    const filter = isNaN(id) ? { slug: id } : { product_id: parseInt(id) };

    const product = await Product.findOneAndUpdate(
      filter,
      { status: "inactive" },
      { new: true },
    );

    if (!product) {
      throw ApiError.notFound("Product not found");
    }

    return product;
  }

  async permanentDeleteProduct(id) {
    const filter = isNaN(id) ? { slug: id } : { product_id: parseInt(id) };

    const product = await Product.findOneAndDelete(filter);

    if (!product) {
      throw ApiError.notFound("Product not found");
    }

    return product;
  }

  async getRelatedProducts(productId, limit = 8) {
    const product = await Product.findOne({ product_id: parseInt(productId) });

    if (!product) {
      throw ApiError.notFound("Product not found");
    }

    const relatedProducts = await Product.find({
      category_id: product.category_id,
      product_id: { $ne: product.product_id },
      status: "active",
    })
      .limit(limit)
      .lean();

    return relatedProducts;
  }

  async updateStock(productId, quantity) {
    const product = await Product.findOne({ product_id: parseInt(productId) });

    if (!product) {
      throw ApiError.notFound("Product not found");
    }

    if (product.stock_quantity < quantity) {
      throw ApiError.badRequest("Insufficient product stock");
    }

    product.stock_quantity -= quantity;
    product.sold_count += quantity;
    await product.save();

    return product;
  }

  async getFeaturedProducts(limit = 8) {
    const products = await Product.find({ status: "active" })
      .sort({ rating_average: -1, view_count: -1 })
      .limit(limit)
      .lean();

    return products;
  }

  async getBestSellingProducts(limit = 10) {
    const products = await Product.find({ status: "active" })
      .sort({ sold_count: -1 })
      .limit(limit)
      .lean();

    return products;
  }

  async getNewestProducts(limit = 10) {
    const products = await Product.find({ status: "active" })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

    return products;
  }

  async normalizeCreatePayload(productData) {
    const name = String(productData?.name || "").trim();
    if (!name) {
      throw ApiError.badRequest("Product name is required");
    }

    const productId = pickNumber(productData?.product_id) || (await this.getNextProductId());
    const slug = slugify(productData?.slug || name);
    const sku = String(productData?.sku || "").trim() || `VP-${productId}`;

    const categoryName = String(
      productData?.category_name || productData?.category || "",
    ).trim();
    const categoryId = await this.resolveCategoryId(categoryName, productData?.category_id);

    const priceBuy = pickNumber(productData?.price_buy, productData?.salePrice) ?? 0;
    const rawPriceSale = pickNumber(productData?.price_sale, productData?.price_sell);
    const priceSale = normalizeSalePrice(priceBuy, rawPriceSale);
    const priceRent = pickNumber(productData?.price_rent, productData?.rentPrice) ?? 0;
    const depositAmount =
      pickNumber(productData?.deposit_amount, productData?.deposit) ?? 0;
    const stockQty = pickNumber(productData?.stock_quantity, productData?.stock) ?? 0;
    const status = normalizeStatus(productData?.status) || "draft";

    const tags = normalizeList(productData?.tags);
    const sizes = normalizeList(productData?.attributes?.sizes ?? productData?.size);
    const colors = normalizeList(productData?.attributes?.colors ?? productData?.color);
    const features = normalizeFeatures(
      productData?.features ?? productData?.attributes?.features,
    );

    const attributes = { ...(productData?.attributes || {}) };
    if (sizes.length) attributes.sizes = sizes;
    if (colors.length) attributes.colors = colors;
    if (features.length) attributes.features = features;

    const images = normalizeList(productData?.images);
    const gallery = normalizeList(productData?.gallery);
    const thumbnail = String(
      productData?.thumbnail || images[0] || gallery[0] || DEFAULT_THUMBNAIL,
    );

    const description = productData?.description ?? "";
    const shortDescription =
      productData?.short_description ?? buildShortDescription(description);

    const categorySlug = slugify(categoryName);
    const tailorAvailable =
      typeof productData?.tailor_available === "boolean"
        ? productData.tailor_available
        : categorySlug.includes("may-do");

    const now = new Date().toISOString();

    return {
      product_id: productId,
      name,
      slug,
      sku,
      description,
      short_description: shortDescription,
      category_id: categoryId,
      category_name: categoryName || "Uncategorized",
      era: productData?.era || "",
      price_buy: priceBuy,
      price_sale: priceSale,
      price_rent: priceRent,
      deposit_amount: depositAmount,
      thumbnail,
      images,
      gallery,
      attributes,
      categories: Array.isArray(productData?.categories)
        ? productData.categories
        : categoryName
          ? [categoryName]
          : [],
      tags,
      material: productData?.material || "",
      origin: productData?.origin || "Việt Nam",
      craftsmanship: productData?.craftsmanship || "",
      gender: normalizeGender(productData?.gender) || "Unisex",
      stock_quantity: stockQty,
      stock_status: productData?.stock_status || (stockQty > 0 ? "in_stock" : "out_of_stock"),
      tailor_available: tailorAvailable,
      status,
      created_at: now,
      updated_at: now,
    };
  }

  async normalizeUpdatePayload(updateData) {
    const payload = {};

    if (updateData?.name) {
      payload.name = String(updateData.name).trim();
      payload.slug = slugify(updateData.slug || updateData.name);
    } else if (updateData?.slug) {
      payload.slug = slugify(updateData.slug);
    }

    if (updateData?.sku !== undefined) {
      payload.sku = String(updateData.sku).trim();
    }

    if (updateData?.description !== undefined) {
      payload.description = updateData.description;
    }

    if (updateData?.short_description !== undefined) {
      payload.short_description = updateData.short_description;
    }

    const categoryName = updateData?.category_name || updateData?.category;
    if (categoryName) {
      payload.category_name = String(categoryName).trim();
      payload.category_id = await this.resolveCategoryId(
        payload.category_name,
        updateData?.category_id,
      );
      payload.categories = Array.isArray(updateData?.categories)
        ? updateData.categories
        : [payload.category_name];
    } else if (updateData?.category_id !== undefined) {
      payload.category_id = parseInt(updateData.category_id);
    }

    const priceBuy = pickNumber(updateData?.price_buy, updateData?.salePrice);
    if (priceBuy !== undefined) payload.price_buy = priceBuy;

    const shouldClearSalePrice =
      updateData?.price_sale === null ||
      updateData?.price_sell === null ||
      updateData?.salePrice === null;
    const rawPriceSale = pickNumber(updateData?.price_sale, updateData?.price_sell);
    if (shouldClearSalePrice) {
      payload.price_sale = null;
    } else if (rawPriceSale !== undefined) {
      payload.price_sale = normalizeSalePrice(priceBuy, rawPriceSale);
    }

    const priceRent = pickNumber(updateData?.price_rent, updateData?.rentPrice);
    if (priceRent !== undefined) payload.price_rent = priceRent;

    const depositAmount = pickNumber(updateData?.deposit_amount, updateData?.deposit);
    if (depositAmount !== undefined) payload.deposit_amount = depositAmount;

    const stockQty = pickNumber(updateData?.stock_quantity, updateData?.stock);
    if (stockQty !== undefined) {
      payload.stock_quantity = stockQty;
      payload.stock_status = stockQty > 0 ? "in_stock" : "out_of_stock";
    } else if (updateData?.stock_status) {
      payload.stock_status = updateData.stock_status;
    }

    if (updateData?.status) {
      payload.status = normalizeStatus(updateData.status);
    }

    if (updateData?.tags !== undefined) {
      payload.tags = normalizeList(updateData.tags);
    }

    const sizes = normalizeList(updateData?.attributes?.sizes ?? updateData?.size);
    const colors = normalizeList(updateData?.attributes?.colors ?? updateData?.color);
    const features = normalizeFeatures(
      updateData?.features ?? updateData?.attributes?.features,
    );

    if (sizes.length || colors.length || features.length) {
      payload.attributes = { ...(updateData?.attributes || {}) };
      if (sizes.length) payload.attributes.sizes = sizes;
      if (colors.length) payload.attributes.colors = colors;
      if (features.length) payload.attributes.features = features;
    }

    if (updateData?.era !== undefined) {
      payload.era = updateData.era;
    }

    if (updateData?.material !== undefined) {
      payload.material = updateData.material;
    }

    if (updateData?.origin !== undefined) {
      payload.origin = updateData.origin;
    }

    if (updateData?.craftsmanship !== undefined) {
      payload.craftsmanship = updateData.craftsmanship;
    }

    if (updateData?.gender !== undefined) {
      payload.gender = normalizeGender(updateData.gender);
    }

    if (updateData?.thumbnail !== undefined) {
      payload.thumbnail = updateData.thumbnail;
    }

    const images = normalizeList(updateData?.images);
    if (images.length) payload.images = images;

    const gallery = normalizeList(updateData?.gallery);
    if (gallery.length) payload.gallery = gallery;

    if (updateData?.tailor_available !== undefined) {
      payload.tailor_available = Boolean(updateData.tailor_available);
    }

    payload.updated_at = new Date().toISOString();

    return payload;
  }

  async getNextProductId() {
    const lastProduct = await Product.findOne().sort({ product_id: -1 }).lean();
    return lastProduct?.product_id ? lastProduct.product_id + 1 : 1;
  }

  async resolveCategoryId(categoryName, categoryId) {
    const parsedCategoryId = pickNumber(categoryId);
    if (parsedCategoryId !== undefined) return parsedCategoryId;

    if (categoryName) {
      const existingCategory = await Product.findOne({ category_name: categoryName })
        .sort({ category_id: -1 })
        .lean();
      if (existingCategory?.category_id) {
        return existingCategory.category_id;
      }
    }

    const lastCategory = await Product.findOne({ category_id: { $exists: true } })
      .sort({ category_id: -1 })
      .lean();
    return lastCategory?.category_id ? lastCategory.category_id + 1 : 1;
  }
}

export default new ProductService();
