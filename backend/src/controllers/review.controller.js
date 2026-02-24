import { reviewService } from "../services/index.js";
import {
  catchAsync,
  successResponse,
  successResponseWithPagination,
} from "../utils/index.js";

/**
 * Review Controller - Xử lý HTTP requests cho Review
 */

/**
 * @desc    Get all reviews for a product
 * @route   GET /api/products/:productId/reviews
 * @access  Public
 */
export const getProductReviews = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await reviewService.getProductReviews(productId, req.query);

  successResponseWithPagination(
    res,
    result.reviews,
    result.pagination,
    "Lấy danh sách đánh giá thành công",
  );
});

/**
 * @desc    Get rating statistics for a product
 * @route   GET /api/products/:productId/ratings
 * @access  Public
 */
export const getProductRatings = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const rating = await reviewService.getProductRatings(productId);

  successResponse(res, rating, "Lấy thống kê đánh giá thành công");
});

/**
 * @desc    Create a new review
 * @route   POST /api/products/:productId/reviews
 * @access  Private
 */
export const createReview = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const review = await reviewService.createReview(productId, req.body);

  successResponse(res, review, "Tạo đánh giá thành công", 201);
});

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:reviewId
 * @access  Private (only review owner)
 */
export const updateReview = catchAsync(async (req, res) => {
  const { reviewId } = req.params;
  const review = await reviewService.updateReview(reviewId, req.body);

  successResponse(res, review, "Cập nhật đánh giá thành công");
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:reviewId
 * @access  Private (only review owner or admin)
 */
export const deleteReview = catchAsync(async (req, res) => {
  const { reviewId } = req.params;
  const review = await reviewService.deleteReview(reviewId);

  successResponse(res, review, "Xóa đánh giá thành công");
});

/**
 * @desc    Mark review as helpful
 * @route   POST /api/reviews/:reviewId/helpful
 * @access  Private
 */
export const markReviewHelpful = catchAsync(async (req, res) => {
  const { reviewId } = req.params;
  const { user_id } = req.body;

  const review = await reviewService.markReviewHelpful(reviewId, user_id);

  successResponse(res, review, "Đánh dấu hữu ích thành công");
});

/**
 * @desc    Get user's review for a product
 * @route   GET /api/products/:productId/reviews/my-review
 * @access  Private
 */
export const getUserReviewForProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user?.id; // Assuming auth middleware adds user to req

  const review = await reviewService.getUserReviewForProduct(productId, userId);

  successResponse(res, review, "Lấy đánh giá của bạn thành công");
});

/**
 * @desc    Get all reviews by user
 * @route   GET /api/users/:userId/reviews
 * @access  Private
 */
export const getUserReviews = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await reviewService.getUserReviews(userId, req.query);

  successResponseWithPagination(
    res,
    result.reviews,
    result.pagination,
    "Lấy danh sách đánh giá thành công",
  );
});

/**
 * @desc    Admin reply to a review
 * @route   POST /api/admin/reviews/:reviewId/reply
 * @access  Private/Admin
 */
export const replyToReview = catchAsync(async (req, res) => {
  const { reviewId } = req.params;
  const reply = await reviewService.setAdminReply(reviewId, req.body);

  successResponse(res, reply, "Trả lời đánh giá thành công");
});
