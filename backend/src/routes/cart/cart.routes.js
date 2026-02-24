import express from "express";
import { validate } from "../../middlewares/validate.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import * as validator from "../../validators/cart/cart.validator.js";
import * as controller from "../../controllers/cart/cart.controller.js";

const router = express.Router();

router.use(authenticate);

/**
 * @route   GET /api/carts/me
 * @desc    Get current user's active cart and items
 * @access  Authenticated
 */
router.get("/me", validate(validator.getMyCart), controller.getMyCart);

/**
 * @route   POST /api/carts/items
 * @desc    Add item to cart
 * @access  Authenticated
 */
router.post("/items", validate(validator.addItem), controller.addItem);

/**
 * @route   PATCH /api/carts/items/:cart_item_id
 * @desc    Update cart item quantity
 * @access  Authenticated
 */
router.patch(
  "/items/:cart_item_id",
  validate(validator.updateItem),
  controller.updateItem,
);

/**
 * @route   DELETE /api/carts/items
 * @desc    Clear all items in cart
 * @access  Authenticated
 */
router.delete("/items", validate(validator.clearItems), controller.clearItems);

/**
 * @route   DELETE /api/carts/items/:cart_item_id
 * @desc    Remove item from cart
 * @access  Authenticated
 */
router.delete(
  "/items/:cart_item_id",
  validate(validator.removeItem),
  controller.removeItem,
);

/**
 * @route   POST /api/carts/checkout
 * @desc    Checkout active cart
 * @access  Authenticated
 */
router.post("/checkout", validate(validator.checkout), controller.checkout);

export default router;
