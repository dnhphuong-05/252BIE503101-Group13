/**
 * Custom API Error class để xử lý lỗi chuẩn hóa
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Static methods để tạo lỗi nhanh
  static badRequest(message = "Yêu cầu không hợp lệ") {
    return new ApiError(400, message);
  }

  static unauthorized(message = "Chưa đăng nhập") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Không có quyền truy cập") {
    return new ApiError(403, message);
  }

  static notFound(message = "Không tìm thấy") {
    return new ApiError(404, message);
  }

  static conflict(message = "Xung đột dữ liệu") {
    return new ApiError(409, message);
  }

  static internal(message = "Lỗi server") {
    return new ApiError(500, message);
  }
}

export default ApiError;
