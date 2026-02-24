import Joi from "joi";

/**
 * Validation cho Contact Message
 */

const nameSchema = Joi.string().trim().min(2).max(100);

// Schema cho việc tạo contact message mới
export const createContactMessageSchema = Joi.object({
  full_name: nameSchema.messages({
    "string.empty": "Vui lòng nhập họ tên",
    "string.min": "Họ tên phải có ít nhất 2 ký tự",
    "string.max": "Họ tên không được vượt quá 100 ký tự",
  }),
  fullName: nameSchema.messages({
    "string.empty": "Vui lòng nhập họ tên",
    "string.min": "Họ tên phải có ít nhất 2 ký tự",
    "string.max": "Họ tên không được vượt quá 100 ký tự",
  }),

  phone: Joi.string()
    .trim()
    .pattern(/^[0-9]{10,11}$/)
    .required()
    .messages({
      "string.empty": "Vui lòng nhập số điện thoại",
      "string.pattern.base": "Số điện thoại không hợp lệ (10-11 chữ số)",
      "any.required": "Số điện thoại là bắt buộc",
    }),

  email: Joi.string().trim().email().lowercase().required().messages({
    "string.empty": "Vui lòng nhập email",
    "string.email": "Email không hợp lệ",
    "any.required": "Email là bắt buộc",
  }),

  purpose: Joi.string()
    .valid("consult", "rent", "buy", "custom", "cooperation")
    .required()
    .messages({
      "string.empty": "Vui lòng chọn mục đích liên hệ",
      "any.only": "Mục đích liên hệ không hợp lệ",
      "any.required": "Mục đích liên hệ là bắt buộc",
    }),

  message: Joi.string().trim().min(10).max(1000).required().messages({
    "string.empty": "Vui lòng nhập nội dung liên hệ",
    "string.min": "Nội dung liên hệ phải có ít nhất 10 ký tự",
    "string.max": "Nội dung liên hệ không được vượt quá 1000 ký tự",
    "any.required": "Nội dung liên hệ là bắt buộc",
  }),
})
  .or("full_name", "fullName")
  .messages({
    "object.missing": "Vui lòng nhập họ tên",
  });

// Schema cho việc cập nhật trạng thái
export const updateContactStatusSchema = Joi.object({
  status: Joi.string()
    .valid("new", "processing", "replied", "closed", "done", "cancelled")
    .required()
    .messages({
      "string.empty": "Vui lòng chọn trạng thái",
      "any.only": "Trạng thái không hợp lệ",
      "any.required": "Trạng thái là bắt buộc",
    }),

  admin_note: Joi.string().trim().max(500).allow("").optional().messages({
    "string.max": "Ghi chú không được vượt quá 500 ký tự",
  }),

});

// Schema cho query params khi lấy danh sách
export const getContactMessagesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().default("-created_at"),
  status: Joi.string().valid("new", "processing", "replied", "closed"),
  purpose: Joi.string().valid("consult", "rent", "buy", "custom", "cooperation"),
  search: Joi.string().trim().allow(""),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
});
