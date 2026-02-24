import userService from "../../services/user/user.service.js";
import catchAsync from "../../utils/catchAsync.js";
import {
  successResponse,
  paginatedResponse,
  createdResponse,
} from "../../utils/response.js";

/**
 * Get all users
 */
export const getAllUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, role, status } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;

  const result = await userService.getAllUsers(filter, { page, limit });

  paginatedResponse(
    res,
    result.items,
    result.pagination,
    "Users retrieved successfully",
  );
});

/**
 * Get user by ID
 */
export const getUserById = catchAsync(async (req, res) => {
  const user = await userService.getById(req.params.id);

  successResponse(res, user, "User retrieved successfully");
});

/**
 * Get user by user ID
 */
export const getUserByUserId = catchAsync(async (req, res) => {
  const user = await userService.getByUserId(req.params.user_id);

  successResponse(res, user, "User retrieved successfully");
});

/**
 * Create user
 */
export const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);

  createdResponse(res, user, "User created successfully");
});

/**
 * Update user profile
 */
export const updateProfile = catchAsync(async (req, res) => {
  const user = await userService.updateProfile(req.params.id, req.body);

  successResponse(res, user, "Profile updated successfully");
});

/**
 * Change password
 */
export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await userService.changePassword(
    req.params.id,
    currentPassword,
    newPassword,
  );

  successResponse(res, user, "Password changed successfully");
});

/**
 * Add address
 */
export const addAddress = catchAsync(async (req, res) => {
  const user = await userService.addAddress(req.params.id, req.body);

  successResponse(res, user, "Address added successfully");
});

/**
 * Update address
 */
export const updateAddress = catchAsync(async (req, res) => {
  const { addressId } = req.params;

  const user = await userService.updateAddress(
    req.params.id,
    addressId,
    req.body,
  );

  successResponse(res, user, "Address updated successfully");
});

/**
 * Delete address
 */
export const deleteAddress = catchAsync(async (req, res) => {
  const { addressId } = req.params;

  const user = await userService.deleteAddress(req.params.id, addressId);

  successResponse(res, user, "Address deleted successfully");
});

/**
 * Set default address
 */
export const setDefaultAddress = catchAsync(async (req, res) => {
  const { addressId } = req.params;

  const user = await userService.setDefaultAddress(req.params.id, addressId);

  successResponse(res, user, "Default address set successfully");
});

/**
 * Update measurements
 */
export const updateMeasurements = catchAsync(async (req, res) => {
  const user = await userService.updateMeasurements(req.params.id, req.body);

  successResponse(res, user, "Measurements updated successfully");
});

/**
 * Block user
 */
export const blockUser = catchAsync(async (req, res) => {
  const user = await userService.blockUser(req.params.id);

  successResponse(res, user, "User blocked successfully");
});

/**
 * Unblock user
 */
export const unblockUser = catchAsync(async (req, res) => {
  const user = await userService.unblockUser(req.params.id);

  successResponse(res, user, "User unblocked successfully");
});

/**
 * Delete user
 */
export const deleteUser = catchAsync(async (req, res) => {
  await userService.delete(req.params.id);

  successResponse(res, null, "User deleted successfully");
});

// Aliases for routes compatibility
export const getAll = getAllUsers;
export const getById = getUserById;
export const getByUserId = getUserByUserId;
export const create = createUser;
// updateProfile, changePassword, addAddress, updateAddress, deleteAddress, setDefaultAddress, updateMeasurements, blockUser, unblockUser, deleteUser already have correct names
