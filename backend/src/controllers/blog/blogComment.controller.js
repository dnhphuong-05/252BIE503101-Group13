import blogCommentService from "../../services/blog/blogComment.service.js";
import catchAsync from "../../utils/catchAsync.js";
import {
  successResponse,
  paginatedResponse,
  createdResponse,
} from "../../utils/response.js";

const attachCommentId = (comment) => {
  if (!comment) return comment;
  if (comment.comments_id) return comment;
  if (!comment.id) return comment;

  return {
    ...comment,
    comments_id: `bc_${comment.blog_id}_${comment.id}`,
  };
};

const attachCommentIds = (comments = []) => comments.map(attachCommentId);

/**
 * Get comments by blog post ID
 */
export const getCommentsByBlogId = catchAsync(async (req, res) => {
  const { blogPostId } = req.params;
  const { page = 1, limit = 20, includeReplies = "false" } = req.query;

  const result = await blogCommentService.getByBlogId(blogPostId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    includeReplies: includeReplies === "true",
  });

  paginatedResponse(
    res,
    attachCommentIds(result.items),
    result.pagination,
    "Comments retrieved successfully",
  );
});

/**
 * Get replies to a comment
 */
export const getReplies = catchAsync(async (req, res) => {
  const { commentId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const result = await blogCommentService.getReplies(commentId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
  });

  paginatedResponse(
    res,
    attachCommentIds(result.items),
    result.pagination,
    "Replies retrieved successfully",
  );
});

/**
 * Create comment
 * Supports both authenticated and guest users
 * - Authenticated: Takes user_name from req.user
 * - Guest: Requires user_name in request body
 */
export const createComment = catchAsync(async (req, res) => {
  const user = req.user || null; // Will be populated by optionalAuthenticate middleware
  const comment = await blogCommentService.createComment(req.body, user);

  createdResponse(res, attachCommentId(comment), "Comment created successfully");
});

/**
 * Update comment
 */
export const updateComment = catchAsync(async (req, res) => {
  const comment = await blogCommentService.update(req.params.id, req.body);

  successResponse(res, comment, "Comment updated successfully");
});

/**
 * Delete comment
 */
export const deleteComment = catchAsync(async (req, res) => {
  await blogCommentService.delete(req.params.id);

  successResponse(res, null, "Comment deleted successfully");
});

/**
 * Like comment
 */
export const likeComment = catchAsync(async (req, res) => {
  const comment = await blogCommentService.likeComment(req.params.id);

  successResponse(res, comment, "Comment liked successfully");
});

/**
 * Get comment count
 */
export const getCommentCount = catchAsync(async (req, res) => {
  const blogId = req.params.blogPostId || req.params.blogId;

  const count = await blogCommentService.getCommentCount(blogId);

  successResponse(res, { count }, "Comment count retrieved successfully");
});

/**
 * Get comments by user_id
 */
export const getCommentsByUserId = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const result = await blogCommentService.getByUserId(userId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
  });

  paginatedResponse(
    res,
    attachCommentIds(result.items),
    result.pagination,
    "Comments retrieved successfully",
  );
});

// Aliases for routes compatibility
export const getByBlogId = getCommentsByBlogId;
export const create = createComment;
export const update = updateComment;
// deleteComment, getReplies, likeComment, getCommentCount already have correct names
