import express from "express";
// import { validate } from "../../middlewares/validate.js";
// import * as validator from "../../validators/blog/blogPost.validator.js";
import * as controller from "../../controllers/blog/blogPost.controller.js";
import { uploadBlogImages as uploadBlogImagesMiddleware } from "../../config/index.js";

const router = express.Router();

/**
 * @route   GET /api/blog/posts
 * @desc    Get all blog posts with pagination, filters
 * @access  Public
 */
router.get("/", controller.getAllPosts);

/**
 * @route   GET /api/blog/posts/search
 * @desc    Search blog posts by keyword
 * @access  Public
 */
router.get("/search", controller.searchPosts);

/**
 * @route   GET /api/blog/posts/published
 * @desc    Get published posts only
 * @access  Public
 */
router.get("/published", controller.getPublishedPosts);

/**
 * @route   GET /api/blog/posts/featured
 * @desc    Get featured posts
 * @access  Public
 */
router.get("/featured", controller.getFeaturedPosts);

/**
 * @route   GET /api/blog/posts/category/:categoryId
 * @desc    Get posts by category
 * @access  Public
 */
router.get("/category/:categoryId", controller.getPostsByCategory);

/**
 * @route   GET /api/blog/posts/slug/:slug
 * @desc    Get blog post by slug
 * @access  Public
 */
router.get("/slug/:slug", controller.getPostBySlug);

/**
 * @route   POST /api/blog/posts/uploads
 * @desc    Upload blog images
 * @access  Admin
 */
router.post(
  "/uploads",
  uploadBlogImagesMiddleware.array("images", 5),
  controller.uploadBlogImages,
);

/**
 * @route   GET /api/blog/posts/:id
 * @desc    Get blog post by ID
 * @access  Public
 */
router.get("/:id", controller.getPostById);

/**
 * @route   POST /api/blog/posts
 * @desc    Create new blog post
 * @access  Admin
 */
router.post("/", controller.createPost);

/**
 * @route   PUT /api/blog/posts/:id
 * @desc    Update blog post
 * @access  Admin
 */
router.put("/:id", controller.updatePost);

/**
 * @route   PATCH /api/blog/posts/:id/views
 * @desc    Increment views count
 * @access  Public
 */
router.patch("/:id/views", controller.incrementViews);

/**
 * @route   DELETE /api/blog/posts/:id
 * @desc    Delete blog post
 * @access  Admin
 */
router.delete("/:id", controller.deletePost);

export default router;
