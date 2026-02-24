import guestCustomerService from "../../services/guest/guest-customer.service.js";
import catchAsync from "../../utils/catchAsync.js";
import { StatusCodes } from "http-status-codes";

/**
 * Guest Customer Controller
 *
 * @description Controller để xử lý các request liên quan đến guest customers
 */

/**
 * Tạo guest customer mới
 * @route POST /api/guest-customers
 */
const createGuestCustomer = catchAsync(async (req, res) => {
  const guestCustomer = await guestCustomerService.createGuestCustomer(
    req.body,
  );

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Tạo thông tin khách hàng thành công",
    data: guestCustomer,
  });
});

/**
 * Lấy thông tin guest customer theo ID
 * @route GET /api/guest-customers/:guestId
 */
const getGuestCustomer = catchAsync(async (req, res) => {
  const guestCustomer = await guestCustomerService.getGuestCustomerById(
    req.params.guestId,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    data: guestCustomer,
  });
});

/**
 * Lấy danh sách guest customers
 * @route GET /api/guest-customers
 */
const getGuestCustomers = catchAsync(async (req, res) => {
  const result = await guestCustomerService.getGuestCustomers(req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Lấy danh sách khách hàng thành công",
    ...result,
  });
});

/**
 * Cập nhật thông tin guest customer
 * @route PUT /api/guest-customers/:guestId
 */
const updateGuestCustomer = catchAsync(async (req, res) => {
  const guestCustomer = await guestCustomerService.updateGuestCustomer(
    req.params.guestId,
    req.body,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Cập nhật thông tin khách hàng thành công",
    data: guestCustomer,
  });
});

/**
 * Xóa guest customer
 * @route DELETE /api/guest-customers/:guestId
 */
const deleteGuestCustomer = catchAsync(async (req, res) => {
  await guestCustomerService.deleteGuestCustomer(req.params.guestId);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Xóa thông tin khách hàng thành công",
  });
});

/**
 * Tìm guest customer theo phone
 * @route GET /api/guest-customers/phone/:phone
 */
const findByPhone = catchAsync(async (req, res) => {
  const guestCustomer = await guestCustomerService.getGuestCustomerByPhone(
    req.params.phone,
  );

  if (!guestCustomer) {
    return res.status(StatusCodes.NOT_FOUND).json({
      success: false,
      message: "Không tìm thấy khách hàng với số điện thoại này",
    });
  }

  res.status(StatusCodes.OK).json({
    success: true,
    data: guestCustomer,
  });
});

/**
 * Ghi nhận đơn hàng mới cho guest customer
 * @route POST /api/guest-customers/:guestId/orders
 */
const recordOrder = catchAsync(async (req, res) => {
  const { orderAmount } = req.body;
  const guestCustomer = await guestCustomerService.recordOrder(
    req.params.guestId,
    orderAmount,
  );

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Ghi nhận đơn hàng thành công",
    data: guestCustomer,
  });
});

/**
 * Lấy thống kê guest customers
 * @route GET /api/guest-customers/statistics
 */
const getStatistics = catchAsync(async (req, res) => {
  const statistics = await guestCustomerService.getStatistics();

  res.status(StatusCodes.OK).json({
    success: true,
    data: statistics,
  });
});

/**
 * Tìm hoặc tạo guest customer
 * @route POST /api/guest-customers/find-or-create
 */
const findOrCreate = catchAsync(async (req, res) => {
  const guestCustomer = await guestCustomerService.findOrCreate(req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message:
      guestCustomer.order_count > 0
        ? "Tìm thấy thông tin khách hàng"
        : "Tạo thông tin khách hàng thành công",
    data: guestCustomer,
  });
});

export {
  createGuestCustomer,
  getGuestCustomer,
  getGuestCustomers,
  updateGuestCustomer,
  deleteGuestCustomer,
  findByPhone,
  recordOrder,
  getStatistics,
  findOrCreate,
};
