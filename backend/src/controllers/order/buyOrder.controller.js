import buyOrderService from "../../services/order/buyOrder.service.js";
import catchAsync from "../../utils/catchAsync.js";
import {
  successResponse,
  paginatedResponse,
  createdResponse,
} from "../../utils/response.js";

/**
 * Tạo đơn hàng mua nhanh
 * POST /api/buy-orders
 */
export const createBuyOrder = catchAsync(async (req, res) => {
  const result = await buyOrderService.createBuyOrder(req.body);

  createdResponse(
    res,
    result,
    "Đơn hàng đã được tạo thành công"
  );
});

/**
 * Lấy tất cả đơn hàng (có phân trang)
 * GET /api/buy-orders
 */
export const getAllBuyOrders = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    order_status,
    payment_status,
    payment_method,
  } = req.query;

  const filter = {};
  if (order_status) filter.order_status = order_status;
  if (payment_status) filter.payment_status = payment_status;
  if (payment_method) filter.payment_method = payment_method;

  const result = await buyOrderService.getAll(filter, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: "-created_at",
  });

  paginatedResponse(
    res,
    result.items,
    result.pagination,
    "Danh sách đơn hàng được lấy thành công"
  );
});

/**
 * Lấy đơn hàng theo order_id
 * GET /api/buy-orders/:order_id
 */
export const getBuyOrderById = catchAsync(async (req, res) => {
  const order = await buyOrderService.getByOrderId(req.params.order_id);

  successResponse(res, order, "Đơn hàng được lấy thành công");
});

/**
 * Lấy đơn hàng theo user_id
 * GET /api/buy-orders/user/:user_id
 */
export const getBuyOrdersByUserId = catchAsync(async (req, res) => {
  const { user_id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const result = await buyOrderService.getByUserId(user_id, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  paginatedResponse(
    res,
    result.items,
    result.pagination,
    "Đơn hàng của người dùng được lấy thành công"
  );
});

/**
 * Lấy đơn hàng theo guest_id
 * GET /api/buy-orders/guest/:guest_id
 */
export const getBuyOrdersByGuestId = catchAsync(async (req, res) => {
  const { guest_id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const result = await buyOrderService.getByGuestId(guest_id, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  paginatedResponse(
    res,
    result.items,
    result.pagination,
    "Đơn hàng của khách được lấy thành công"
  );
});

/**
 * Cập nhật trạng thái đơn hàng
 * PATCH /api/buy-orders/:order_id/status
 */
export const updateOrderStatus = catchAsync(async (req, res) => {
  const { order_id } = req.params;
  const order = await buyOrderService.updateOrderStatus(
    order_id,
    req.body,
    req.user
  );

  successResponse(
    res,
    order,
    "Trạng thái đơn hàng đã được cập nhật"
  );
});

/**
 * Cập nhật trạng thái thanh toán
 * PATCH /api/buy-orders/:order_id/payment-status
 */
export const updatePaymentStatus = catchAsync(async (req, res) => {
  const { order_id } = req.params;
  const order = await buyOrderService.updatePaymentStatus(order_id, req.body);

  successResponse(
    res,
    order,
    "Trạng thái thanh toán đã được cập nhật"
  );
});

/**
 * Cập nhật thông tin vận chuyển
 * PATCH /api/buy-orders/:order_id/tracking
 */
export const updateTracking = catchAsync(async (req, res) => {
  const { order_id } = req.params;
  const order = await buyOrderService.updateTracking(order_id, req.body);

  successResponse(
    res,
    order,
    "Thông tin vận chuyển đã được cập nhật"
  );
});

/**
 * Hủy đơn hàng
 * POST /api/buy-orders/:order_id/cancel
 */
export const cancelOrder = catchAsync(async (req, res) => {
  const { order_id } = req.params;
  const { reason } = req.body;

  const order = await buyOrderService.cancelOrder(order_id, reason, req.user);

  successResponse(res, order, "Đơn hàng đã được hủy");
});

/**
 * Khách xác nhận đã nhận hàng
 * POST /api/buy-orders/:order_id/confirm-received
 */
export const confirmReceived = catchAsync(async (req, res) => {
  const { order_id } = req.params;
  const order = await buyOrderService.confirmReceived(order_id, req.user);
  successResponse(res, order, "Đã xác nhận nhận hàng");
});

/**
 * Khách gửi yêu cầu hoàn trả
 * POST /api/buy-orders/:order_id/return-request
 */
export const requestReturn = catchAsync(async (req, res) => {
  const { order_id } = req.params;
  const result = await buyOrderService.requestReturn(order_id, req.body, req.user);
  successResponse(res, result, "Yêu cầu hoàn trả đã được tạo");
});

/**
 * Lấy thống kê đơn hàng
 * GET /api/buy-orders/stats
 */
export const getOrderStats = catchAsync(async (req, res) => {
  const { user_id, guest_id, start_date, end_date } = req.query;

  const stats = await buyOrderService.getOrderStats({
    user_id,
    guest_id,
    start_date,
    end_date,
  });

  successResponse(
    res,
    stats,
    "Thống kê đơn hàng được lấy thành công"
  );
});
