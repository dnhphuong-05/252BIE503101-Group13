/**
 * System Roles - Đồng bộ role trong toàn hệ thống
 *
 * Quyền hạn:
 * - CUSTOMER: Khách hàng thường, mua hàng
 * - STAFF: Nhân viên, xử lý đơn hàng, blog
 * - ADMIN: Quản trị viên, quản lý sản phẩm, users
 * - SUPER_ADMIN: Quản trị tối cao, tạo/cấp quyền admin/staff
 */
export const Roles = {
  CUSTOMER: "customer",
  STAFF: "staff",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

/**
 * Role hierarchy - Dùng để check quyền
 * Số càng lớn càng có nhiều quyền
 */
export const RoleHierarchy = {
  [Roles.CUSTOMER]: 1,
  [Roles.STAFF]: 2,
  [Roles.ADMIN]: 3,
  [Roles.SUPER_ADMIN]: 4,
};

/**
 * Check if a role has permission equal or higher than required role
 * @param {string} userRole - Role của user hiện tại
 * @param {string} requiredRole - Role yêu cầu tối thiểu
 * @returns {boolean}
 */
export const hasPermission = (userRole, requiredRole) => {
  const userLevel = RoleHierarchy[userRole] || 0;
  const requiredLevel = RoleHierarchy[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Validate if role exists in system
 * @param {string} role
 * @returns {boolean}
 */
export const isValidRole = (role) => {
  return Object.values(Roles).includes(role);
};
