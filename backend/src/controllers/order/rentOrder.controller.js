import rentOrderService from "../../services/order/rentOrder.service.js";
import catchAsync from "../../utils/catchAsync.js";
import { createdResponse, paginatedResponse, successResponse } from "../../utils/response.js";

/**
 * Create rent order
 * POST /api/rent-orders
 */
export const createRentOrder = catchAsync(async (req, res) => {
  const result = await rentOrderService.createRentOrder(req.body);
  createdResponse(res, result, "Rent order created");
});

/**
 * Get all rent orders (Admin)
 * GET /api/rent-orders
 */
export const getAllRentOrders = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, rent_status, payment_status } = req.query;

  const filter = {};
  if (rent_status) filter.rent_status = rent_status;
  if (payment_status) filter["payment.payment_status"] = payment_status;

  const result = await rentOrderService.getAll(filter, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: "-created_at",
  });

  paginatedResponse(res, result.items, result.pagination, "Rent orders retrieved successfully");
});

/**
 * Get rent orders by user_id
 * GET /api/rent-orders/user/:user_id
 */
export const getRentOrdersByUserId = catchAsync(async (req, res) => {
  const { user_id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const result = await rentOrderService.getByUserId(user_id, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  paginatedResponse(res, result.items, result.pagination, "Rent orders retrieved successfully");
});

/**
 * Get rent orders by guest_id
 * GET /api/rent-orders/guest/:guest_id
 */
export const getRentOrdersByGuestId = catchAsync(async (req, res) => {
  const { guest_id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const result = await rentOrderService.getByGuestId(guest_id, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  paginatedResponse(res, result.items, result.pagination, "Rent orders retrieved successfully");
});

/**
 * Get rent order by rent_order_id
 * GET /api/rent-orders/:rent_order_id
 */
export const getRentOrderById = catchAsync(async (req, res) => {
  const order = await rentOrderService.getByRentOrderId(req.params.rent_order_id);
  successResponse(res, order, "Rent order retrieved successfully");
});

/**
 * Update rent order status/details
 * PATCH /api/rent-orders/:rent_order_id/status
 */
export const updateRentOrderStatus = catchAsync(async (req, res) => {
  const order = await rentOrderService.updateRentOrderStatus(
    req.params.rent_order_id,
    req.body,
    req.user,
  );
  successResponse(res, order, "Rent order updated successfully");
});

/**
 * User request return
 * POST /api/rent-orders/:rent_order_id/return-request
 */
export const requestReturnByUser = catchAsync(async (req, res) => {
  const order = await rentOrderService.requestReturnByUser(
    req.params.rent_order_id,
    req.body,
    req.user,
  );
  successResponse(res, order, "Đã gửi yêu cầu trả hàng");
});

/**
 * User confirm return shipment
 * POST /api/rent-orders/:rent_order_id/confirm-return
 */
export const confirmReturnShipment = catchAsync(async (req, res) => {
  const order = await rentOrderService.confirmReturnShipment(
    req.params.rent_order_id,
    req.body,
    req.user,
  );
  successResponse(res, order, "Đã xác nhận gửi hàng trả");
});

/**
 * User cancel rent order
 * POST /api/rent-orders/:rent_order_id/cancel
 */
export const cancelRentOrderByUser = catchAsync(async (req, res) => {
  const order = await rentOrderService.cancelRentOrderByUser(
    req.params.rent_order_id,
    req.body,
    req.user,
  );
  successResponse(res, order, "Đã hủy đơn thuê");
});
