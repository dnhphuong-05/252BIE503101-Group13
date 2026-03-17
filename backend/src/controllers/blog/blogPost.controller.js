import blogPostService from "../../services/blog/blogPost.service.js";
import BlogPost from "../../models/blog/BlogPost.js";
import catchAsync from "../../utils/catchAsync.js";
import ApiError from "../../utils/ApiError.js";
import {
  successResponse,
  paginatedResponse,
  createdResponse,
} from "../../utils/response.js";

const slugify = (value = "") =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return undefined;
};

const normalizePositiveNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const nextValue = Number(value);
  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    return undefined;
  }

  return Math.round(nextValue);
};

const applyStatusFlags = (payload) => {
  const status =
    typeof payload.status === "string" ? payload.status.trim().toLowerCase() : "";
  if (!status) return;

  if (status === "published") {
    payload.is_published = true;
    payload.is_archived = false;
  } else if (status === "archived") {
    payload.is_published = false;
    payload.is_archived = true;
  } else {
    payload.is_published = false;
    payload.is_archived = false;
  }

  delete payload.status;
};

const normalizeAuthor = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const author = { ...value };
  const authorId = normalizePositiveNumber(author.author_id);

  if (authorId !== undefined) {
    author.author_id = authorId;
  } else {
    delete author.author_id;
  }

  return author;
};

const normalizeSeo = (value, fallbackImage = "") => {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const seo = { ...source };

  if (seo.meta_keywords !== undefined) {
    seo.meta_keywords = normalizeTags(seo.meta_keywords);
  }

  if (fallbackImage && !seo.og_image) {
    seo.og_image = fallbackImage;
  }

  return seo;
};

const preparePostPayload = (payload, { isCreate = false } = {}) => {
  applyStatusFlags(payload);

  const normalizedFeatured = normalizeBoolean(payload.is_featured);
  if (normalizedFeatured !== undefined) {
    payload.is_featured = normalizedFeatured;
  }

  const normalizedPublished = normalizeBoolean(payload.is_published);
  if (normalizedPublished !== undefined) {
    payload.is_published = normalizedPublished;
  }

  const normalizedArchived = normalizeBoolean(payload.is_archived);
  if (normalizedArchived !== undefined) {
    payload.is_archived = normalizedArchived;
  }

  if (payload.is_published === undefined && isCreate) {
    payload.is_published = false;
  }
  if (payload.is_archived === undefined && isCreate) {
    payload.is_archived = false;
  }
  if (payload.is_archived) {
    payload.is_published = false;
  }

  if (payload.categoryId && !payload.category_id) {
    payload.category_id = Number(payload.categoryId);
  }

  if (payload.category && !payload.category_id) {
    payload.category_id = Number(payload.category);
  }

  if (payload.tags !== undefined) {
    payload.tags = normalizeTags(payload.tags);
  }

  const readingTime = normalizePositiveNumber(payload.reading_time);
  if (readingTime !== undefined) {
    payload.reading_time = readingTime;
  } else if (payload.reading_time !== undefined) {
    delete payload.reading_time;
  }

  if (payload.author) {
    payload.author = normalizeAuthor(payload.author);
  } else if (isCreate) {
    payload.author = { name: payload.author_name || "Admin" };
  }

  if (payload.seo) {
    payload.seo = normalizeSeo(payload.seo, payload.thumbnail);
  } else if (isCreate && payload.thumbnail) {
    payload.seo = normalizeSeo({}, payload.thumbnail);
  } else if (payload.thumbnail) {
    payload["seo.og_image"] = payload.thumbnail;
  }

  if (payload.published_at === "") {
    delete payload.published_at;
  }

  if (payload.is_published && !payload.published_at) {
    payload.published_at = new Date();
  }

  return payload;
};

/**
 * Get all blog posts
 */
export const getAllPosts = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    categoryId,
    category_id,
    search,
    sortBy = "updated_at",
    sortOrder = "desc",
    includeArchived,
  } = req.query;

  const filter = {};
  const normalizedStatus =
    typeof status === "string" ? status.toLowerCase() : "";
  const includeArchivedFlag =
    includeArchived === "true" ||
    includeArchived === "1" ||
    normalizedStatus === "all";

  if (normalizedStatus === "published") {
    filter.is_published = true;
  } else if (normalizedStatus === "draft") {
    filter.is_published = false;
  } else if (normalizedStatus === "archived") {
    filter.is_archived = true;
  }

  if (!includeArchivedFlag && normalizedStatus !== "archived") {
    filter.is_archived = { $ne: true };
  }

  const resolvedCategory = categoryId ?? category_id;
  if (resolvedCategory) filter.category_id = Number(resolvedCategory);

  if (search && String(search).trim()) {
    const term = String(search).trim();
    const regex = new RegExp(term, "i");
    filter.$or = [
      { title: regex },
      { excerpt: regex },
      { slug: regex },
      { tags: regex },
      { "author.name": regex },
    ];
  }

  const sortField = typeof sortBy === "string" && sortBy ? sortBy : "updated_at";
  const sortDirection = String(sortOrder).toLowerCase() === "asc" ? 1 : -1;
  const sort = { [sortField]: sortDirection };

  const result = await blogPostService.getAll(filter, { page, limit, sort });

  paginatedResponse(
    res,
    result.items,
    result.pagination,
    "Blog posts retrieved successfully",
  );
});

/**
 * Get published posts
 */
export const getPublishedPosts = catchAsync(async (req, res) => {
  const { page = 1, limit = 10, categoryId } = req.query;

  const result = await blogPostService.getPublished({
    page,
    limit,
    categoryId,
  });

  paginatedResponse(
    res,
    result.items,
    result.pagination,
    "Published posts retrieved successfully",
  );
});

/**
 * Get featured posts
 */
export const getFeaturedPosts = catchAsync(async (req, res) => {
  const { limit = 5 } = req.query;
  const limitNum = parseInt(limit) || 5;

  const result = await blogPostService.getFeatured(limitNum);

  successResponse(res, result.items, "Featured posts retrieved successfully");
});

/**
 * Get post by ID
 */
export const getPostById = catchAsync(async (req, res) => {
  const post = await blogPostService.getById(req.params.id);

  successResponse(res, post, "Post retrieved successfully");
});

/**
 * Get post by slug
 */
export const getPostBySlug = catchAsync(async (req, res) => {
  const post = await blogPostService.getBySlug(req.params.slug);

  successResponse(res, post, "Post retrieved successfully");
});

/**
 * Create new post
 */
export const createPost = catchAsync(async (req, res) => {
  const payload = { ...req.body };
  const lastPost = await BlogPost.findOne().sort({ blog_id: -1 }).lean();
  const nextBlogId = lastPost ? lastPost.blog_id + 1 : 1;

  if (!payload.blog_id) {
    payload.blog_id = nextBlogId;
  }

  if (!payload.slug) {
    payload.slug = slugify(payload.title || `blog-${payload.blog_id}`);
  }

  preparePostPayload(payload, { isCreate: true });

  const post = await blogPostService.create(payload);

  createdResponse(res, post, "Post created successfully");
});

/**
 * Update post
 */
export const updatePost = catchAsync(async (req, res) => {
  const payload = { ...req.body };

  if (payload.title && !payload.slug) {
    payload.slug = slugify(payload.title);
  }

  preparePostPayload(payload);

  const post = await blogPostService.update(req.params.id, payload);

  successResponse(res, post, "Post updated successfully");
});

/**
 * Delete post
 */
export const deletePost = catchAsync(async (req, res) => {
  await blogPostService.delete(req.params.id);

  successResponse(res, null, "Post deleted successfully");
});

/**
 * Search posts
 */
export const searchPosts = catchAsync(async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;

  const result = await blogPostService.search(q, { page, limit });

  paginatedResponse(
    res,
    result.items,
    result.pagination,
    "Search results retrieved successfully",
  );
});

/**
 * Get posts by category
 */
export const getPostsByCategory = catchAsync(async (req, res) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const result = await blogPostService.getByCategory(categoryId, {
    page,
    limit,
  });

  paginatedResponse(
    res,
    result.items,
    result.pagination,
    "Posts retrieved successfully",
  );
});

/**
 * Increment views
 */
export const incrementViews = catchAsync(async (req, res) => {
  const post = await blogPostService.incrementViews(req.params.id);

  successResponse(res, post, "Views incremented successfully");
});

/**
 * Upload blog images
 */
export const uploadBlogImages = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest("Blog images are required");
  }

  const files = req.files.map((file) => ({
    url: file.path || file.secure_url || file.location || "",
    public_id: file.filename || file.public_id || file.originalname,
    original_name: file.originalname,
  }));

  const urls = files.map((file) => file.url).filter(Boolean);

  if (!urls.length) {
    throw ApiError.badRequest("Blog image upload failed");
  }

  successResponse(res, { urls, files }, "Upload images th\u00e0nh c\u00f4ng");
});

/**
 * Get popular posts
 */
export const getPopularPosts = catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;

  const result = await blogPostService.getPopular({ limit });

  successResponse(res, result.items, "Popular posts retrieved successfully");
});

/**
 * Get recent posts
 */
export const getRecentPosts = catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;

  const result = await blogPostService.getRecent({ limit });

  successResponse(res, result.items, "Recent posts retrieved successfully");
});

// Aliases for routes compatibility
export const getAll = getAllPosts;
export const getPublished = getPublishedPosts;
export const search = searchPosts;
export const getFeatured = getFeaturedPosts;
export const getById = getPostById;
export const getBySlug = getPostBySlug;
export const create = createPost;
export const update = updatePost;
export const deleteBlogPost = deletePost;
export const getByCategory = getPostsByCategory;
// incrementViews already has correct name
