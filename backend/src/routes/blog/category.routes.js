import express from "express";
import { validate } from "../../middlewares/validate.js";
import * as validator from "../../validators/blog/blogCategory.validator.js";
import * as controller from "../../controllers/blog/blogCategory.controller.js";

const router = express.Router();

/**
 * @route   GET /api/blog/categories
 * @desc    Get all blog categories
 * @access  Public
 */
router.get("/", validate(validator.getAll), controller.getAll);

/**
 * @route   GET /api/blog/categories/active
 * @desc    Get active categories only
 * @access  Public
 */
router.get("/active", validate(validator.getActive), controller.getActive);

/**
 * @route   GET /api/blog/categories/slug/:slug
 * @desc    Get category by slug
 * @access  Public
 */
router.get("/slug/:slug", validate(validator.getBySlug), controller.getBySlug);

/**
 * @route   GET /api/blog/categories/:id
 * @desc    Get category by ID
 * @access  Public
 */
router.get("/:id", validate(validator.getById), controller.getById);

/**
 * @route   POST /api/blog/categories
 * @desc    Create new category
 * @access  Admin
 */
router.post("/", validate(validator.create), controller.create);

/**
 * @route   PUT /api/blog/categories/:id
 * @desc    Update category
 * @access  Admin
 */
router.put("/:id", validate(validator.update), controller.update);

/**
 * @route   PATCH /api/blog/categories/:id/post-count
 * @desc    Update post count for category
 * @access  System
 */
router.patch(
  "/:id/post-count",
  validate(validator.updatePostCount),
  controller.updatePostCount,
);

/**
 * @route   DELETE /api/blog/categories/:id
 * @desc    Delete category
 * @access  Admin
 */
router.delete(
  "/:id",
  validate(validator.deleteCategory),
  controller.deleteCategory,
);

export default router;
