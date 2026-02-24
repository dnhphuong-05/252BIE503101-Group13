import express from "express";
import {
  getProductReviews,
  getProductRatings,
  createReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
  replyToReview,
  getUserReviewForProduct,
  getUserReviews,
} from "../controllers/review.controller.js";
import { validate } from "../middlewares/index.js";
import { reviewValidator } from "../validators/index.js";

const router = express.Router();

// ========== Product Reviews Routes ==========

/**
 * @route   GET /api/products/:productId/reviews
 * @desc    Get all reviews for a product
 * @access  Public
 */
router.get(
  "/products/:productId/reviews",
  validate(reviewValidator.productIdParamSchema, "params"),
  validate(reviewValidator.getReviewsSchema, "query"),
  getProductReviews,
);

/**
 * @route   GET /api/products/:productId/ratings
 * @desc    Get rating statistics for a product
 * @access  Public
 */
router.get(
  "/products/:productId/ratings",
  validate(reviewValidator.productIdParamSchema, "params"),
  getProductRatings,
);

/**
 * @route   GET /api/products/:productId/reviews/my-review
 * @desc    Get user's review for a product
 * @access  Private
 */
router.get(
  "/products/:productId/reviews/my-review",
  validate(reviewValidator.productIdParamSchema, "params"),
  getUserReviewForProduct,
);

/**
 * @route   POST /api/products/:productId/reviews
 * @desc    Create a new review
 * @access  Private
 */
router.post(
  "/products/:productId/reviews",
  validate(reviewValidator.productIdParamSchema, "params"),
  validate(reviewValidator.createReviewSchema, "body"),
  createReview,
);

// ========== Individual Review Routes ==========

/**
 * @route   PUT /api/reviews/:reviewId
 * @desc    Update a review
 * @access  Private (only review owner)
 */
router.put(
  "/reviews/:reviewId",
  validate(reviewValidator.reviewIdParamSchema, "params"),
  validate(reviewValidator.updateReviewSchema, "body"),
  updateReview,
);

/**
 * @route   DELETE /api/reviews/:reviewId
 * @desc    Delete a review
 * @access  Private (only review owner or admin)
 */
router.delete(
  "/reviews/:reviewId",
  validate(reviewValidator.reviewIdParamSchema, "params"),
  deleteReview,
);

/**
 * @route   POST /api/reviews/:reviewId/helpful
 * @desc    Mark review as helpful
 * @access  Private
 */
router.post(
  "/reviews/:reviewId/helpful",
  validate(reviewValidator.reviewIdParamSchema, "params"),
  validate(reviewValidator.markHelpfulSchema, "body"),
  markReviewHelpful,
);

/**
 * @route   POST /api/admin/reviews/:reviewId/reply
 * @desc    Admin reply to review
 * @access  Private/Admin
 */
router.post(
  "/admin/reviews/:reviewId/reply",
  validate(reviewValidator.reviewIdParamSchema, "params"),
  validate(reviewValidator.adminReplySchema, "body"),
  replyToReview,
);

// ========== User Reviews Routes ==========

/**
 * @route   GET /api/users/:userId/reviews
 * @desc    Get all reviews by a user
 * @access  Private
 */
router.get("/users/:userId/reviews", getUserReviews);

export default router;
