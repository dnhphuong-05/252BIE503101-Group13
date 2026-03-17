import tailorOrderService from "../../services/order/tailorOrder.service.js";
import catchAsync from "../../utils/catchAsync.js";
import ApiError from "../../utils/ApiError.js";
import {
  successResponse,
  paginatedResponse,
  createdResponse,
} from "../../utils/response.js";

export const getAllTailorOrders = catchAsync(async (req, res) => {
  const result = await tailorOrderService.getAllTailorOrders(req.query);

  paginatedResponse(
    res,
    result.items,
    result.pagination,
    "Danh sach don may do duoc lay thanh cong",
  );
});

export const getTailorOrderStats = catchAsync(async (req, res) => {
  const stats = await tailorOrderService.getStatistics();

  successResponse(res, stats, "Thong ke don may do duoc lay thanh cong");
});

export const getTailorOrderById = catchAsync(async (req, res) => {
  const order = await tailorOrderService.getById(req.params.order_id);

  successResponse(res, order, "Chi tiet don may do duoc lay thanh cong");
});

export const createTailorOrderFromContact = catchAsync(async (req, res) => {
  const result = await tailorOrderService.createFromContact(
    req.params.contact_id,
    req.user,
  );

  if (result.existed) {
    successResponse(res, result.order, "Da mo don may do hien co");
    return;
  }

  createdResponse(res, result.order, "Da tao don may do tu inbox");
});

export const updateTailorOrder = catchAsync(async (req, res) => {
  const order = await tailorOrderService.updateTailorOrder(
    req.params.order_id,
    req.body,
    req.user,
  );

  successResponse(res, order, "Da cap nhat don may do");
});

export const generateTailorShipment = catchAsync(async (req, res) => {
  const order = await tailorOrderService.generateShipment(
    req.params.order_id,
    req.body,
    req.user,
  );

  successResponse(res, order, "Da tao van don gia lap cho don may do");
});

export const uploadTailorOrderImages = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest("Tailor order images are required");
  }

  const files = req.files.map((file) => ({
    url: file.path || file.secure_url || file.location || "",
    public_id: file.filename || file.public_id || file.originalname,
    original_name: file.originalname,
  }));

  const urls = files.map((file) => file.url).filter(Boolean);

  if (!urls.length) {
    throw ApiError.badRequest("Tailor order image upload failed");
  }

  successResponse(res, { urls, files }, "Da tai anh don may do thanh cong");
});
