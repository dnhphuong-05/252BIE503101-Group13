import express from "express";
import * as quickOrderController from "../../controllers/guest/quick-order.controller.js";
import * as quickOrderValidator from "../../validators/guest/quick-order.validator.js";
import { validate } from "../../middlewares/validate.middleware.js";

const router = express.Router();

/**
 * Quick Order Routes
 *
 * @description Routes để xử lý đơn hàng nhanh cho guest customers
 * @baseRoute /api/quick-orders
 */

/**
 * @route POST /api/quick-orders
 * @desc Tạo đơn hàng nhanh
 * @access Public
 */
router.post(
  "/",
  validate(quickOrderValidator.createQuickOrder),
  quickOrderController.createQuickOrder,
);

/**
 * @route GET /api/quick-orders/:orderCode
 * @desc Tra cứu đơn hàng theo mã
 * @access Public
 */
router.get(
  "/:orderCode",
  validate(quickOrderValidator.trackOrder),
  quickOrderController.trackOrder,
);

export default router;
