import Joi from "joi";

/**
 * Validators cho Guest Customer API
 */

const addressSchema = Joi.object({
  province: Joi.string().trim().required().messages({
    "string.empty": "Tỉnh/Thành phố là bắt buộc",
    "any.required": "Tỉnh/Thành phố là bắt buộc",
  }),
  district: Joi.string().trim().allow("", null),
  ward: Joi.string().trim().required().messages({
    "string.empty": "Xã/Phường/Đặc khu là bắt buộc",
    "any.required": "Xã/Phường/Đặc khu là bắt buộc",
  }),
  detail: Joi.string().trim().max(500).required().messages({
    "string.empty": "Địa chỉ chi tiết là bắt buộc",
    "any.required": "Địa chỉ chi tiết là bắt buộc",
    "string.max": "Địa chỉ chi tiết không được vượt quá 500 ký tự",
  }),
});

/**
 * Validator cho tạo guest customer mới
 */
const createGuestCustomer = {
  body: Joi.object({
    full_name: Joi.string().trim().min(2).max(100).required().messages({
      "string.empty": "Họ và tên là bắt buộc",
      "any.required": "Họ và tên là bắt buộc",
      "string.min": "Họ và tên phải có ít nhất 2 ký tự",
      "string.max": "Họ và tên không được vượt quá 100 ký tự",
    }),

    phone: Joi.string()
      .trim()
      .pattern(/^(0|\+84)[0-9]{9,10}$/)
      .required()
      .messages({
        "string.empty": "Số điện thoại là bắt buộc",
        "any.required": "Số điện thoại là bắt buộc",
        "string.pattern.base":
          "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam",
      }),

    email: Joi.string()
      .trim()
      .email()
      .lowercase()
      .optional()
      .allow("", null)
      .messages({
        "string.email": "Email không hợp lệ",
      }),

    address: addressSchema.required(),

    notes: Joi.string().trim().max(1000).optional().messages({
      "string.max": "Ghi chú không được vượt quá 1000 ký tự",
    }),
  }),
};

/**
 * Validator cho cập nhật guest customer
 */
const updateGuestCustomer = {
  params: Joi.object({
    guestId: Joi.string()
      .pattern(/^GST\d{6}$/)
      .required()
      .messages({
        "string.pattern.base": "Guest ID không hợp lệ",
        "any.required": "Guest ID là bắt buộc",
      }),
  }),
  body: Joi.object({
    full_name: Joi.string().trim().min(2).max(100).optional().messages({
      "string.min": "Họ và tên phải có ít nhất 2 ký tự",
      "string.max": "Họ và tên không được vượt quá 100 ký tự",
    }),

    phone: Joi.string()
      .trim()
      .pattern(/^(0|\+84)[0-9]{9,10}$/)
      .optional()
      .messages({
        "string.pattern.base":
          "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam",
      }),

    email: Joi.string()
      .trim()
      .email()
      .lowercase()
      .optional()
      .allow("", null)
      .messages({
        "string.email": "Email không hợp lệ",
      }),

    address: addressSchema.optional(),

    notes: Joi.string().trim().max(1000).optional().messages({
      "string.max": "Ghi chú không được vượt quá 1000 ký tự",
    }),
  }),
};

/**
 * Validator cho get guest customer by ID
 */
const getGuestCustomer = {
  params: Joi.object({
    guestId: Joi.string()
      .pattern(/^GST\d{6}$/)
      .required()
      .messages({
        "string.pattern.base": "Guest ID không hợp lệ",
        "any.required": "Guest ID là bắt buộc",
      }),
  }),
};

/**
 * Validator cho gui email moi dang ky
 */
const inviteRegister = {
  params: Joi.object({
    guestId: Joi.string()
      .pattern(/^GST\d{6}$/)
      .required()
      .messages({
        "string.pattern.base": "Guest ID không hợp lệ",
        "any.required": "Guest ID là bắt buộc",
      }),
  }),
};

/**
 * Validator cho delete guest customer
 */
const deleteGuestCustomer = {
  params: Joi.object({
    guestId: Joi.string()
      .pattern(/^GST\d{6}$/)
      .required()
      .messages({
        "string.pattern.base": "Guest ID không hợp lệ",
        "any.required": "Guest ID là bắt buộc",
      }),
  }),
};

/**
 * Validator cho get guest customers list
 */
const getGuestCustomersList = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      "number.base": "Page phải là số",
      "number.min": "Page phải lớn hơn hoặc bằng 1",
    }),

    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      "number.base": "Limit phải là số",
      "number.min": "Limit phải lớn hơn hoặc bằng 1",
      "number.max": "Limit không được vượt quá 100",
    }),

    sortBy: Joi.string()
      .valid(
        "created_at",
        "updated_at",
        "last_order_at",
        "full_name",
        "order_count",
        "total_spent",
      )
      .default("created_at")
      .messages({
        "any.only": "sortBy không hợp lệ",
      }),

    sortOrder: Joi.string().valid("asc", "desc").default("desc").messages({
      "any.only": "sortOrder phải là asc hoặc desc",
    }),

    search: Joi.string().trim().allow("").optional(),

    status: Joi.string()
      .valid("", "new", "active", "inactive")
      .allow("")
      .default("")
      .messages({
        "any.only": "status phải là new, active, hoặc inactive",
      }),
  }),
};

/**
 * Validator cho find by phone
 */
const findByPhone = {
  params: Joi.object({
    phone: Joi.string()
      .trim()
      .pattern(/^(0|\+84)[0-9]{9,10}$/)
      .required()
      .messages({
        "string.pattern.base": "Số điện thoại không hợp lệ",
        "any.required": "Số điện thoại là bắt buộc",
      }),
  }),
};

/**
 * Validator cho record order
 */
const recordOrder = {
  params: Joi.object({
    guestId: Joi.string()
      .pattern(/^GST\d{6}$/)
      .required()
      .messages({
        "string.pattern.base": "Guest ID không hợp lệ",
        "any.required": "Guest ID là bắt buộc",
      }),
  }),
  body: Joi.object({
    orderAmount: Joi.number().min(0).default(0).messages({
      "number.base": "Giá trị đơn hàng phải là số",
      "number.min": "Giá trị đơn hàng phải lớn hơn hoặc bằng 0",
    }),
  }),
};

export {
  createGuestCustomer,
  updateGuestCustomer,
  getGuestCustomer,
  inviteRegister,
  deleteGuestCustomer,
  getGuestCustomersList,
  findByPhone,
  recordOrder,
};
