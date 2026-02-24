import { ApiError, logger } from "../utils/index.js";

/**
 * Centralized error handling middleware
 * Đặt cuối cùng trong Express middleware chain
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Nếu không phải ApiError, convert thành ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Lỗi server";
    error = new ApiError(statusCode, message, false, err.stack);
  }

  // Log error
  logger.error("Error:", {
    message: error.message,
    statusCode: error.statusCode,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Response structure
  const response = {
    success: false,
    message: error.message,
    statusCode: error.statusCode,
  };

  // Add validation errors if present
  if (error.errors && Array.isArray(error.errors)) {
    response.errors = error.errors;
  }

  // Thêm stack trace trong development mode
  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
  }

  res.status(error.statusCode).json(response);
};

/**
 * Handle 404 Not Found
 */
export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} không tồn tại`));
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = () => {
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Có thể tắt server gracefully ở đây nếu cần
  });
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = () => {
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", error);
    process.exit(1);
  });
};
