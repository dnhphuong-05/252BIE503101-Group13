import express from "express";
import { validate } from "../../middlewares/validate.js";
import * as validator from "../../validators/user/user.validator.js";
import * as controller from "../../controllers/user/user.controller.js";

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination
 * @access  Admin
 */
router.get("/", validate(validator.getAll), controller.getAll);

/**
 * @route   GET /api/users/user/:user_id
 * @desc    Get user by user_id
 * @access  Admin/Self
 */
router.get(
  "/user/:user_id",
  validate(validator.getByUserId),
  controller.getUserByUserId,
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Admin/Self
 */
router.get("/:id", validate(validator.getById), controller.getById);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Public/Admin
 */
router.post("/", validate(validator.create), controller.create);

/**
 * @route   PUT /api/users/:id/profile
 * @desc    Update user profile
 * @access  Authenticated (Self)
 */
router.put(
  "/:id/profile",
  validate(validator.updateProfile),
  controller.updateProfile,
);

/**
 * @route   PUT /api/users/:id/password
 * @desc    Change user password
 * @access  Authenticated (Self)
 */
router.put(
  "/:id/password",
  validate(validator.changePassword),
  controller.changePassword,
);

/**
 * @route   POST /api/users/:id/addresses
 * @desc    Add new address
 * @access  Authenticated (Self)
 */
router.post(
  "/:id/addresses",
  validate(validator.addAddress),
  controller.addAddress,
);

/**
 * @route   PUT /api/users/:id/addresses/:addressId
 * @desc    Update address
 * @access  Authenticated (Self)
 */
router.put(
  "/:id/addresses/:addressId",
  validate(validator.updateAddress),
  controller.updateAddress,
);

/**
 * @route   DELETE /api/users/:id/addresses/:addressId
 * @desc    Delete address
 * @access  Authenticated (Self)
 */
router.delete(
  "/:id/addresses/:addressId",
  validate(validator.deleteAddress),
  controller.deleteAddress,
);

/**
 * @route   PATCH /api/users/:id/addresses/:addressId/default
 * @desc    Set default address
 * @access  Authenticated (Self)
 */
router.patch(
  "/:id/addresses/:addressId/default",
  validate(validator.setDefaultAddress),
  controller.setDefaultAddress,
);

/**
 * @route   PUT /api/users/:id/measurements
 * @desc    Update body measurements
 * @access  Authenticated (Self)
 */
router.put(
  "/:id/measurements",
  validate(validator.updateMeasurements),
  controller.updateMeasurements,
);

/**
 * @route   PATCH /api/users/:id/block
 * @desc    Block user
 * @access  Admin
 */
router.patch("/:id/block", validate(validator.blockUser), controller.blockUser);

/**
 * @route   PATCH /api/users/:id/unblock
 * @desc    Unblock user
 * @access  Admin
 */
router.patch(
  "/:id/unblock",
  validate(validator.unblockUser),
  controller.unblockUser,
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Admin
 */
router.delete("/:id", validate(validator.deleteUser), controller.deleteUser);

export default router;
