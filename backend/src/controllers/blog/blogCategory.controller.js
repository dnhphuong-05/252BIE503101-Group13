import blogCategoryService from "../../services/blog/blogCategory.service.js";
import catchAsync from "../../utils/catchAsync.js";
import {
  successResponse,
  paginatedResponse,
  createdResponse,
} from "../../utils/response.js";

/**
 * Get all categories
 */
export const getAllCategories = catchAsync(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const result = await blogCategoryService.getAll({}, { page, limit });

  paginatedResponse(
    res,
    result.items,
    result.pagination,
    "Categories retrieved successfully",
  );
});

/**
 * Get active categories
 */
export const getActiveCategories = catchAsync(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const result = await blogCategoryService.getActive({ page, limit });

  paginatedResponse(
    res,
    result.items,
    result.pagination,
    "Active categories retrieved successfully",
  );
});

/**
 * Get category by ID
 */
export const getCategoryById = catchAsync(async (req, res) => {
  const category = await blogCategoryService.getById(req.params.id);

  successResponse(res, category, "Category retrieved successfully");
});

/**
 * Get category by slug
 */
export const getCategoryBySlug = catchAsync(async (req, res) => {
  const category = await blogCategoryService.getBySlug(req.params.slug);

  successResponse(res, category, "Category retrieved successfully");
});

/**
 * Create category
 */
export const createCategory = catchAsync(async (req, res) => {
  const category = await blogCategoryService.create(req.body);

  createdResponse(res, category, "Category created successfully");
});

/**
 * Update category
 */
export const updateCategory = catchAsync(async (req, res) => {
  const category = await blogCategoryService.update(req.params.id, req.body);

  successResponse(res, category, "Category updated successfully");
});

/**
 * Delete category
 */
export const deleteCategory = catchAsync(async (req, res) => {
  await blogCategoryService.delete(req.params.id);

  successResponse(res, null, "Category deleted successfully");
});

/**
 * Update post count
 */
export const updatePostCount = catchAsync(async (req, res) => {
  const category = await blogCategoryService.updatePostCount(req.params.id);

  successResponse(res, category, "Post count updated successfully");
});

// Aliases for routes compatibility
export const getAll = getAllCategories;
export const getActive = getActiveCategories;
export const getById = getCategoryById;
export const getBySlug = getCategoryBySlug;
export const create = createCategory;
export const update = updateCategory;
// deleteCategory, updatePostCount already have correct names
