import ProductReview from '../models/ProductReview.js';
import ProductRating from '../models/ProductRating.js';

// @desc    Get all reviews for a product
// @route   GET /api/products/:productId/reviews
// @access  Public
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
      rating = '',
    } = req.query;

    const filter = { product_id: parseInt(productId) };

    // Filter by rating if provided
    if (rating) {
      filter.rating = parseInt(rating);
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const reviews = await ProductReview.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await ProductReview.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error in getProductReviews:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy đánh giá sản phẩm',
      error: error.message,
    });
  }
};

// @desc    Get rating statistics for a product
// @route   GET /api/products/:productId/ratings
// @access  Public
export const getProductRatings = async (req, res) => {
  try {
    const { productId } = req.params;

    const rating = await ProductRating.findOne({
      product_id: parseInt(productId),
    }).lean();

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thống kê đánh giá',
      });
    }

    res.status(200).json({
      success: true,
      data: rating,
    });
  } catch (error) {
    console.error('❌ Error in getProductRatings:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê đánh giá',
      error: error.message,
    });
  }
};

// @desc    Create a new review
// @route   POST /api/products/:productId/reviews
// @access  Private
export const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { user_name, rating, comment, images = [] } = req.body;

    // Validate required fields
    if (!user_name || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin',
      });
    }

    // Get product info
    const Product = (await import('../models/Product.js')).default;
    const product = await Product.findOne({ product_id: parseInt(productId) });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    // Generate review ID
    const lastReview = await ProductReview.findOne()
      .sort({ id: -1 })
      .lean();
    const reviewCount = lastReview ? parseInt(lastReview.id.split('_')[2]) + 1 : 1;
    const reviewId = `rv_${productId}_${reviewCount}`;

    // Create review
    const review = await ProductReview.create({
      id: reviewId,
      product_id: parseInt(productId),
      product_name: product.name,
      user_name,
      rating: parseInt(rating),
      comment,
      images,
      created_at: new Date().toISOString(),
      verified_purchase: false,
    });

    // Update product rating
    await updateProductRating(parseInt(productId));

    res.status(201).json({
      success: true,
      message: 'Tạo đánh giá thành công',
      data: review,
    });
  } catch (error) {
    console.error('❌ Error in createReview:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đánh giá',
      error: error.message,
    });
  }
};

// @desc    Update review helpful count
// @route   PUT /api/reviews/:reviewId/helpful
// @access  Public
export const updateReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await ProductReview.findOneAndUpdate(
      { id: reviewId },
      { $inc: { helpful_count: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật thành công',
      data: review,
    });
  } catch (error) {
    console.error('❌ Error in updateReviewHelpful:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật đánh giá',
      error: error.message,
    });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:reviewId
// @access  Private/Admin
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await ProductReview.findOneAndDelete({ id: reviewId });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá',
      });
    }

    // Update product rating
    await updateProductRating(review.product_id);

    res.status(200).json({
      success: true,
      message: 'Xóa đánh giá thành công',
      data: review,
    });
  } catch (error) {
    console.error('❌ Error in deleteReview:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa đánh giá',
      error: error.message,
    });
  }
};

// Helper function to update product rating
async function updateProductRating(productId) {
  try {
    // Get all reviews for this product
    const reviews = await ProductReview.find({ product_id: productId }).lean();

    if (reviews.length === 0) {
      // No reviews, set rating to 0
      await ProductRating.findOneAndUpdate(
        { product_id: productId },
        {
          rating_average: 0,
          rating_count: 0,
          rating_distribution: {
            '5_star': 0,
            '4_star': 0,
            '3_star': 0,
            '2_star': 0,
            '1_star': 0,
          },
        },
        { upsert: true }
      );

      // Update product model
      const Product = (await import('../models/Product.js')).default;
      await Product.updateOne(
        { product_id: productId },
        { rating_average: 0, rating_count: 0 }
      );
      return;
    }

    // Calculate rating statistics
    const ratingCount = reviews.length;
    const ratingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
    const ratingAverage = Math.round((ratingSum / ratingCount) * 10) / 10;

    const distribution = {
      '5_star': reviews.filter((r) => r.rating === 5).length,
      '4_star': reviews.filter((r) => r.rating === 4).length,
      '3_star': reviews.filter((r) => r.rating === 3).length,
      '2_star': reviews.filter((r) => r.rating === 2).length,
      '1_star': reviews.filter((r) => r.rating === 1).length,
    };

    // Update ProductRating
    await ProductRating.findOneAndUpdate(
      { product_id: productId },
      {
        rating_average: ratingAverage,
        rating_count: ratingCount,
        rating_distribution: distribution,
      },
      { upsert: true }
    );

    // Update Product model
    const Product = (await import('../models/Product.js')).default;
    await Product.updateOne(
      { product_id: productId },
      {
        rating_average: ratingAverage,
        rating_count: ratingCount,
      }
    );
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
}
