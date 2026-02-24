import User from "../../models/user/User.js";
import UserProfile from "../../models/user/UserProfile.js";
import UserAddress from "../../models/user/UserAddress.js";
import UserMeasurement from "../../models/user/UserMeasurement.js";
import UserLoyalty from "../../models/user/UserLoyalty.js";
import LoyaltyTransaction from "../../models/user/LoyaltyTransaction.js";
import BuyOrder from "../../models/order/BuyOrder.js";
import RentOrder from "../../models/order/RentOrder.js";
import { Roles, isValidRole } from "../../constants/roles.js";
import ApiError from "../../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

/**
 * Get all users with advanced filtering (Admin)
 */
const getAllUsers = async (filter = {}, options = {}) => {
  const { page = 1, limit = 20, sortBy = "-created_at" } = options;
  const skip = (page - 1) * limit;

  const query = User.find(filter)
    .select("-password_hash")
    .sort(sortBy)
    .limit(parseInt(limit))
    .skip(skip)
    .lean();

  const [users, total] = await Promise.all([
    query,
    User.countDocuments(filter),
  ]);

  const userIds = users.map((user) => user.user_id).filter(Boolean);
  const [profiles, loyalties, buyCounts, rentCounts] = await Promise.all([
    UserProfile.find({ user_id: { $in: userIds } }).lean(),
    UserLoyalty.find({ user_id: { $in: userIds } }).lean(),
    userIds.length
      ? BuyOrder.aggregate([
          { $match: { user_id: { $in: userIds } } },
          { $group: { _id: "$user_id", count: { $sum: 1 } } },
        ])
      : [],
    userIds.length
      ? RentOrder.aggregate([
          { $match: { user_id: { $in: userIds } } },
          { $group: { _id: "$user_id", count: { $sum: 1 } } },
        ])
      : [],
  ]);
  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile]),
  );
  const loyaltyMap = new Map(
    loyalties.map((loyalty) => [loyalty.user_id, loyalty]),
  );
  const buyCountMap = new Map(
    buyCounts.map((item) => [item._id, item.count]),
  );
  const rentCountMap = new Map(
    rentCounts.map((item) => [item._id, item.count]),
  );

  const data = users.map((user) => ({
    ...user,
    profile: profileMap.get(user.user_id) || null,
    loyalty: loyaltyMap.get(user.user_id) || null,
    buy_order_count: buyCountMap.get(user.user_id) || 0,
    rent_order_count: rentCountMap.get(user.user_id) || 0,
  }));

  const pages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages,
      totalPages: pages,
    },
  };
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-password_hash").lean();

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const [
    profile,
    loyalty,
    addresses,
    measurements,
    buyOrderCount,
    rentOrderCount,
  ] = await Promise.all([
    UserProfile.findOne({ user_id: user.user_id }).lean(),
    UserLoyalty.findOne({ user_id: user.user_id }).lean(),
    UserAddress.find({ user_id: user.user_id })
      .sort({ is_default: -1, created_at: -1 })
      .lean(),
    UserMeasurement.find({ user_id: user.user_id })
      .sort({ measured_at: -1, created_at: -1 })
      .limit(5)
      .lean(),
    BuyOrder.countDocuments({ user_id: user.user_id }),
    RentOrder.countDocuments({ user_id: user.user_id }),
  ]);
  const latestMeasurement = measurements?.[0] || null;

  return {
    ...user,
    profile: profile || null,
    loyalty: loyalty || null,
    addresses: addresses || [],
    latest_measurement: latestMeasurement || null,
    measurements: measurements || [],
    buy_order_count: buyOrderCount || 0,
    rent_order_count: rentOrderCount || 0,
  };
};

/**
 * Create staff or admin user (only for SUPER_ADMIN)
 * @param {Object} userData - User data
 * @param {Object} createdBy - User creating this account (must be super_admin)
 */
const createStaffOrAdmin = async (userData, createdBy) => {
  // ✅ Validate creator is super_admin
  if (createdBy.role !== Roles.SUPER_ADMIN) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Chỉ Super Admin mới có quyền tạo Staff/Admin",
    );
  }

  const { full_name, email, phone, password, role, avatar } = userData;

  // ✅ Validate role
  if (!role || ![Roles.STAFF, Roles.ADMIN].includes(role)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Role phải là staff hoặc admin",
    );
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(StatusCodes.CONFLICT, "Email đã được sử dụng");
  }

  // Check if phone already exists
  if (phone) {
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      throw new ApiError(StatusCodes.CONFLICT, "Số điện thoại đã được sử dụng");
    }
  }

  // Create user (user_id and password hash will be auto-generated)
  const user = await User.create({
    email,
    phone: phone || "",
    password_hash: password,
    role,
    status: "active",
  });

  await Promise.all([
    UserProfile.create({
      user_id: user.user_id,
      full_name,
      avatar: avatar || "",
    }),
    UserLoyalty.create({
      user_id: user.user_id,
      total_points: 0,
    }),
  ]);

  // Return without password
  const userObject = user.toObject();
  delete userObject.password_hash;
  const profile = await UserProfile.findOne({ user_id: user.user_id }).lean();
  const loyalty = await UserLoyalty.findOne({ user_id: user.user_id }).lean();
  userObject.profile = profile || null;
  userObject.loyalty = loyalty || null;

  return userObject;
};

/**
 * Update user role (only for SUPER_ADMIN)
 * @param {string} userId - User ID to update
 * @param {string} newRole - New role
 * @param {Object} updatedBy - User performing the update (must be super_admin)
 */
const updateUserRole = async (userId, newRole, updatedBy) => {
  // ✅ Validate updater is super_admin
  if (updatedBy.role !== Roles.SUPER_ADMIN) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Chỉ Super Admin mới có quyền thay đổi role",
    );
  }

  // ✅ Validate new role
  if (!isValidRole(newRole)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Role không hợp lệ");
  }

  // ⚠️ Prevent changing super_admin role
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User không tồn tại");
  }

  if (targetUser.role === Roles.SUPER_ADMIN) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Không thể thay đổi role của Super Admin",
    );
  }

  // ⚠️ Prevent setting to super_admin from this endpoint
  if (newRole === Roles.SUPER_ADMIN) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Không thể cấp quyền Super Admin qua endpoint này (chỉ qua seed script)",
    );
  }

  // Update role
  targetUser.role = newRole;
  await targetUser.save();

  const userObject = targetUser.toObject();
  delete userObject.password_hash;
  const profile = await UserProfile.findOne({
    user_id: targetUser.user_id,
  }).lean();
  const loyalty = await UserLoyalty.findOne({
    user_id: targetUser.user_id,
  }).lean();

  return {
    ...userObject,
    profile: profile || null,
    loyalty: loyalty || null,
  };
};

/**
 * Update user status (block/unblock) - Admin trở lên
 * @param {string} userId - User ID to update
 * @param {string} newStatus - 'active' or 'blocked'
 * @param {Object} updatedBy - User performing the update
 */
const updateUserStatus = async (userId, newStatus, updatedBy) => {
  // ✅ Validate updater has at least ADMIN role
  if (updatedBy.role !== Roles.ADMIN && updatedBy.role !== Roles.SUPER_ADMIN) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Cần quyền Admin để thay đổi trạng thái user",
    );
  }

  // ✅ Validate status
  if (!["active", "blocked"].includes(newStatus)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Status không hợp lệ");
  }

  // ⚠️ Prevent blocking super_admin or admins (unless by super_admin)
  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User không tồn tại");
  }

  if (targetUser.role === Roles.SUPER_ADMIN) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Không thể thay đổi trạng thái của Super Admin",
    );
  }

  if (targetUser.role === Roles.ADMIN && updatedBy.role !== Roles.SUPER_ADMIN) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Chỉ Super Admin mới có quyền block/unblock Admin",
    );
  }

  // ⚠️ Prevent self-blocking
  if (targetUser._id.toString() === updatedBy._id.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Không thể tự block chính mình");
  }

  // Update status
  targetUser.status = newStatus;
  await targetUser.save();

  const userObject = targetUser.toObject();
  delete userObject.password_hash;
  const profile = await UserProfile.findOne({
    user_id: targetUser.user_id,
  }).lean();
  const loyalty = await UserLoyalty.findOne({
    user_id: targetUser.user_id,
  }).lean();

  return {
    ...userObject,
    profile: profile || null,
    loyalty: loyalty || null,
  };
};

/**
 * Delete user (only for SUPER_ADMIN)
 * ⚠️ Cẩn thận: Xóa vĩnh viễn, không khôi phục được
 */
const deleteUser = async (userId, deletedBy) => {
  // ✅ Validate deleter is super_admin
  if (deletedBy.role !== Roles.SUPER_ADMIN) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Chỉ Super Admin mới có quyền xóa user",
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User không tồn tại");
  }

  // ⚠️ Prevent deleting super_admin
  if (user.role === Roles.SUPER_ADMIN) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Không thể xóa Super Admin");
  }

  // ⚠️ Prevent self-deletion
  if (user._id.toString() === deletedBy._id.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Không thể tự xóa chính mình");
  }

  await Promise.all([
    UserProfile.deleteOne({ user_id: user.user_id }),
    UserAddress.deleteMany({ user_id: user.user_id }),
    UserMeasurement.deleteMany({ user_id: user.user_id }),
    UserLoyalty.deleteOne({ user_id: user.user_id }),
    LoyaltyTransaction.deleteMany({ user_id: user.user_id }),
    user.deleteOne(),
  ]);

  return { id: userId, deleted: true };
};

/**
 * Reset user password (Admin)
 */
const resetUserPassword = async (userId, newPassword, resetBy) => {
  // ✅ Validate resetter has at least ADMIN role
  if (resetBy.role !== Roles.ADMIN && resetBy.role !== Roles.SUPER_ADMIN) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Cần quyền Admin để reset password",
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User không tồn tại");
  }

  // ⚠️ Prevent resetting super_admin password
  if (user.role === Roles.SUPER_ADMIN && resetBy.role !== Roles.SUPER_ADMIN) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Chỉ Super Admin mới có quyền reset password của Super Admin",
    );
  }

  // Update password (will be auto-hashed by pre-save hook)
  user.password_hash = newPassword;
  await user.save();

  return { message: "Password đã được reset thành công" };
};

/**
 * Get loyalty transactions for a user (Admin)
 */
const getLoyaltyTransactions = async (userId, options = {}) => {
  const { page = 1, limit = 10 } = options;
  const user = await User.findById(userId).select("user_id").lean();

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User không tồn tại");
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [items, total] = await Promise.all([
    LoyaltyTransaction.find({ user_id: user.user_id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    LoyaltyTransaction.countDocuments({ user_id: user.user_id }),
  ]);

  return {
    items,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  };
};

export default {
  getAllUsers,
  getUserById,
  createStaffOrAdmin,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  resetUserPassword,
  getLoyaltyTransactions,
};
