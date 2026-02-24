import express from "express";
import { validate } from "../../middlewares/validate.js";
import { optionalAuthenticate } from "../../middlewares/auth.middleware.js";
import * as validator from "../../validators/checkout/checkout.validator.js";
import * as controller from "../../controllers/checkout/checkout.controller.js";

const router = express.Router();

/**
 * @route   POST /api/checkout/buy
 * @desc    Create buy order from cart (user) or buy-now items (guest)
 * @access  Public (optional auth)
 */
router.post(
  "/buy",
  optionalAuthenticate,
  validate(validator.createCheckout),
  controller.createCheckout,
);

export default router;
