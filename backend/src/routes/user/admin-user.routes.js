import express from "express";
import * as adminUserController from "../../controllers/user/admin-user.controller.js";
import {
  requireSuperAdmin,
  requireAdmin,
} from "../../middlewares/role.middleware.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import * as adminUserValidator from "../../validators/user/admin-user.validator.js";

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(protect);

/**
 * GET /api/admin/users
 * Get all users with filters
 * @access Admin+
 */
router.get("/", requireAdmin, adminUserController.getAllUsers);

/**
 * GET /api/admin/users/:id
 * Get user by ID
 * @access Admin+
 */
router.get("/:id", requireAdmin, adminUserController.getUserById);

/**
 * GET /api/admin/users/:id/loyalty-transactions
 * Get loyalty transactions by user
 * @access Admin+
 */
router.get(
  "/:id/loyalty-transactions",
  requireAdmin,
  validate(adminUserValidator.getLoyaltyTransactions, "query"),
  adminUserController.getUserLoyaltyTransactions,
);

/**
 * POST /api/admin/users
 * Create staff or admin user
 * @access Super Admin only
 */
router.post(
  "/",
  requireSuperAdmin,
  validate(adminUserValidator.createStaffOrAdmin),
  adminUserController.createStaffOrAdmin,
);

/**
 * PATCH /api/admin/users/:id/role
 * Update user role
 * @access Super Admin only
 */
router.patch(
  "/:id/role",
  requireSuperAdmin,
  validate(adminUserValidator.updateRole),
  adminUserController.updateUserRole,
);

/**
 * PATCH /api/admin/users/:id/status
 * Block/Unblock user
 * @access Admin+
 */
router.patch(
  "/:id/status",
  requireAdmin,
  validate(adminUserValidator.updateStatus),
  adminUserController.updateUserStatus,
);

/**
 * POST /api/admin/users/:id/reset-password
 * Reset user password
 * @access Admin+
 */
router.post(
  "/:id/reset-password",
  requireAdmin,
  validate(adminUserValidator.resetPassword),
  adminUserController.resetUserPassword,
);

/**
 * DELETE /api/admin/users/:id
 * Delete user permanently
 * @access Super Admin only
 */
router.delete("/:id", requireSuperAdmin, adminUserController.deleteUser);

export default router;
