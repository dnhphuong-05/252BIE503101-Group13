import quickOrderService from "../../services/guest/quick-order.service.js";
import catchAsync from "../../utils/catchAsync.js";
import { StatusCodes } from "http-status-codes";

/**
 * Quick Order Controller
 *
 * @description Controller để xử lý đơn hàng nhanh
 */

/**
 * Tạo đơn hàng nhanh
 * @route POST /api/quick-orders
 */
const createQuickOrder = catchAsync(async (req, res) => {
  const result = await quickOrderService.createQuickOrder(req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: result.message,
    data: result.order,
  });
});

/**
 * Tra cứu đơn hàng
 * @route GET /api/quick-orders/:orderCode
 */
const trackOrder = catchAsync(async (req, res) => {
  const { orderCode } = req.params;
  const { token } = req.query;

  const order = await quickOrderService.trackOrder(orderCode, token);

  res.status(StatusCodes.OK).json({
    success: true,
    data: order,
  });
});

export { createQuickOrder, trackOrder };
