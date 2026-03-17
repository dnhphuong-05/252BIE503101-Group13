import Joi from "joi";

const idSchema = Joi.number().integer().positive().required();
const slugSchema = Joi.string().trim().lowercase().required();
const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
};

const tagsSchema = Joi.alternatives().try(
  Joi.array().items(Joi.string().trim()),
  Joi.string().trim(),
);

const authorSchema = Joi.object({
  author_id: Joi.number().integer().positive(),
  name: Joi.string().trim(),
  role: Joi.string().trim().allow(""),
  avatar: Joi.string().trim().allow(""),
  bio: Joi.string().trim().allow(""),
});

const seoSchema = Joi.object({
  meta_title: Joi.string().trim().max(100).allow(""),
  meta_description: Joi.string().trim().max(200).allow(""),
  meta_keywords: tagsSchema,
  og_image: Joi.string().uri().allow(""),
});

export const createPost = {
  body: Joi.object({
    title: Joi.string().trim().min(5).max(200).required(),
    slug: Joi.string().trim().lowercase(),
    excerpt: Joi.string().trim().max(500).required(),
    content: Joi.string().required(),
    thumbnail: Joi.string().uri().required(),
    categoryId: Joi.number().integer().positive(),
    category_id: Joi.number().integer().positive(),
    tags: tagsSchema,
    status: Joi.string().valid("draft", "published", "archived").default("draft"),
    reading_time: Joi.number().integer().positive(),
    is_featured: Joi.boolean(),
    is_published: Joi.boolean(),
    is_archived: Joi.boolean(),
    published_at: Joi.date().iso(),
    author: authorSchema,
    seo: seoSchema,
  }),
};

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
    category_id: Joi.number().integer().positive(),
    tags: tagsSchema,
    status: Joi.string().valid("draft", "published", "archived"),
    reading_time: Joi.number().integer().positive(),
    is_featured: Joi.boolean(),
    is_published: Joi.boolean(),
    is_archived: Joi.boolean(),
    published_at: Joi.date().iso().allow(null),
    author: authorSchema,
    seo: seoSchema,
  }).min(1),
};

export const getPostById = {
  params: Joi.object({
    id: idSchema,
  }),
};

export const getPostBySlug = {
  params: Joi.object({
    slug: slugSchema,
  }),
};

export const deletePost = {
  params: Joi.object({
    id: idSchema,
  }),
};

export const getAllPosts = {
  query: Joi.object({
    ...paginationSchema,
    status: Joi.string().valid("draft", "published", "archived", "all"),
    categoryId: Joi.number().integer().positive(),
  }),
};

export const searchPosts = {
  query: Joi.object({
    q: Joi.string().trim().min(2).required(),
    ...paginationSchema,
  }),
};

export const getPostsByCategory = {
  params: Joi.object({
    categoryId: idSchema,
  }),
  query: Joi.object(paginationSchema),
};

export const getPublishedPosts = {
  query: Joi.object({
    ...paginationSchema,
    categoryId: Joi.number().integer().positive(),
  }),
};

export const getFeaturedPosts = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(5),
  }),
};

export const incrementViews = {
  params: Joi.object({
    id: idSchema,
  }),
};
