import Joi from "joi";
import { Roles } from "../../constants/roles.js";

const passwordComplexPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

/**
 * Validator for creating staff or admin user
 */
export const createStaffOrAdmin = {
  body: Joi.object({
    full_name: Joi.string().required().min(2).max(100).messages({
      "string.empty": "Họ tên không được để trống",
      "string.min": "Họ tên phải có ít nhất 2 ký tự",
      "string.max": "Họ tên không được quá 100 ký tự",
    }),
    email: Joi.string().email().required().lowercase().trim().messages({
      "string.empty": "Email không được để trống",
      "string.email": "Email không hợp lệ",
    }),
    phone: Joi.string()
      .pattern(/^[0-9]{10,11}$/)
      .allow("")
      .messages({
        "string.pattern.base": "Số điện thoại phải có 10-11 chữ số",
      }),
    password: Joi.string().min(6).pattern(passwordComplexPattern).required().messages({
      "string.empty": "Mật khẩu không được để trống",
      "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
      "string.pattern.base": "Mật khẩu phải gồm chữ hoa, số, ký tự đặc biệt",
    }),
    role: Joi.string().valid(Roles.STAFF, Roles.ADMIN).required().messages({
      "any.only": "Role phải là staff hoặc admin",
      "string.empty": "Role không được để trống",
    }),
    avatar: Joi.string().uri().allow(""),
  }),
};

/**
 * Validator for updating user role
 */
export const updateRole = {
  body: Joi.object({
    role: Joi.string()
      .valid(Roles.CUSTOMER, Roles.STAFF, Roles.ADMIN)
      .required()
      .messages({
        "any.only": "Role phải là customer, staff hoặc admin",
        "string.empty": "Role không được để trống",
      }),
  }),
};

/**
 * Validator for updating user status
 */
export const updateStatus = {
  body: Joi.object({
    status: Joi.string().valid("active", "blocked").required().messages({
      "any.only": "Status phải là active hoặc blocked",
      "string.empty": "Status không được để trống",
    }),
  }),
};

/**
 * Validator for resetting user password
 */
export const resetPassword = {
  body: Joi.object({
    password: Joi.string().min(6).pattern(passwordComplexPattern).required().messages({
      "string.empty": "Mật khẩu không được để trống",
      "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
      "string.pattern.base": "Mật khẩu phải gồm chữ hoa, số, ký tự đặc biệt",
    }),
  }),
};

/**
 * Validator for getting loyalty transactions
 */
export const getLoyaltyTransactions = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};
