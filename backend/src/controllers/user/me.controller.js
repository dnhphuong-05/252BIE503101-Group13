import BuyOrder from "../../models/order/BuyOrder.js";
import RentOrder from "../../models/order/RentOrder.js";
import UserAddress from "../../models/user/UserAddress.js";
import UserLoyalty from "../../models/user/UserLoyalty.js";
import LoyaltyTransaction from "../../models/user/LoyaltyTransaction.js";
import UserMeasurement from "../../models/user/UserMeasurement.js";
import UserProfile from "../../models/user/UserProfile.js";
import UserAdminSetting from "../../models/user/UserAdminSetting.js";
import userService from "../../services/user/user.service.js";
import loyaltyService from "../../services/user/loyalty.service.js";
import { Roles } from "../../constants/roles.js";
import catchAsync from "../../utils/catchAsync.js";
import ApiError from "../../utils/ApiError.js";
import { successResponse } from "../../utils/response.js";

const buildAuthUser = (user, profile = null, loyalty = null) => ({
  _id: user._id,
  id: user._id,
  user_id: user.user_id,
  customerId: user.user_id,
  email: user.email,
  fullName: profile?.full_name || null,
  phone: user.phone,
  role: user.role,
  avatar: profile?.avatar || "",
  profile,
  loyalty,
});

const normalizeGender = (value) => {
  if (!value) return null;
  const normalized = value.toString().trim().toLowerCase();
  if (["male", "nam"].includes(normalized)) return "male";
  if (["female", "nu", "nữ"].includes(normalized)) return "female";
  if (["other", "khac", "khác"].includes(normalized)) return "other";
  return null;
};

const mapAddressPayload = (body) => {
  return {
    receiver_name: body.receiver_name || body.recipientName || body.receiverName || null,
    phone: body.phone,
    province: body.province,
    district: body.district ?? "",
    ward: body.ward,
    address_detail: body.address_detail || body.address || null,
    note: body.note ?? null,
    is_default: body.is_default ?? body.isDefault ?? false,
  };
};

const DEFAULT_SETTINGS = {
  email_notifications: true,
  order_notifications: true,
  return_notifications: true,
  contact_notifications: true,
  compact_table: false,
  reduce_motion: false,
  language: "en",
  timezone: "Asia/Bangkok",
  start_page: "dashboard",
  auto_refresh_seconds: 45,
  enable_two_factor: false,
  session_timeout: "30 minutes",
};

const ADMIN_WORKSPACE_ROLES = new Set([Roles.STAFF, Roles.ADMIN, Roles.SUPER_ADMIN]);

const serializeSettings = (doc = null) => ({
  email_notifications: doc?.email_notifications ?? DEFAULT_SETTINGS.email_notifications,
  order_notifications: doc?.order_notifications ?? DEFAULT_SETTINGS.order_notifications,
  return_notifications: doc?.return_notifications ?? DEFAULT_SETTINGS.return_notifications,
  contact_notifications: doc?.contact_notifications ?? DEFAULT_SETTINGS.contact_notifications,
  compact_table: doc?.compact_table ?? DEFAULT_SETTINGS.compact_table,
  reduce_motion: doc?.reduce_motion ?? DEFAULT_SETTINGS.reduce_motion,
  language: doc?.language ?? DEFAULT_SETTINGS.language,
  timezone: doc?.timezone ?? DEFAULT_SETTINGS.timezone,
  start_page: doc?.start_page ?? DEFAULT_SETTINGS.start_page,
  auto_refresh_seconds:
    doc?.auto_refresh_seconds ?? DEFAULT_SETTINGS.auto_refresh_seconds,
  enable_two_factor: doc?.enable_two_factor ?? DEFAULT_SETTINGS.enable_two_factor,
  session_timeout: doc?.session_timeout ?? DEFAULT_SETTINGS.session_timeout,
});


export const getSummary = catchAsync(async (req, res) => {
  const user = req.user;
  const userId = user.user_id;

  try {
    await loyaltyService.syncOrderPointsForUser(userId);
  } catch (error) {
    console.error("Failed to sync loyalty points:", error);
  }

  const [profile, loyalty, orderCount, rentOrderCount] = await Promise.all([
    UserProfile.findOne({ user_id: userId }).lean(),
    UserLoyalty.findOne({ user_id: userId }).lean(),
    BuyOrder.countDocuments({ user_id: userId }),
    RentOrder.countDocuments({ user_id: userId }),
  ]);

  const stats = {
    orders: orderCount || 0,
    favorites: 0,
    rent_orders: rentOrderCount || 0,
    tailor_orders: 0,
  };

  successResponse(
    res,
    {
      user: {
        user_id: user.user_id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      profile: profile || null,
      loyalty: loyalty || null,
      stats,
    },
    "Summary retrieved successfully",
  );
});

export const getLoyaltyTransactions = catchAsync(async (req, res) => {
  const userId = req.user.user_id;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    LoyaltyTransaction.find({ user_id: userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LoyaltyTransaction.countDocuments({ user_id: userId }),
  ]);

  successResponse(
    res,
    {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
    "Loyalty transactions retrieved successfully",
  );
});

export const getLoyaltyVouchers = catchAsync(async (req, res) => {
  const userId = req.user.user_id;

  try {
    await loyaltyService.syncOrderPointsForUser(userId);
  } catch (error) {
    console.error("Failed to sync loyalty points:", error);
  }

  const loyalty = await UserLoyalty.findOne({ user_id: userId }).lean();
  const totalPoints = Math.max(0, Number(loyalty?.total_points) || 0);
  const tier = loyaltyService.resolveTier(totalPoints);

  successResponse(
    res,
    {
      loyalty: {
        total_points: totalPoints,
        tier_name: loyalty?.tier_name || tier.name,
        tier_level: loyalty?.tier_level || tier.level,
      },
      vouchers: loyaltyService.getAvailableVouchers(totalPoints),
    },
    "Loyalty vouchers retrieved successfully",
  );
});

export const getProfile = catchAsync(async (req, res) => {
  const user = req.user;
  const userId = user.user_id;

  const [profile, loyalty] = await Promise.all([
    UserProfile.findOne({ user_id: userId }).lean(),
    UserLoyalty.findOne({ user_id: userId }).lean(),
  ]);

  successResponse(res, buildAuthUser(user, profile, loyalty), "Profile retrieved successfully");
});

export const updateProfile = catchAsync(async (req, res) => {
  const payload = { ...req.body };
  const isAdminWorkspaceUser = ADMIN_WORKSPACE_ROLES.has(req.user.role);

  if (payload.fullName && !payload.full_name) {
    payload.full_name = payload.fullName;
  }
  if (payload.jobTitle && payload.job_title === undefined) {
    payload.job_title = payload.jobTitle;
  }
  if (payload.gender) {
    payload.gender = normalizeGender(payload.gender);
  }
  if (payload.birthday === "") {
    payload.birthday = null;
  }
  if (isAdminWorkspaceUser && payload.timezone !== undefined) {
    const normalizedTimezone =
      typeof payload.timezone === "string"
        ? payload.timezone.trim()
        : payload.timezone;

    await UserAdminSetting.findOneAndUpdate(
      { user_id: req.user.user_id },
      {
        $set: {
          timezone:
            normalizedTimezone === ""
              ? DEFAULT_SETTINGS.timezone
              : normalizedTimezone,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    delete payload.timezone;
  }

  let updatedUser = await userService.updateProfile(req.user._id, payload);

  if (isAdminWorkspaceUser) {
    await UserProfile.updateOne(
      { user_id: req.user.user_id },
      { $unset: { timezone: "" } },
    );
    updatedUser = await userService.getById(req.user._id.toString());
  }

  const profile = updatedUser.profile || null;
  const loyalty = updatedUser.loyalty || null;

  successResponse(res, buildAuthUser(updatedUser, profile, loyalty), "Profile updated successfully");
});

export const getSettings = catchAsync(async (req, res) => {
  const setting = await UserAdminSetting.findOne({ user_id: req.user.user_id }).lean();
  successResponse(
    res,
    serializeSettings(setting),
    "Settings retrieved successfully",
  );
});

export const updateSettings = catchAsync(async (req, res) => {
  const payload = { ...req.body };

  const setting = await UserAdminSetting.findOneAndUpdate(
    { user_id: req.user.user_id },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  successResponse(
    res,
    serializeSettings(setting),
    "Settings updated successfully",
  );
});

export const changePassword = catchAsync(async (req, res) => {
  const oldPassword = req.body.oldPassword || req.body.currentPassword;
  const newPassword = req.body.newPassword;

  if (!oldPassword || !newPassword) {
    throw ApiError.badRequest("Old password and new password are required");
  }

  const result = await userService.changePassword(req.user._id, oldPassword, newPassword);
  successResponse(res, result, "Password changed successfully");
});

export const uploadAvatar = catchAsync(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest("Avatar file is required");
  }

  const avatarUrl = req.file.path || req.file.secure_url;
  if (!avatarUrl) {
    throw ApiError.badRequest("Avatar upload failed");
  }

  const updatedUser = await userService.updateProfile(req.user._id, {
    avatar: avatarUrl,
  });

  const profile = updatedUser.profile || null;
  const loyalty = updatedUser.loyalty || null;

  successResponse(res, buildAuthUser(updatedUser, profile, loyalty), "Avatar updated successfully");
});

export const getAddresses = catchAsync(async (req, res) => {
  const addresses = await UserAddress.find({ user_id: req.user.user_id })
    .sort({ is_default: -1, created_at: -1 })
    .lean();

  successResponse(res, addresses || [], "Addresses retrieved successfully");
});

export const addAddress = catchAsync(async (req, res) => {
  const payload = mapAddressPayload(req.body);
  const result = await userService.addAddress(req.user._id, payload);
  successResponse(res, result.addresses || [], "Address added successfully");
});

export const updateAddress = catchAsync(async (req, res) => {
  const payload = mapAddressPayload(req.body);
  const result = await userService.updateAddress(req.user._id, req.params.addressId, payload);
  successResponse(res, result.addresses || [], "Address updated successfully");
});

export const deleteAddress = catchAsync(async (req, res) => {
  const result = await userService.deleteAddress(req.user._id, req.params.addressId);
  successResponse(res, result.addresses || [], "Address deleted successfully");
});

export const setDefaultAddress = catchAsync(async (req, res) => {
  const result = await userService.setDefaultAddress(req.user._id, req.params.addressId);
  successResponse(res, result.addresses || [], "Default address set successfully");
});

export const getMeasurements = catchAsync(async (req, res) => {
  const measurement = await UserMeasurement.findOne({ user_id: req.user.user_id })
    .sort({ measured_at: -1, created_at: -1 })
    .lean();

  successResponse(res, measurement || null, "Measurements retrieved successfully");
});

export const updateMeasurements = catchAsync(async (req, res) => {
  const result = await userService.updateMeasurements(req.user._id, req.body);
  successResponse(res, result.latest_measurement || null, "Measurements updated successfully");
});
