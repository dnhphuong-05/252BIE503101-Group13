import Joi from "joi";

/**
 * Register validation
 */
export const register = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": "Passwords do not match",
      }),
    fullName: Joi.string().min(2).max(100).required(),
    // Support both phone (frontend-user) and legacy phoneNumber
    phone: Joi.string()
      .pattern(/^(0[3|5|7|8|9])+([0-9]{8})$/)
      .messages({
        "string.pattern.base": "Sá»‘ Ä‘iá»‡n thoáº¡i khÃ´ng há»£p lá»‡",
        "any.required": "Sá»‘ Ä‘iá»‡n thoáº¡i lÃ  báº¯t buá»™c",
      }),
    phoneNumber: Joi.string()
      .pattern(/^(0[3|5|7|8|9])+([0-9]{8})$/)
      .optional(),
    username: Joi.string().min(3).max(50).optional(),
  }).or("phone", "phoneNumber"),
};

/**
 * Login validation
 */
export const login = {
  body: Joi.object({
    phone: Joi.string()
      .pattern(/^(0[3|5|7|8|9])+([0-9]{8})$/)
      .required()
      .messages({
        "string.pattern.base": "Số điện thoại không hợp lệ",
        "any.required": "Số điện thoại là bắt buộc",
      }),
    password: Joi.string().required().messages({
      "any.required": "Mật khẩu là bắt buộc",
    }),
  }),
};

/**
 * Google Auth validation
 */
export const googleAuth = {
  body: Joi.object({
    token: Joi.string().required().messages({
      "any.required": "Google token là bắt buộc",
    }),
  }),
};

/**
 * Forgot password validation
 */
export const forgotPassword = {
  body: Joi.object({
    email: Joi.string().email().required(),
  }),
};

/**
 * Reset password validation
 */
export const resetPassword = {
  body: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
  }),
};
