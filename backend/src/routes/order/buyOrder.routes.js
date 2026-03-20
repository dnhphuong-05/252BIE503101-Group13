import express from "express";
import { validate } from "../../middlewares/validate.js";
import { protect, optionalAuthenticate } from "../../middlewares/auth.middleware.js";
import { requireAdmin } from "../../middlewares/role.middleware.js";
import * as validator from "../../validators/order/buyOrder.validator.js";
import * as buyOrderController from "../../controllers/order/buyOrder.controller.js";

const router = express.Router();

/**
 * @route   POST /api/buy-orders
 * @desc    Tạo đơn hàng mua nhanh
 * @access  Public
 */
router.post(
  "/",
  validate(validator.createBuyOrderSchema),
  buyOrderController.createBuyOrder
);

/**
 * @route   GET /api/buy-orders
 * @desc    Lấy tất cả đơn hàng (có phân trang và filter)
 * @access  Private/Admin
 */
router.get(
  "/",
  protect,
  requireAdmin,
  validate(validator.getBuyOrdersSchema),
  buyOrderController.getAllBuyOrders
);

/**
 * @route   GET /api/buy-orders/stats
 * @desc    Lấy thống kê đơn hàng
 * @access  Private/Admin
 */
router.get(
  "/stats",
  protect,
  requireAdmin,
  validate(validator.getStatsSchema),
  buyOrderController.getOrderStats
);

/**
 * @route   GET /api/buy-orders/dashboard-report
 * @desc    Bao cao dashboard theo ngay
 * @access  Private/Admin
 */
router.get(
  "/dashboard-report",
  protect,
  requireAdmin,
  validate({ query: validator.getDashboardReportSchema }),
  buyOrderController.getDashboardReport
);

/**
 * @route   GET /api/buy-orders/user/:user_id
 * @desc    Lấy đơn hàng theo user_id
 * @access  Private
 */
router.get(
  "/user/:user_id",
  validate(validator.getOrdersByUserIdSchema),
  buyOrderController.getBuyOrdersByUserId
);

/**
 * @route   GET /api/buy-orders/guest/:guest_id
 * @desc    Lấy đơn hàng theo guest_id
 * @access  Public
 */
router.get(
  "/guest/:guest_id",
  validate(validator.getOrdersByGuestIdSchema),
  buyOrderController.getBuyOrdersByGuestId
);

/**
 * @route   GET /api/buy-orders/:order_id
 * @desc    Lấy chi tiết đơn hàng theo order_id
 * @access  Public
 */
router.get(
  "/:order_id",
  validate(validator.getOrderByIdSchema),
  buyOrderController.getBuyOrderById
);

/**
 * @route   PATCH /api/buy-orders/:order_id/status
 * @desc    Cập nhật trạng thái đơn hàng
 * @access  Private/Admin
 */
router.patch(
  "/:order_id/status",
  protect,
  requireAdmin,
  validate(validator.getOrderByIdSchema, "params"),
  validate(validator.updateOrderStatusSchema),
  buyOrderController.updateOrderStatus
);

/**
 * @route   PATCH /api/buy-orders/:order_id/payment-status
 * @desc    Cập nhật trạng thái thanh toán
 * @access  Private/Admin
 */
router.patch(
  "/:order_id/payment-status",
  protect,
  requireAdmin,
  validate(validator.getOrderByIdSchema, "params"),
  validate(validator.updatePaymentStatusSchema),
  buyOrderController.updatePaymentStatus
);

/**
 * @route   PATCH /api/buy-orders/:order_id/tracking
 * @desc    Cập nhật thông tin vận chuyển
 * @access  Private/Admin
 */
router.patch(
  "/:order_id/tracking",
  protect,
  requireAdmin,
  validate(validator.getOrderByIdSchema, "params"),
  validate(validator.updateTrackingSchema),
  buyOrderController.updateTracking
);

/**
 * @route   POST /api/buy-orders/:order_id/cancel
 * @desc    Hủy đơn hàng
 * @access  Public/Private
 */
router.post(
  "/:order_id/cancel",
  optionalAuthenticate,
  validate(validator.getOrderByIdSchema, "params"),
  validate(validator.cancelOrderSchema),
  buyOrderController.cancelOrder
);

/**
 * @route   POST /api/buy-orders/:order_id/confirm-received
 * @desc    Khách xác nhận đã nhận hàng
 * @access  Private
 */
router.post(
  "/:order_id/confirm-received",
  protect,
  validate(validator.getOrderByIdSchema, "params"),
  validate(validator.confirmReceivedSchema),
  buyOrderController.confirmReceived,
);

/**
 * @route   POST /api/buy-orders/:order_id/return-request
 * @desc    Khách gửi yêu cầu hoàn trả
 * @access  Private
 */
router.post(
  "/:order_id/return-request",
  protect,
  validate(validator.getOrderByIdSchema, "params"),
  validate(validator.createReturnRequestSchema),
  buyOrderController.requestReturn,
);

export default router;
