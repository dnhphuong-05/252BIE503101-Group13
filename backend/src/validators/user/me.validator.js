import Joi from "joi";

const genderSchema = Joi.string()
  .valid("male", "female", "other", "nam", "nu", "nữ", "khac", "khác", "Nam", "Nữ", "Khác")
  .allow(null, "");
const vietnamPhoneSchema = Joi.string().pattern(/^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/);
const addressDetailSchema = Joi.string().trim().min(6);
const passwordComplexPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const updateProfile = {
  body: Joi.object({
    full_name: Joi.string().trim().max(100),
    fullName: Joi.string().trim().max(100),
    email: Joi.string().email(),
    phone: vietnamPhoneSchema,
    avatar: Joi.string().uri().allow(""),
    gender: genderSchema,
    birthday: Joi.date().iso().allow(null, ""),
    height: Joi.number().min(0).allow(null),
    weight: Joi.number().min(0).allow(null),
    size_standard: Joi.string().valid("XS", "S", "M", "L", "XL").allow(null),
    job_title: Joi.string().trim().max(100).allow(""),
    department: Joi.string().trim().max(100).allow(""),
    bio: Joi.string().trim().max(1000).allow(""),
    timezone: Joi.string().trim().max(80).allow(""),
  }).min(1),
};

export const updateSettings = {
  body: Joi.object({
    email_notifications: Joi.boolean(),
    order_notifications: Joi.boolean(),
    return_notifications: Joi.boolean(),
    contact_notifications: Joi.boolean(),
    compact_table: Joi.boolean(),
    reduce_motion: Joi.boolean(),
    language: Joi.string().valid("en", "vi"),
    timezone: Joi.string().trim().max(80),
    start_page: Joi.string()
      .valid("dashboard", "orders/list", "orders/rent", "notifications"),
    auto_refresh_seconds: Joi.number().integer().min(15).max(300),
    enable_two_factor: Joi.boolean(),
    session_timeout: Joi.string().valid("15 minutes", "30 minutes", "60 minutes"),
  }).min(1),
};

export const changePassword = {
  body: Joi.object({
    oldPassword: Joi.string(),
    currentPassword: Joi.string(),
    newPassword: Joi.string().min(6).max(100).pattern(passwordComplexPattern).required().messages({
      "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
      "string.pattern.base": "Mật khẩu phải gồm chữ hoa, số, ký tự đặc biệt",
    }),
  })
    .or("oldPassword", "currentPassword")
    .required(),
};

export const addAddress = {
  body: Joi.object({
    receiver_name: Joi.string().trim().max(100),
    recipientName: Joi.string().trim().max(100),
    phone: vietnamPhoneSchema.required(),
    province: Joi.string().trim().required(),
    district: Joi.string().trim().allow("", null),
    ward: Joi.string().trim().required(),
    address_detail: addressDetailSchema,
    address: addressDetailSchema,
    note: Joi.string().trim().max(300).allow(null, ""),
    is_default: Joi.boolean(),
    isDefault: Joi.boolean(),
  })
    .or("receiver_name", "recipientName")
    .or("address_detail", "address")
    .required(),
};

export const updateAddress = {
  params: Joi.object({
    addressId: Joi.string().required(),
  }),
  body: Joi.object({
    receiver_name: Joi.string().trim().max(100),
    recipientName: Joi.string().trim().max(100),
    phone: vietnamPhoneSchema,
    province: Joi.string().trim(),
    district: Joi.string().trim().allow("", null),
    ward: Joi.string().trim(),
    address_detail: addressDetailSchema,
    address: addressDetailSchema,
    note: Joi.string().trim().max(300).allow(null, ""),
    is_default: Joi.boolean(),
    isDefault: Joi.boolean(),
  }).min(1),
};

export const deleteAddress = {
  params: Joi.object({
    addressId: Joi.string().required(),
  }),
};

export const setDefaultAddress = {
  params: Joi.object({
    addressId: Joi.string().required(),
  }),
};

export const updateMeasurements = {
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

export const getLoyaltyTransactions = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};
