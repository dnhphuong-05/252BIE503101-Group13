import Joi from "joi";

// Common schemas
const idSchema = Joi.number().integer().positive().required();
const slugSchema = Joi.string().trim().lowercase().required();
const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
};

// Create blog post
export const createPost = {
  body: Joi.object({
    title: Joi.string().trim().min(5).max(200).required(),
    slug: Joi.string().trim().lowercase(),
    excerpt: Joi.string().trim().max(500),
    content: Joi.string().required(),
    thumbnail: Joi.string().uri(),
    categoryId: Joi.number().integer().positive(),
    tags: Joi.array().items(Joi.string().trim()),
    status: Joi.string()
      .valid("draft", "published", "archived")
      .default("draft"),
    featured: Joi.boolean().default(false),
    author: Joi.string().trim(),
    metaTitle: Joi.string().trim().max(100),
    metaDescription: Joi.string().trim().max(200),
    metaKeywords: Joi.array().items(Joi.string().trim()),
  }),
};

// Update blog post
export const updatePost = {
  params: Joi.object({
    id: idSchema,
  }),
  body: Joi.object({
    title: Joi.string().trim().min(5).max(200),
    slug: Joi.string().trim().lowercase(),
    excerpt: Joi.string().trim().max(500),
    content: Joi.string(),
    thumbnail: Joi.string().uri(),
    categoryId: Joi.number().integer().positive(),
    tags: Joi.array().items(Joi.string().trim()),
    status: Joi.string().valid("draft", "published", "archived"),
    featured: Joi.boolean(),
    author: Joi.string().trim(),
    metaTitle: Joi.string().trim().max(100),
    metaDescription: Joi.string().trim().max(200),
    metaKeywords: Joi.array().items(Joi.string().trim()),
  }).min(1),
};

// Get post by ID
export const getPostById = {
  params: Joi.object({
    id: idSchema,
  }),
};

// Get post by slug
export const getPostBySlug = {
  params: Joi.object({
    slug: slugSchema,
  }),
};

// Delete post
export const deletePost = {
  params: Joi.object({
    id: idSchema,
  }),
};

// Get all posts with pagination
export const getAllPosts = {
  query: Joi.object({
    ...paginationSchema,
    status: Joi.string().valid("draft", "published", "archived"),
    categoryId: Joi.number().integer().positive(),
  }),
};

// Search posts
export const searchPosts = {
  query: Joi.object({
    q: Joi.string().trim().min(2).required(),
    ...paginationSchema,
  }),
};

// Get posts by category
export const getPostsByCategory = {
  params: Joi.object({
    categoryId: idSchema,
  }),
  query: Joi.object(paginationSchema),
};

// Get published posts
export const getPublishedPosts = {
  query: Joi.object({
    ...paginationSchema,
    categoryId: Joi.number().integer().positive(),
  }),
};

// Get featured posts
export const getFeaturedPosts = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(5),
  }),
};

// Increment views
export const incrementViews = {
  params: Joi.object({
    id: idSchema,
  }),
};
