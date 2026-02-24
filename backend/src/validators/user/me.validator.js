import Joi from "joi";

const genderSchema = Joi.string()
  .valid("male", "female", "other", "nam", "nu", "nữ", "khac", "khác", "Nam", "Nữ", "Khác")
  .allow(null, "");

export const updateProfile = {
  body: Joi.object({
    full_name: Joi.string().trim().max(100),
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/),
    avatar: Joi.string().uri().allow(""),
    gender: genderSchema,
    birthday: Joi.date().iso().allow(null, ""),
    height: Joi.number().min(0).allow(null),
    weight: Joi.number().min(0).allow(null),
    size_standard: Joi.string().valid("XS", "S", "M", "L", "XL").allow(null),
  }).min(1),
};

export const changePassword = {
  body: Joi.object({
    oldPassword: Joi.string(),
    currentPassword: Joi.string(),
    newPassword: Joi.string().min(6).max(100).required(),
  })
    .or("oldPassword", "currentPassword")
    .required(),
};

export const addAddress = {
  body: Joi.object({
    receiver_name: Joi.string().trim().max(100),
    recipientName: Joi.string().trim().max(100),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
    province: Joi.string().trim().required(),
    district: Joi.string().trim().allow("", null),
    ward: Joi.string().trim().required(),
    address_detail: Joi.string().trim(),
    address: Joi.string().trim(),
    note: Joi.string().trim().max(300).allow(null, ""),
    is_default: Joi.boolean(),
    isDefault: Joi.boolean(),
  })
    .or("receiver_name", "recipientName")
    .required(),
};

export const updateAddress = {
  params: Joi.object({
    addressId: Joi.string().required(),
  }),
  body: Joi.object({
    receiver_name: Joi.string().trim().max(100),
    recipientName: Joi.string().trim().max(100),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/),
    province: Joi.string().trim(),
    district: Joi.string().trim().allow("", null),
    ward: Joi.string().trim(),
    address_detail: Joi.string().trim(),
    address: Joi.string().trim(),
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
