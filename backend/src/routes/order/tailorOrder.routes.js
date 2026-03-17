import express from "express";
import { uploadTailorOrderImages as uploadTailorOrderImagesMiddleware } from "../../config/index.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { requireStaff } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.js";
import * as tailorOrderController from "../../controllers/order/tailorOrder.controller.js";
import * as validator from "../../validators/order/tailorOrder.validator.js";

const router = express.Router();

router.get(
  "/",
  protect,
  requireStaff,
  validate(validator.getTailorOrdersSchema),
  tailorOrderController.getAllTailorOrders,
);

router.get(
  "/stats",
  protect,
  requireStaff,
  tailorOrderController.getTailorOrderStats,
);

router.post(
  "/from-contact/:contact_id",
  protect,
  requireStaff,
  validate(validator.createTailorOrderFromContactSchema),
  tailorOrderController.createTailorOrderFromContact,
);

router.post(
  "/uploads",
  protect,
  requireStaff,
  uploadTailorOrderImagesMiddleware.array("images", 12),
  tailorOrderController.uploadTailorOrderImages,
);

router.get(
  "/:order_id",
  protect,
  requireStaff,
  validate(validator.getTailorOrderByIdSchema),
  tailorOrderController.getTailorOrderById,
);

router.patch(
  "/:order_id",
  protect,
  requireStaff,
  validate(validator.getTailorOrderByIdSchema),
  validate(validator.updateTailorOrderSchema),
  tailorOrderController.updateTailorOrder,
);

router.post(
  "/:order_id/generate-shipment",
  protect,
  requireStaff,
  validate(validator.getTailorOrderByIdSchema),
  validate(validator.generateTailorShipmentSchema),
  tailorOrderController.generateTailorShipment,
);

export default router;
