import express from "express";
import {
  getAllProducts,
  getProductFilters,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  permanentDeleteProduct,
  getRelatedProducts,
  getFeaturedProducts,
  getBestSellingProducts,
  getNewestProducts,
  updateProductStock,
  uploadProductImages,
} from "../controllers/product.controller.js";
import { validate } from "../middlewares/index.js";
import { productValidator } from "../validators/index.js";
import { uploadProductImages as uploadProductImagesMiddleware } from "../config/index.js";

const router = express.Router();

// ========== Public Routes ==========

/**
 * @route   GET /api/products
 * @desc    Get all products with filters and pagination
 * @access  Public
 */
router.get(
  "/",
  validate(productValidator.getProductsSchema, "query"),
  getAllProducts,
);

/**
 * @route   GET /api/products/filters
 * @desc    Get product filters metadata
 * @access  Public
 */
router.get("/filters", getProductFilters);

/**
 * @route   GET /api/products/featured
 * @desc    Get featured products
 * @access  Public
 */
router.get("/featured", getFeaturedProducts);

/**
 * @route   GET /api/products/best-selling
 * @desc    Get best selling products
 * @access  Public
 */
router.get("/best-selling", getBestSellingProducts);

/**
 * @route   GET /api/products/newest
 * @desc    Get newest products
 * @access  Public
 */
router.get("/newest", getNewestProducts);

/**
 * @route   POST /api/products/uploads
 * @desc    Upload product images
 * @access  Private/Admin
 */
router.post("/uploads", uploadProductImagesMiddleware.array("images", 8), uploadProductImages);

/**
 * @route   GET /api/products/:id/related
 * @desc    Get related products
 * @access  Public
 */
router.get(
  "/:id/related",
  validate(productValidator.getProductByIdSchema, "params"),
  getRelatedProducts,
);

/**
 * @route   GET /api/products/:id
 * @desc    Get product by ID or slug
 * @access  Public
 */
router.get(
  "/:id",
  validate(productValidator.getProductByIdSchema, "params"),
  getProductById,
);

// ========== Admin Routes ==========
// TODO: Add authentication & authorization middleware

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private/Admin
 */
router.post(
  "/",
  validate(productValidator.createProductSchema, "body"),
  createProduct,
);

/**
 * @route   PUT /api/products/:id
 * @desc    Update product
 * @access  Private/Admin
 */
router.put(
  "/:id",
  validate(productValidator.getProductByIdSchema, "params"),
  validate(productValidator.updateProductSchema, "body"),
  updateProduct,
);

/**
 * @route   PATCH /api/products/:id/stock
 * @desc    Update product stock
 * @access  Private/Admin
 */
router.patch(
  "/:id/stock",
  validate(productValidator.getProductByIdSchema, "params"),
  updateProductStock,
);

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete product (soft delete)
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  validate(productValidator.getProductByIdSchema, "params"),
  deleteProduct,
);

/**
 * @route   DELETE /api/products/:id/permanent
 * @desc    Delete product permanently
 * @access  Private/Admin
 */
router.delete(
  "/:id/permanent",
  validate(productValidator.getProductByIdSchema, "params"),
  permanentDeleteProduct,
);

export default router;
