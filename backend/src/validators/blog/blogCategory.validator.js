import Joi from "joi";

const idSchema = Joi.number().integer().positive().required();
const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
};

// Create category
export const createCategory = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    slug: Joi.string().trim().lowercase(),
    description: Joi.string().trim().max(500),
    status: Joi.string().valid("active", "inactive").default("active"),
  }),
};

// Update category
export const updateCategory = {
  params: Joi.object({
    id: idSchema,
  }),
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    slug: Joi.string().trim().lowercase(),
    description: Joi.string().trim().max(500),
    status: Joi.string().valid("active", "inactive"),
  }).min(1),
};

// Get category by ID
export const getCategoryById = {
  params: Joi.object({
    id: idSchema,
  }),
};

// Get category by slug
export const getCategoryBySlug = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().required(),
  }),
};

// Delete category
export const deleteCategory = {
  params: Joi.object({
    id: idSchema,
  }),
};

// Get all categories
export const getAllCategories = {
  query: Joi.object(paginationSchema),
};

// Get active categories
export const getActiveCategories = {
  query: Joi.object(paginationSchema),
};

// Update post count
export const updatePostCount = {
  params: Joi.object({
    id: idSchema,
  }),
};

// Aliases for route compatibility
export const create = createCategory;
export const update = updateCategory;
export const getAll = getAllCategories;
export const getActive = getActiveCategories;
export const getById = getCategoryById;
export const getBySlug = getCategoryBySlug;
