/**
 * Wrapper function để bắt lỗi async trong Express route handlers
 * Thay vì dùng try-catch trong mỗi controller, wrap bằng catchAsync
 *
 * @param {Function} fn - Async function cần wrap
 * @returns {Function} Express middleware
 *
 * @example
 * export const getUser = catchAsync(async (req, res) => {
 *   const user = await UserService.getById(req.params.id);
 *   res.json(user);
 * });
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

export default catchAsync;
