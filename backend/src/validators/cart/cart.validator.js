import Joi from "joi";

export const getMyCart = {};

export const addItem = {
  body: Joi.object({
    product_id: Joi.number().integer().positive().required().messages({
      "any.required": "Product ID là bắt buộc",
      "number.base": "Product ID phải là số",
      "number.positive": "Product ID phải là số dương",
    }),
    quantity: Joi.number().integer().min(1).default(1).messages({
      "number.min": "Số lượng phải lớn hơn 0",
    }),
    size: Joi.string().trim().allow(null, "").optional(),
    color: Joi.string().trim().allow(null, "").optional(),
  }),
};

export const updateItem = {
  params: Joi.object({
    cart_item_id: Joi.string()
      .pattern(/^CIT\d{6}$/)
      .required()
      .messages({
        "string.pattern.base": "Cart item ID phải có định dạng CIT000123",
        "any.required": "Cart item ID là bắt buộc",
      }),
  }),
  body: Joi.object({
    quantity: Joi.number().integer().min(1).required().messages({
      "any.required": "Số lượng là bắt buộc",
      "number.min": "Số lượng phải lớn hơn 0",
    }),
  }),
};

export const removeItem = {
  params: Joi.object({
    cart_item_id: Joi.string()
      .pattern(/^CIT\d{6}$/)
      .required()
      .messages({
        "string.pattern.base": "Cart item ID phải có định dạng CIT000123",
        "any.required": "Cart item ID là bắt buộc",
      }),
  }),
};

export const clearItems = {};

export const checkout = {};
