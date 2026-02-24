import express from 'express';
import {
  getProductReviews,
  getProductRatings,
  createReview,
  updateReviewHelpful,
  deleteReview,
} from '../controllers/reviewController.js';

const router = express.Router();

// Product reviews routes
router.get('/products/:productId/reviews', getProductReviews);
router.get('/products/:productId/ratings', getProductRatings);
router.post('/products/:productId/reviews', createReview);

// Review actions
router.put('/reviews/:reviewId/helpful', updateReviewHelpful);
router.delete('/reviews/:reviewId', deleteReview);

export default router;
