import returnService from "../../services/order/return.service.js";
import catchAsync from "../../utils/catchAsync.js";
import { successResponse, paginatedResponse } from "../../utils/response.js";

export const getAllReturns = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const filter = {};
  if (status) {
    filter.status = status;
  }
  if (search) {
    const keyword = search.toString().trim();
    if (keyword) {
      filter.$or = [
        { return_id: { $regex: keyword, $options: "i" } },
        { order_code: { $regex: keyword, $options: "i" } },
        { "customer_info.full_name": { $regex: keyword, $options: "i" } },
        { "customer_info.phone": { $regex: keyword, $options: "i" } },
      ];
    }
  }

  const result = await returnService.getAll(filter, {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: "-requested_at",
  });

  paginatedResponse(res, result.items, result.pagination, "Returns retrieved successfully");
});

export const getReturnById = catchAsync(async (req, res) => {
  const record = await returnService.getByReturnId(req.params.return_id);
  successResponse(res, record, "Return retrieved successfully");
});

export const updateReturnStatus = catchAsync(async (req, res) => {
  const record = await returnService.updateReturnStatus(req.params.return_id, req.body, req.user);
  successResponse(res, record, "Return updated successfully");
});
