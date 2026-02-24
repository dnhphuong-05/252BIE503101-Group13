import Joi from "joi";

/**
 * Validators cho Quick Order API
 */

const addressSchema = Joi.object({
  province: Joi.string().trim().required().messages({
    'string.empty': 'Tỉnh/Thành phố không được để trống',
    'any.required': 'Tỉnh/Thành phố là bắt buộc',
  }),
  district: Joi.string().trim().allow('', null),
  ward: Joi.string().trim().required().messages({
    'string.empty': 'Xã/Phường/Đặc khu không được để trống',
    'any.required': 'Xã/Phường/Đặc khu là bắt buộc',
  }),
  detail: Joi.string().trim().max(500).required().messages({
    'string.empty': 'Địa chỉ chi tiết không được để trống',
    'any.required': 'Địa chỉ chi tiết là bắt buộc',
    'string.max': 'Địa chỉ chi tiết không được vượt quá 500 ký tự',
  }),
});

const customerSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Họ và tên không được để trống',
    'string.min': 'Họ và tên phải có ít nhất 2 ký tự',
    'string.max': 'Họ và tên không được vượt quá 100 ký tự',
    'any.required': 'Họ và tên là bắt buộc',
  }),
  phone: Joi.string()
    .trim()
    .pattern(/^(0|\+84)[0-9]{9,10}$/)
    .required()
    .messages({
      'string.empty': 'Số điện thoại không được để trống',
      'string.pattern.base': 'Số điện thoại không đúng định dạng',
      'any.required': 'Số điện thoại là bắt buộc',
    }),
  email: Joi.string().trim().email().lowercase().optional().allow('', null).messages({
    'string.email': 'Email không đúng định dạng',
  }),
  address: addressSchema.required(),
});

const orderItemSchema = Joi.object({
  product_id: Joi.string().required().messages({
    'string.empty': 'Mã sản phẩm không được để trống',
    'any.required': 'Mã sản phẩm là bắt buộc',
  }),
  name: Joi.string().required().messages({
    'string.empty': 'Tên sản phẩm không được để trống',
    'any.required': 'Tên sản phẩm là bắt buộc',
  }),
  price: Joi.number().min(0).required().messages({
    'number.min': 'Giá sản phẩm không được âm',
    'any.required': 'Giá sản phẩm là bắt buộc',
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.min': 'Số lượng phải lớn hơn 0',
    'any.required': 'Số lượng là bắt buộc',
  }),
  image: Joi.string().uri().optional().allow('', null),
  attributes: Joi.object().optional(),
});

/**
 * Validator cho tạo đơn hàng nhanh
 */
export const createQuickOrder = {
  body: Joi.object({
    customer: customerSchema.required().messages({
      'any.required': 'Thông tin khách hàng là bắt buộc',
    }),
    items: Joi.array().items(orderItemSchema).min(1).required().messages({
      'array.min': 'Đơn hàng phải có ít nhất 1 sản phẩm',
      'any.required': 'Danh sách sản phẩm là bắt buộc',
    }),
    shippingFee: Joi.number().min(0).optional().messages({
      'number.min': 'Phí vận chuyển không được âm',
    }),
    note: Joi.string().trim().max(500).optional().allow('', null).messages({
      'string.max': 'Ghi chú không được vượt quá 500 ký tự',
    }),
  }),
};

/**
 * Validator cho tra cứu đơn hàng
 */
export const trackOrder = {
  params: Joi.object({
    orderCode: Joi.string()
      .pattern(/^PHUC\d{8}$/)
      .required(),
  }),
  query: Joi.object({
    token: Joi.string().optional(),
  }),
};
