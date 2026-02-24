import Joi from "joi";

const idSchema = Joi.number().integer().positive().required();
const commentIdSchema = Joi.alternatives()
  .try(idSchema, Joi.string().trim().pattern(/^bc_\d+_\d+$/))
  .required();
const parentIdSchema = Joi.alternatives()
  .try(
    Joi.number().integer().positive(),
    Joi.string().trim().pattern(/^bc_\d+_\d+$/),
    Joi.string().trim().pattern(/^\d+$/),
  )
  .allow(null);
const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

// Create comment (support guest + authenticated user)
// For guest: user_name is required
// For authenticated: user_name is optional (will be taken from req.user)
const createCommentV2 = Joi.object({
  blog_id: Joi.number().integer().positive().required(),
  blog_slug: Joi.string().trim().allow(""),
  user_name: Joi.string().trim().min(2).max(100).optional(), // Made optional for authenticated users
  comment: Joi.string().trim().min(1).max(1000).required(),
  parent_id: parentIdSchema,
});

const createCommentV1 = Joi.object({
  blogId: Joi.number().integer().positive().required(),
  blogSlug: Joi.string().trim().allow(""),
  userId: Joi.number().integer().positive().optional(),
  userName: Joi.string().trim().min(2).max(100).optional(), // Made optional for authenticated users
  userEmail: Joi.string().email().optional(),
  content: Joi.string().trim().min(1).max(1000).required(),
  parentId: parentIdSchema,
});

export const createComment = {
  body: Joi.alternatives().try(createCommentV2, createCommentV1),
};

// Update comment
export const updateComment = {
  params: Joi.object({
    id: idSchema,
  }),
  body: Joi.object({
    content: Joi.string().trim().min(5).max(1000).required(),
  }),
};

// Delete comment
export const deleteComment = {
  params: Joi.object({
    id: idSchema,
  }),
};

// Get comments by blog
export const getCommentsByBlogId = {
  params: Joi.object({
    blogPostId: idSchema,
  }),
  query: Joi.object({
    ...paginationSchema,
    includeReplies: Joi.string().valid("true", "false").default("false"),
  }),
};

// Get replies
export const getReplies = {
  params: Joi.object({
    commentId: commentIdSchema,
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};

// Like comment
export const likeComment = {
  params: Joi.object({
    id: idSchema,
  }),
};

// Get comment count
export const getCommentCount = {
  params: Joi.object({
    blogPostId: idSchema.optional(),
    blogId: idSchema.optional(),
  }).or("blogPostId", "blogId"),
};

// Get comments by user_id
export const getCommentsByUserId = {
  params: Joi.object({
    userId: Joi.string().trim().pattern(/^USR\d{6}$/).required(),
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};
