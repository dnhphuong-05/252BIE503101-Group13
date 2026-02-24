import cartService from "../../services/cart/cart.service.js";
import catchAsync from "../../utils/catchAsync.js";
import { successResponse, createdResponse } from "../../utils/response.js";

/**
 * GET /api/carts/me
 * Get active cart with items for current user
 */
export const getMyCart = catchAsync(async (req, res) => {
  const user_id = req.user?.user_id;
  const result = await cartService.getCartWithItems(user_id);
  successResponse(res, result, "Lấy giỏ hàng thành công");
});

/**
 * POST /api/carts/items
 * Add item to active cart
 */
export const addItem = catchAsync(async (req, res) => {
  const user_id = req.user?.user_id;
  const item = await cartService.addItem(user_id, req.body);
  createdResponse(res, item, "Đã thêm sản phẩm vào giỏ hàng");
});

/**
 * PATCH /api/carts/items/:cart_item_id
 * Update item quantity
 */
export const updateItem = catchAsync(async (req, res) => {
  const user_id = req.user?.user_id;
  const { cart_item_id } = req.params;
  const { quantity } = req.body;
  const item = await cartService.updateItemQuantity(
    user_id,
    cart_item_id,
    quantity,
  );
  successResponse(res, item, "Đã cập nhật số lượng");
});

/**
 * DELETE /api/carts/items/:cart_item_id
 * Remove item from cart
 */
export const removeItem = catchAsync(async (req, res) => {
  const user_id = req.user?.user_id;
  const { cart_item_id } = req.params;
  const item = await cartService.removeItem(user_id, cart_item_id);
  successResponse(res, item, "Đã xóa sản phẩm khỏi giỏ hàng");
});

/**
 * DELETE /api/carts/items
 * Clear all items in active cart
 */
export const clearItems = catchAsync(async (req, res) => {
  const user_id = req.user?.user_id;
  const result = await cartService.clearItems(user_id);
  successResponse(res, result, "Đã xóa toàn bộ sản phẩm trong giỏ hàng");
});

/**
 * POST /api/carts/checkout
 * Mark cart as checked out
 */
export const checkout = catchAsync(async (req, res) => {
  const user_id = req.user?.user_id;
  const cart = await cartService.checkout(user_id);
  successResponse(res, cart, "Giỏ hàng đã được checkout");
});
