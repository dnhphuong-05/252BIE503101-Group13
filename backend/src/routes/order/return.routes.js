import express from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import { requireAdmin } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.js";
import * as validator from "../../validators/order/return.validator.js";
import * as controller from "../../controllers/order/return.controller.js";

const router = express.Router();

router.get(
  "/",
  protect,
  requireAdmin,
  validate(validator.getReturnsSchema, "query"),
  controller.getAllReturns,
);

router.get(
  "/:return_id",
  protect,
  requireAdmin,
  validate(validator.getReturnByIdSchema, "params"),
  controller.getReturnById,
);

router.patch(
  "/:return_id/status",
  protect,
  requireAdmin,
  validate(validator.getReturnByIdSchema, "params"),
  validate(validator.updateReturnStatusSchema),
  controller.updateReturnStatus,
);

export default router;
