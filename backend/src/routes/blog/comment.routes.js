import express from "express";
import { validate } from "../../middlewares/validate.js";
import { optionalAuthenticate } from "../../middlewares/auth.middleware.js";
import * as validator from "../../validators/blog/blogComment.validator.js";
import * as controller from "../../controllers/blog/blogComment.controller.js";

const router = express.Router();

/**
 * @route   GET /api/blog/comments/post/:blogPostId
 * @desc    Get comments by blog post ID
 * @access  Public
 */
router.get(
  "/post/:blogPostId",
  validate(validator.getCommentsByBlogId),
  controller.getCommentsByBlogId,
);

/**
 * @route   GET /api/blog/comments/user/:userId
 * @desc    Get comments by user ID
 * @access  Public
 */
router.get(
  "/user/:userId",
  validate(validator.getCommentsByUserId),
  controller.getCommentsByUserId,
);

/**
 * @route   GET /api/blog/comments/:commentId/replies
 * @desc    Get replies for a comment
 * @access  Public
 */
router.get(
  "/:commentId/replies",
  validate(validator.getReplies),
  controller.getReplies,
);

/**
 * @route   GET /api/blog/comments/post/:blogPostId/count
 * @desc    Get comment count for blog post
 * @access  Public
 */
router.get(
  "/post/:blogPostId/count",
  validate(validator.getCommentCount),
  controller.getCommentCount,
);

/**
 * @route   GET /api/blog/comments/blog/:blogId/count
 * @desc    Get comment count for blog post (alias)
 * @access  Public
 */
router.get(
  "/blog/:blogId/count",
  validate(validator.getCommentCount),
  controller.getCommentCount,
);

/**
 * @route   POST /api/blog/comments
 * @desc    Create new comment
 * @access  Public (supports both authenticated and guest users)
 *          - Authenticated: user_name taken from logged-in user
 *          - Guest: user_name required in request body
 */
router.post(
  "/",
  optionalAuthenticate,
  validate(validator.createComment),
  controller.create,
);

/**
 * @route   PUT /api/blog/comments/:id
 * @desc    Update comment
 * @access  Authenticated (Owner)
 */
router.put("/:id", validate(validator.updateComment), controller.update);

/**
 * @route   POST /api/blog/comments/:id/like
 * @desc    Like/unlike comment
 * @access  Authenticated
 */
router.post(
  "/:id/like",
  validate(validator.likeComment),
  controller.likeComment,
);

/**
 * @route   DELETE /api/blog/comments/:id
 * @desc    Delete comment
 * @access  Authenticated (Owner or Admin)
 */
router.delete(
  "/:id",
  validate(validator.deleteComment),
  controller.deleteComment,
);

export default router;
