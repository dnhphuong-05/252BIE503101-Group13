/**
 * Chuẩn hóa format response API
 */

/**
 * Response thành công
 * @param {Object} res - Express response object
 * @param {Object} data - Dữ liệu trả về
 * @param {String} message - Thông báo
 * @param {Number} statusCode - HTTP status code (mặc định 200)
 */
export const successResponse = (
  res,
  data = null,
  message = "Thành công",
  statusCode = 200,
) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Response thành công với pagination
 * @param {Object} res - Express response object
 * @param {Array} items - Mảng dữ liệu
 * @param {Object} pagination - Thông tin phân trang
 * @param {String} message - Thông báo
 */
export const successResponseWithPagination = (
  res,
  items,
  pagination,
  message = "Thành công",
) => {
  return res.status(200).json({
    success: true,
    message,
    data: {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: pagination.pages,
      },
    },
  });
};

/**
 * Response lỗi
 * @param {Object} res - Express response object
 * @param {String} message - Thông báo lỗi
 * @param {Number} statusCode - HTTP status code
 * @param {Object} errors - Chi tiết lỗi (validation errors, etc)
 */
export const errorResponse = (
  res,
  message = "Có lỗi xảy ra",
  statusCode = 500,
  errors = null,
) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Response cho created resource (201)
 */
export const createdResponse = (res, data, message = "Tạo thành công") => {
  return successResponse(res, data, message, 201);
};

/**
 * Response cho no content (204)
 */
export const noContentResponse = (res) => {
  return res.status(204).send();
};

// Alias for backward compatibility
export const paginatedResponse = successResponseWithPagination;
