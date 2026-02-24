import express from "express";
import { validate } from "../../middlewares/validate.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { requireAdmin } from "../../middlewares/role.middleware.js";
import * as validator from "../../validators/order/rentOrder.validator.js";
import * as rentOrderController from "../../controllers/order/rentOrder.controller.js";

const router = express.Router();

/**
 * @route   POST /api/rent-orders
 * @desc    Create rent order
 * @access  Public
 */
router.post(
  "/",
  validate(validator.createRentOrder),
  rentOrderController.createRentOrder,
);

/**
 * @route   GET /api/rent-orders
 * @desc    Get all rent orders (Admin)
 * @access  Private/Admin
 */
router.get(
  "/",
  protect,
  requireAdmin,
  validate(validator.getRentOrders),
  rentOrderController.getAllRentOrders,
);

/**
 * @route   GET /api/rent-orders/user/:user_id
 * @desc    Get rent orders by user_id
 * @access  Public
 */
router.get(
  "/user/:user_id",
  validate(validator.getRentOrdersByUserId),
  rentOrderController.getRentOrdersByUserId,
);

/**
 * @route   GET /api/rent-orders/guest/:guest_id
 * @desc    Get rent orders by guest_id
 * @access  Public
 */
router.get(
  "/guest/:guest_id",
  validate(validator.getRentOrdersByGuestId),
  rentOrderController.getRentOrdersByGuestId,
);

/**
 * @route   POST /api/rent-orders/:rent_order_id/return-request
 * @desc    User request return
 * @access  Private
 */
router.post(
  "/:rent_order_id/return-request",
  protect,
  validate(validator.getRentOrderById, "params"),
  validate(validator.requestReturnByUser),
  rentOrderController.requestReturnByUser,
);

/**
 * @route   POST /api/rent-orders/:rent_order_id/confirm-return
 * @desc    User confirm return shipment
 * @access  Private
 */
router.post(
  "/:rent_order_id/confirm-return",
  protect,
  validate(validator.getRentOrderById, "params"),
  validate(validator.confirmReturnShipment),
  rentOrderController.confirmReturnShipment,
);

/**
 * @route   POST /api/rent-orders/:rent_order_id/cancel
 * @desc    User cancel rent order
 * @access  Private
 */
router.post(
  "/:rent_order_id/cancel",
  protect,
  validate(validator.getRentOrderById, "params"),
  validate(validator.cancelRentOrderByUser),
  rentOrderController.cancelRentOrderByUser,
);

/**
 * @route   GET /api/rent-orders/:rent_order_id
 * @desc    Get rent order by rent_order_id (Admin)
 * @access  Private/Admin
 */
router.get(
  "/:rent_order_id",
  protect,
  requireAdmin,
  validate(validator.getRentOrderById, "params"),
  rentOrderController.getRentOrderById,
);

/**
 * @route   PATCH /api/rent-orders/:rent_order_id/status
 * @desc    Update rent order status/details (Admin)
 * @access  Private/Admin
 */
router.patch(
  "/:rent_order_id/status",
  protect,
  requireAdmin,
  validate(validator.getRentOrderById, "params"),
  validate(validator.updateRentOrderStatus),
  rentOrderController.updateRentOrderStatus,
);

export default router;
