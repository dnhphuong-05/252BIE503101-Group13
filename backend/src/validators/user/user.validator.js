import Joi from "joi";

const idSchema = Joi.string().required();
const paginationSchema = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

// Create user
export const createUser = {
  body: Joi.object({
    full_name: Joi.string().trim().max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
    avatar: Joi.string().uri().allow(""),
    gender: Joi.string().valid("male", "female", "other").allow(null),
    birthday: Joi.date().iso().allow(null),
    height: Joi.number().min(0).allow(null),
    weight: Joi.number().min(0).allow(null),
    size_standard: Joi.string().valid("XS", "S", "M", "L", "XL").allow(null),
  }),
};

// Update profile
export const updateProfile = {
  params: Joi.object({
    id: idSchema,
  }),
  body: Joi.object({
    full_name: Joi.string().trim().max(100),
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/),
    avatar: Joi.string().uri().allow(""),
    gender: Joi.string().valid("male", "female", "other").allow(null),
    birthday: Joi.date().iso().allow(null),
    height: Joi.number().min(0).allow(null),
    weight: Joi.number().min(0).allow(null),
    size_standard: Joi.string().valid("XS", "S", "M", "L", "XL").allow(null),
  }).min(1),
};

// Change password
export const changePassword = {
  params: Joi.object({
    id: idSchema,
  }),
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(100).required(),
  }),
};

// Add address
export const addAddress = {
  params: Joi.object({
    id: idSchema,
  }),
  body: Joi.object({
    receiver_name: Joi.string().trim().max(100).required(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
    province: Joi.string().trim().required(),
    district: Joi.string().trim().allow("", null),
    ward: Joi.string().trim().required(),
    address_detail: Joi.string().trim().required(),
    note: Joi.string().trim().max(300).allow(null, ""),
    is_default: Joi.boolean().default(false),
  }),
};

// Update address
export const updateAddress = {
  params: Joi.object({
    id: idSchema,
    addressId: Joi.string().required(),
  }),
  body: Joi.object({
    receiver_name: Joi.string().trim().max(100),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/),
    province: Joi.string().trim(),
    district: Joi.string().trim().allow("", null),
    ward: Joi.string().trim(),
    address_detail: Joi.string().trim(),
    note: Joi.string().trim().max(300).allow(null, ""),
    is_default: Joi.boolean(),
  }).min(1),
};

// Delete address
export const deleteAddress = {
  params: Joi.object({
    id: idSchema,
    addressId: Joi.string().required(),
  }),
};

// Set default address
export const setDefaultAddress = {
  params: Joi.object({
    id: idSchema,
    addressId: Joi.string().required(),
  }),
};

// Update measurements (history)
export const updateMeasurements = {
  params: Joi.object({
    id: idSchema,
  }),
  body: Joi.object({
    neck: Joi.number().min(0),
    shoulder: Joi.number().min(0),
    chest: Joi.number().min(0),
    waist: Joi.number().min(0),
    hip: Joi.number().min(0),
    sleeve: Joi.number().min(0),
    arm: Joi.number().min(0),
    back_length: Joi.number().min(0),
    leg_length: Joi.number().min(0),
    unit: Joi.string().valid("cm"),
    measured_at: Joi.date().iso(),
  }).min(1),
};

// Get user by ID
export const getUserById = {
  params: Joi.object({
    id: idSchema,
  }),
};

// Get user by user_id
export const getByUserId = {
  params: Joi.object({
    user_id: Joi.string().pattern(/^USR\d{6}$/).required(),
  }),
};

// Get all users
export const getAllUsers = {
  query: Joi.object({
    ...paginationSchema,
    role: Joi.string().valid("customer", "staff", "admin", "super_admin"),
    status: Joi.string().valid("active", "blocked"),
  }),
};

// Block/Unblock user
export const blockUser = {
  params: Joi.object({
    id: idSchema,
  }),
};

// Delete user
export const deleteUser = {
  params: Joi.object({
    id: idSchema,
  }),
};

// Add missing validator for unblockUser
export const unblockUser = {
  params: Joi.object({
    id: idSchema,
  }),
};

// Aliases for routes compatibility
export const getAll = getAllUsers;
export const getById = getUserById;
export const create = createUser;
