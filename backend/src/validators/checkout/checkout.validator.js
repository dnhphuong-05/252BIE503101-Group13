import Joi from "joi";

const addressSchema = Joi.object({
  province: Joi.string().trim().required(),
  district: Joi.string().trim().allow("").default(""),
  ward: Joi.string().trim().required(),
  detail: Joi.string().trim().allow(""),
  address_detail: Joi.string().trim().allow(""),
})
  .or("detail", "address_detail")
  .messages({
    "object.missing": "Địa chỉ chi tiết là bắt buộc",
  });

const customerInfoSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string()
    .trim()
    .pattern(/^(0|\+84)[0-9]{9,10}$/)
    .required(),
  email: Joi.string().trim().lowercase().email().allow("").default(""),
  address: addressSchema.required(),
});

export const createCheckout = {
  body: Joi.object({
    address_id: Joi.string().trim().allow(null, ""),
    customer_info: customerInfoSchema.optional(),
    shipping_provider: Joi.string().trim().allow(null, ""),
    shipping_method: Joi.string().trim().allow(null, ""),
    shipping_fee: Joi.number().min(0).optional(),
    discount_amount: Joi.number().min(0).optional(),
    loyalty_voucher_id: Joi.string().trim().allow(null, "").optional(),
    payment_method: Joi.string()
      .valid("cod", "bank_transfer", "vnpay", "momo")
      .required(),
    note: Joi.string().trim().allow("").max(500).optional(),
    cart_item_ids: Joi.alternatives()
      .try(Joi.array().items(Joi.string().trim()), Joi.string().trim())
      .optional(),
    items: Joi.array()
      .items(
        Joi.object({
          product_id: Joi.number().integer().positive().required(),
          quantity: Joi.number().integer().min(1).required(),
          size: Joi.string().trim().allow(null, ""),
          color: Joi.string().trim().allow(null, ""),
        }),
      )
      .optional(),
  })
    .custom((value, helpers) => {
      if (!value.address_id && !value.customer_info) {
        return helpers.error("any.custom");
      }
      return value;
    })
    .messages({
      "any.custom": "Cần chọn địa chỉ hoặc nhập thông tin khách hàng",
    }),
};
