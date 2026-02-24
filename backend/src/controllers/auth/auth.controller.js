import authService from "../../services/auth/auth.service.js";
import catchAsync from "../../utils/catchAsync.js";
import { successResponse, createdResponse } from "../../utils/response.js";

/**
 * Register new user
 */
export const register = catchAsync(async (req, res) => {
  const { confirmPassword, ...userData } = req.body;
  const result = await authService.register(userData);

  createdResponse(res, result, "User registered successfully");
});

/**
 * Login user
 */
export const login = catchAsync(async (req, res) => {
  const { phone, password } = req.body;
  const result = await authService.login(phone, password);

  successResponse(res, result, "Đăng nhập thành công");
});

/**
 * Google OAuth login
 */
export const googleAuth = catchAsync(async (req, res) => {
  const { token } = req.body;
  const result = await authService.googleAuth(token);

  successResponse(res, result, "Đăng nhập Google thành công");
});

/**
 * Logout user
 */
export const logout = catchAsync(async (req, res) => {
  // Implement token blacklist if needed
  successResponse(res, null, "Logout successful");
});

/**
 * Refresh access token
 */
export const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);

  successResponse(res, result, "Token refreshed successfully");
});

/**
 * Forgot password
 */
export const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  await authService.forgotPassword(email);

  successResponse(res, null, "Password reset email sent");
});

/**
 * Reset password
 */
export const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);

  successResponse(res, null, "Password reset successfully");
});
