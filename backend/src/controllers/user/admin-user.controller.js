import adminUserService from "../../services/user/admin-user.service.js";
import UserProfile from "../../models/user/UserProfile.js";
import catchAsync from "../../utils/catchAsync.js";
import {
  successResponse,
  paginatedResponse,
  createdResponse,
} from "../../utils/response.js";

/**
 * Get all users (Admin)
 * GET /api/admin/users
 */
export const getAllUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, role, status, search } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    const profileMatches = await UserProfile.find({
      full_name: { $regex: search, $options: "i" },
    })
      .select("user_id")
      .lean();
    const profileUserIds = profileMatches.map((item) => item.user_id);

    filter.$or = [
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { user_id: { $regex: search, $options: "i" } },
      ...(profileUserIds.length > 0
        ? [{ user_id: { $in: profileUserIds } }]
        : []),
    ];
  }

  const result = await adminUserService.getAllUsers(filter, { page, limit });

  paginatedResponse(
    res,
    result.data,
    result.pagination,
    "Lấy danh sách users thành công",
  );
});

/**
 * Get user by ID (Admin)
 * GET /api/admin/users/:id
 */
export const getUserById = catchAsync(async (req, res) => {
  const user = await adminUserService.getUserById(req.params.id);

  successResponse(res, user, "Lấy thông tin user thành công");
});

/**
 * Create staff or admin user (Super Admin only)
 * POST /api/admin/users
 */
export const createStaffOrAdmin = catchAsync(async (req, res) => {
  const user = await adminUserService.createStaffOrAdmin(req.body, req.user);

  createdResponse(res, user, "Tạo tài khoản thành công");
});

/**
 * Update user role (Super Admin only)
 * PATCH /api/admin/users/:id/role
 */
export const updateUserRole = catchAsync(async (req, res) => {
  const { role } = req.body;
  const user = await adminUserService.updateUserRole(
    req.params.id,
    role,
    req.user,
  );

  successResponse(res, user, "Cập nhật role thành công");
});

/**
 * Update user status (block/unblock) (Admin+)
 * PATCH /api/admin/users/:id/status
 */
export const updateUserStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  const user = await adminUserService.updateUserStatus(
    req.params.id,
    status,
    req.user,
  );

  const message = status === "blocked" ? "Đã block user" : "Đã unblock user";
  successResponse(res, user, message);
});

/**
 * Delete user (Super Admin only)
 * DELETE /api/admin/users/:id
 */
export const deleteUser = catchAsync(async (req, res) => {
  const result = await adminUserService.deleteUser(req.params.id, req.user);

  successResponse(res, result, "Đã xóa user thành công");
});

/**
 * Reset user password (Admin+)
 * POST /api/admin/users/:id/reset-password
 */
export const resetUserPassword = catchAsync(async (req, res) => {
  const { password } = req.body;
  const result = await adminUserService.resetUserPassword(
    req.params.id,
    password,
    req.user,
  );

  successResponse(res, result, "Reset password thành công");
});

/**
 * Get loyalty transactions by user (Admin)
 * GET /api/admin/users/:id/loyalty-transactions
 */
export const getUserLoyaltyTransactions = catchAsync(async (req, res) => {
  const result = await adminUserService.getLoyaltyTransactions(req.params.id, req.query);

  paginatedResponse(res, result.items, result.pagination, "Lấy lịch sử điểm thành công");
});
