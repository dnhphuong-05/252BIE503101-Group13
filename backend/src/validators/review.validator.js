import Joi from "joi";

/**
 * Validation schemas cho Review
 */

// Schema cho query params khi lấy reviews
export const getReviewsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  sortBy: Joi.string()
    .valid("created_at", "rating", "helpful_count")
    .default("created_at"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  rating: Joi.number().integer().min(1).max(5),
  hasMedia: Joi.boolean().default(false),
});

// Schema cho params productId
export const productIdParamSchema = Joi.object({
  productId: Joi.alternatives()
    .try(
      Joi.number().integer().positive(),
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
      Joi.string().trim().min(1),
    )
    .required()
    .messages({
      "any.required": "ID sản phẩm là bắt buộc",
      "alternatives.match": "ID sản phẩm không hợp lệ",
    }),
});

// Schema cho reviewId param
export const reviewIdParamSchema = Joi.object({
  reviewId: Joi.alternatives()
    .try(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
      Joi.string().pattern(/^rv_\d+_\d+$/),
      Joi.string().trim().min(1),
    )
    .required()
    .messages({
      "any.required": "ID đánh giá là bắt buộc",
      "alternatives.match": "ID đánh giá không hợp lệ",
    }),
});

// Schema cho việc tạo review mới
export const createReviewSchema = Joi.object({
  product_id: Joi.number().integer().positive().optional().messages({
    "any.required": "ID sản phẩm là bắt buộc",
  }),
  user_id: Joi.number().integer().positive().optional().messages({
    "any.required": "ID người dùng là bắt buộc",
  }),
  user_name: Joi.string().trim().min(2).max(100).optional().messages({
    "any.required": "Tên người dùng là bắt buộc",
  }),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "any.required": "Đánh giá sao là bắt buộc",
    "number.min": "Đánh giá phải từ 1 đến 5 sao",
    "number.max": "Đánh giá phải từ 1 đến 5 sao",
  }),
  title: Joi.string().trim().max(200).allow(""),
  comment: Joi.string().required().trim().min(10).max(2000).messages({
    "any.required": "Nội dung đánh giá là bắt buộc",
    "string.min": "Nội dung đánh giá phải có ít nhất 10 ký tự",
  }),
  images: Joi.array().items(Joi.string().uri()).max(6),
  videos: Joi.array().items(Joi.string().uri()).max(6),
  verified_purchase: Joi.boolean().default(false),
});

// Schema cho việc cập nhật review
export const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  title: Joi.string().trim().max(200).allow(""),
  comment: Joi.string().trim().min(10).max(2000),
  images: Joi.array().items(Joi.string().uri()).max(6),
  videos: Joi.array().items(Joi.string().uri()).max(6),
}).min(1);

// Schema cho mark helpful
export const markHelpfulSchema = Joi.object({
  user_id: Joi.number().integer().positive().optional().messages({
    "any.required": "ID người dùng là bắt buộc",
  }),
});


// Schema cho admin reply review
export const adminReplySchema = Joi.object({
  reply_text: Joi.string().trim().min(1).max(2000).required(),
  replied_by: Joi.object({
    admin_id: Joi.string().trim().allow(""),
    full_name: Joi.string().trim().allow(""),
  }).optional(),
  admin_id: Joi.string().trim().allow(""),
  full_name: Joi.string().trim().allow(""),
  is_deleted: Joi.boolean().optional(),
});



