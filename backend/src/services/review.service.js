import mongoose from "mongoose";
import ProductReview from "../models/ProductReview.js";
import ProductRating from "../models/ProductRating.js";
import Product from "../models/Product.js";
import UserProfile from "../models/user/UserProfile.js";
import { ApiError } from "../utils/index.js";

const PRIMARY_RATING_COLLECTION = ProductRating.collection?.name || "product_ratings";
const getLegacyRatingModel = () => {
  const legacyCollection =
    PRIMARY_RATING_COLLECTION === "product_ratings"
      ? "products_ratings"
      : "product_ratings";
  return (
    mongoose.models.ProductRatingLegacy ||
    mongoose.model("ProductRatingLegacy", ProductRating.schema, legacyCollection)
  );
};

const PRIMARY_REVIEW_COLLECTION = ProductReview.collection?.name || "products_reviews";
const getLegacyReviewModel = () => {
  const legacyCollection =
    PRIMARY_REVIEW_COLLECTION === "products_reviews"
      ? "product_reviews"
      : "products_reviews";
  return (
    mongoose.models.ProductReviewLegacy ||
    mongoose.model("ProductReviewLegacy", ProductReview.schema, legacyCollection)
  );
};

const normalizeProductId = (productId) => {
  const idString = productId?.toString();
  const numeric = Number.isFinite(Number(idString)) ? Number(idString) : null;
  return { idString, numeric };
};

const buildProductFilter = (productId) => {
  const { idString, numeric } = normalizeProductId(productId);
  const or = [];

  if (numeric !== null) {
    or.push({ product_id: numeric }, { productId: numeric });
  }

  if (idString) {
    if (numeric !== null) {
      or.push({ product_id: idString });
    }
    or.push({ productId: idString });
  }

  if (or.length > 0) {
    return { $or: or };
  }

  return { product_id: productId };
};

const mergeFilterWithExtra = (filter, extra = {}) => {
  if (filter && filter.$or) {
    return { $and: [filter, extra] };
  }
  return { ...filter, ...extra };
};

const buildProductOrFilters = (productId, product) => {
  const base = buildProductFilter(productId);
  const orFilters = base.$or ? [...base.$or] : [base];

  if (product) {
    if (product._id) {
      // Use productId for ObjectId-based legacy fields without casting into product_id (Number).
      orFilters.push({ productId: product._id }, { productId: product._id.toString?.() });
    }
    if (product.product_id !== undefined && product.product_id !== null) {
      orFilters.push(
        { product_id: product.product_id },
        { productId: product.product_id },
        { product_id: String(product.product_id) },
        { productId: String(product.product_id) },
      );
    }
    // Avoid matching by name/slug to prevent cross-product collisions.
  }

  const normalized = orFilters.filter((entry) => entry && Object.keys(entry).length > 0);
  return normalized.length === 1 ? normalized[0] : { $or: normalized };
};

const resolveProductFilter = async (productId) => {
  const { numeric, idString } = normalizeProductId(productId);
  let product = null;

  if (numeric !== null) {
    product = await Product.findOne({ product_id: numeric })
      .select("_id product_id name slug")
      .lean();
  }

  if (!product && idString && /^[0-9a-fA-F]{24}$/.test(idString)) {
    product = await Product.findById(idString)
      .select("_id product_id name slug")
      .lean();
  }

  return buildProductOrFilters(productId, product);
};

const computeRatingFromReviews = (reviews, productId) => {
  if (!Array.isArray(reviews) || reviews.length === 0) return null;
  const { numeric } = normalizeProductId(productId);
  const ratingCount = reviews.length;
  const ratingSum = reviews.reduce(
    (sum, review) => sum + Number(review.rating || 0),
    0,
  );
  const ratingAverage = ratingCount
    ? Math.round((ratingSum / ratingCount) * 10) / 10
    : 0;

  return {
    product_id: numeric ?? 0,
    rating_average: ratingAverage,
    rating_count: ratingCount,
    rating_distribution: {
      "5_star": reviews.filter((r) => Number(r.rating) === 5).length,
      "4_star": reviews.filter((r) => Number(r.rating) === 4).length,
      "3_star": reviews.filter((r) => Number(r.rating) === 3).length,
      "2_star": reviews.filter((r) => Number(r.rating) === 2).length,
      "1_star": reviews.filter((r) => Number(r.rating) === 1).length,
    },
  };
};

const attachReviewerNames = async (reviews = []) => {
  if (!Array.isArray(reviews) || reviews.length === 0) return reviews;

  const userIds = [
    ...new Set(
      reviews
        .map((review) => review?.user_id)
        .filter((userId) => typeof userId === "string" && userId.trim() !== ""),
    ),
  ];

  if (userIds.length === 0) return reviews;

  const profiles = await UserProfile.find({ user_id: { $in: userIds } })
    .select("user_id full_name")
    .lean();
  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile.full_name]),
  );

  return reviews.map((review) => {
    const fullName = profileMap.get(review.user_id);
    if (!fullName) return review;
    return {
      ...review,
      user_name: fullName,
    };
  });
};

const buildReviewIdFilter = (reviewId) => {
  const filters = [{ id: reviewId }, { review_id: reviewId }];
  if (reviewId && mongoose.Types.ObjectId.isValid(reviewId)) {
    filters.push({ _id: new mongoose.Types.ObjectId(reviewId) });
  }
  return { $or: filters };
};

/**
 * Review Service - Business logic cho Review
 */
class ReviewService {
  /**
   * Lấy danh sách reviews cho một sản phẩm
   */
  async getProductReviews(productId, queryParams) {
    const {
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "desc",
      rating = "",
    } = queryParams;

    const filter = await resolveProductFilter(productId);
    const ratingFilter = rating ? mergeFilterWithExtra(filter, { rating: parseInt(rating) }) : filter;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      ProductReview.find(ratingFilter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ProductReview.countDocuments(ratingFilter),
    ]);

    const enrichedReviews = await attachReviewerNames(reviews);

    if (total === 0) {
      const LegacyReview = getLegacyReviewModel();
      const [legacyReviews, legacyTotal] = await Promise.all([
        LegacyReview.find(ratingFilter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        LegacyReview.countDocuments(ratingFilter),
      ]);

      return {
        reviews: await attachReviewerNames(legacyReviews),
        pagination: {
          total: legacyTotal,
          page: pageNum,
          pages: Math.ceil(legacyTotal / limitNum),
          limit: limitNum,
        },
      };
    }

    return {
      reviews: enrichedReviews,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    };
  }

  /**
   * Lấy thống kê rating của sản phẩm
   */
  async getProductRatings(productId) {
    const ratingFilter = await resolveProductFilter(productId);
    let rating = await ProductRating.findOne(ratingFilter).lean();

    if (!rating) {
      rating = await getLegacyRatingModel().findOne(ratingFilter).lean();

      if (!rating) {
        const reviews = await ProductReview.find(ratingFilter).lean();
        const computed =
          computeRatingFromReviews(reviews, productId) ||
          computeRatingFromReviews(
            await getLegacyReviewModel().find(ratingFilter).lean(),
            productId,
          );

        if (computed) {
          return computed;
        }

        // Trả về default rating nếu chưa có
        return {
          product_id: normalizeProductId(productId).numeric ?? 0,
          rating_average: 0,
          rating_count: 0,
          rating_distribution: {
            "5_star": 0,
            "4_star": 0,
            "3_star": 0,
            "2_star": 0,
            "1_star": 0,
          },
        };
      }
    }

    return rating;
  }

  /**
   * Tạo review mới
   */
  async createReview(productId, reviewData) {
    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findOne({ product_id: parseInt(productId) });

    if (!product) {
      throw ApiError.notFound("Không tìm thấy sản phẩm");
    }

    // Kiểm tra user đã review chưa (nếu có user_id)
    if (reviewData.user_id) {
      const existingReview = await ProductReview.findOne({
        product_id: parseInt(productId),
        user_id: reviewData.user_id,
      });

      if (existingReview) {
        throw ApiError.conflict("Bạn đã đánh giá sản phẩm này rồi");
      }
    }

    // Generate review ID
    const lastReview = await ProductReview.findOne().sort({ id: -1 }).lean();
    const reviewCount = lastReview
      ? parseInt(lastReview.id.split("_")[2]) + 1
      : 1;
    const reviewId = `rv_${productId}_${reviewCount}`;

    // Create review
    const review = await ProductReview.create({
      id: reviewId,
      product_id: parseInt(productId),
      product_name: product.name,
      ...reviewData,
      created_at: new Date().toISOString(),
      helpful_count: 0,
    });

    // Update product rating
    await this.updateProductRating(parseInt(productId));

    return review;
  }

  /**
   * Cập nhật review
   */
  async updateReview(reviewId, updateData) {
    const review = await ProductReview.findOneAndUpdate(
      { _id: reviewId },
      { ...updateData, updated_at: new Date().toISOString() },
      { new: true, runValidators: true },
    );

    if (!review) {
      throw ApiError.notFound("Không tìm thấy đánh giá");
    }

    // Update product rating nếu rating thay đổi
    if (updateData.rating) {
      await this.updateProductRating(review.product_id);
    }

    return review;
  }

  /**
   * Xóa review
   */
  async deleteReview(reviewId) {
    const review = await ProductReview.findOneAndDelete({ _id: reviewId });

    if (!review) {
      throw ApiError.notFound("Không tìm thấy đánh giá");
    }

    // Update product rating
    await this.updateProductRating(review.product_id);

    return review;
  }

  /**
   * Admin reply to a review
   */
  async setAdminReply(reviewId, payload) {
    const filter = buildReviewIdFilter(reviewId);
    const models = [ProductReview, getLegacyReviewModel()];
    const modelCollectionNames = new Set(
      models.map((model) => model.collection?.name).filter(Boolean),
    );

    const now = new Date().toISOString();
    const repliedBy = payload.replied_by || {};
    const adminReply = {
      reply_text: payload.reply_text || "",
      replied_by: {
        admin_id: repliedBy.admin_id || payload.admin_id || "",
        full_name: repliedBy.full_name || payload.full_name || "Admin",
      },
      created_at: now,
      updated_at: now,
      is_deleted: payload.is_deleted !== undefined ? payload.is_deleted : false,
    };

    let updated = null;
    for (const model of models) {
      const existing = await model.findOne(filter).lean();
      if (!existing) continue;

      if (!adminReply.created_at && existing.admin_reply?.created_at) {
        adminReply.created_at = existing.admin_reply.created_at;
      }
      const current = await model
        .findOneAndUpdate(filter, { $set: { admin_reply: adminReply } }, { new: true })
        .lean();
      if (!updated) updated = current;
    }

    const knownCollections = ["products_reviews", "product_reviews", "products_review"];
    const existingCollections = await mongoose.connection.db
      .listCollections({ name: { $in: knownCollections } })
      .toArray();

    for (const col of existingCollections) {
      if (modelCollectionNames.has(col.name)) continue;
      await mongoose.connection.db
        .collection(col.name)
        .updateMany(filter, { $set: { admin_reply: adminReply } });
    }

    if (!updated) {
      throw ApiError.notFound("KhÃ´ng tÃ¬m tháº¥y Ä‘Ã¡nh giÃ¡");
    }

    return updated;
  }

  /**
   * Mark review as helpful
   */
  async markReviewHelpful(reviewId, userId) {
    const review = await ProductReview.findById(reviewId);

    if (!review) {
      throw ApiError.notFound("Không tìm thấy đánh giá");
    }

    // Tăng helpful count
    review.helpful_count = (review.helpful_count || 0) + 1;
    await review.save();

    return review;
  }

  /**
   * Cập nhật thống kê rating của sản phẩm
   */
  async updateProductRating(productId) {
    // Aggregate reviews để tính rating
    const stats = await ProductReview.aggregate([
      { $match: { product_id: parseInt(productId) } },
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 },
          distribution_5: {
            $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
          },
          distribution_4: {
            $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] },
          },
          distribution_3: {
            $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] },
          },
          distribution_2: {
            $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] },
          },
          distribution_1: {
            $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] },
          },
        },
      },
    ]);

    if (stats.length === 0) {
      // Xóa rating record nếu không còn review
      await ProductRating.deleteOne({ product_id: parseInt(productId) });
      await getLegacyRatingModel().deleteOne({ product_id: parseInt(productId) });
      return;
    }

    const stat = stats[0];

    // Update hoặc create rating record
    await ProductRating.findOneAndUpdate(
      { product_id: parseInt(productId) },
      {
        product_id: parseInt(productId),
        rating_average: Math.round(stat.average * 10) / 10,
        rating_count: stat.count,
        rating_distribution: {
          "5_star": stat.distribution_5,
          "4_star": stat.distribution_4,
          "3_star": stat.distribution_3,
          "2_star": stat.distribution_2,
          "1_star": stat.distribution_1,
        },
        updated_at: new Date().toISOString(),
      },
      { upsert: true, new: true },
    );

    // Maintain legacy collection if it exists
    await getLegacyRatingModel().findOneAndUpdate(
      { product_id: parseInt(productId) },
      {
        product_id: parseInt(productId),
        rating_average: Math.round(stat.average * 10) / 10,
        rating_count: stat.count,
        rating_distribution: {
          "5_star": stat.distribution_5,
          "4_star": stat.distribution_4,
          "3_star": stat.distribution_3,
          "2_star": stat.distribution_2,
          "1_star": stat.distribution_1,
        },
        updated_at: new Date().toISOString(),
      },
      { upsert: true, new: true },
    );

    // Update product model với rating mới
    await Product.findOneAndUpdate(
      { product_id: parseInt(productId) },
      {
        rating_average: Math.round(stat.average * 10) / 10,
        rating_count: stat.count,
      },
    );
  }

  /**
   * Lấy review của user cho một sản phẩm
   */
  async getUserReviewForProduct(productId, userId) {
    const baseFilter = await resolveProductFilter(productId);
    const review = await ProductReview.findOne(
      mergeFilterWithExtra(baseFilter, { user_id: userId }),
    ).lean();

    return review;
  }

  /**
   * Lấy tất cả reviews của user
   */
  async getUserReviews(userId, queryParams = {}) {
    const { page = 1, limit = 10 } = queryParams;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      ProductReview.find({ user_id: userId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ProductReview.countDocuments({ user_id: userId }),
    ]);

    return {
      reviews: await attachReviewerNames(reviews),
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    };
  }
}

export default new ReviewService();


