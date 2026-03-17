import express from "express";

// Import old product routes (keeping backward compatibility)
import productRoutes from "./product.routes.js";
import reviewRoutes from "./review.routes.js";

// Import all new route modules
import authRoutes from "./auth/auth.routes.js";
import blogPostRoutes from "./blog/post.routes.js";
import blogCommentRoutes from "./blog/comment.routes.js";
import blogCategoryRoutes from "./blog/category.routes.js";
import userRoutes from "./user/user.routes.js";
import adminUserRoutes from "./user/admin-user.routes.js";
import adminCommentRoutes from "./admin/comment.routes.js";
import meRoutes from "./user/me.routes.js";
import buyOrderRoutes from "./order/buyOrder.routes.js";
import rentOrderRoutes from "./order/rentOrder.routes.js";
import returnRoutes from "./order/return.routes.js";
import tailorOrderRoutes from "./order/tailorOrder.routes.js";
import contactMessageRoutes from "./contact/contactMessage.routes.js";
import guestCustomerRoutes from "./guest/guest-customer.routes.js";
import quickOrderRoutes from "./guest/quick-order.routes.js";
import cartRoutes from "./cart/cart.routes.js";
import checkoutRoutes from "./checkout/checkout.routes.js";
import notificationRoutes from "./notification.routes.js";
import chatboxRoutes from "./chatbox.routes.js";

const router = express.Router();

/**
 * Health check endpoint
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Old product routes (backward compatibility)
 */
router.use("/products", productRoutes);
router.use("/", reviewRoutes);

/**
 * Auth routes
 */
router.use("/auth", authRoutes);

/**
 * Blog routes
 */
router.use("/blog/posts", blogPostRoutes);
router.use("/blog/comments", blogCommentRoutes);
router.use("/blog/categories", blogCategoryRoutes);

/**
 * User routes
 */
router.use("/users", userRoutes);

/**
 * Me routes (authenticated)
 */
router.use("/me", meRoutes);

/**
 * Admin user management routes (protected)
 */
router.use("/admin/users", adminUserRoutes);

/**
 * Admin comment moderation routes (protected)
 */
router.use("/admin/comments", adminCommentRoutes);

/**
 * Buy order routes
 */
router.use("/buy-orders", buyOrderRoutes);

/**
 * Rent order routes
 */
router.use("/rent-orders", rentOrderRoutes);

/**
 * Return requests routes
 */
router.use("/returns", returnRoutes);

/**
 * Tailor order routes
 */
router.use("/tailor-orders", tailorOrderRoutes);

/**
 * Contact routes
 */
router.use("/contact", contactMessageRoutes);

/**
 * Guest customer routes
 */
router.use("/guest-customers", guestCustomerRoutes);

/**
 * Quick order routes
 */
router.use("/quick-orders", quickOrderRoutes);

/**
 * Cart routes
 */
router.use("/carts", cartRoutes);

/**
 * Checkout routes
 */
router.use("/checkout", checkoutRoutes);

/**
 * Notification routes
 */
router.use("/notifications", notificationRoutes);

/**
 * AI chatbox routes
 */
router.use("/chatbox", chatboxRoutes);

/**
 * 404 handler for undefined routes
 */
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

export default router;
