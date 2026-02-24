import { Roles, hasPermission } from "../constants/roles.js";
import ApiError from "../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

/**
 * Middleware kiểm tra role tối thiểu
 * @param {string} requiredRole - Role yêu cầu tối thiểu
 * @returns {Function} Express middleware
 */
export const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Chưa đăng nhập");
    }

    if (!hasPermission(req.user.role, requiredRole)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        `Cần quyền ${requiredRole} trở lên để thực hiện thao tác này`,
      );
    }

    next();
  };
};

/**
 * Middleware chỉ cho phép SUPER_ADMIN
 */
export const requireSuperAdmin = requireRole(Roles.SUPER_ADMIN);

/**
 * Middleware cho phép ADMIN trở lên
 */
export const requireAdmin = requireRole(Roles.ADMIN);

/**
 * Middleware cho phép STAFF trở lên
 */
export const requireStaff = requireRole(Roles.STAFF);

/**
 * Middleware kiểm tra các role cụ thể (exact match)
 * @param {string[]} allowedRoles - Danh sách roles được phép
 */
export const requireRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Chưa đăng nhập");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        `Chỉ ${allowedRoles.join(", ")} mới có quyền thực hiện thao tác này`,
      );
    }

    next();
  };
};
