import Joi from "joi";

/**
 * Validation schemas cho Buy Orders
 */

const addressSchema = Joi.object({
  province: Joi.string()
    .required()
    .trim()
    .messages({
      "any.required": "Tá»‰nh/ThÃ nh phá»‘ lÃ  báº¯t buá»™c",
    }),
  district: Joi.string().trim().allow("").default(""),
  ward: Joi.string()
    .required()
    .trim()
    .messages({
      "any.required": "XÃ£/PhÆ°á»ng/Äáº·c khu lÃ  báº¯t buá»™c",
    }),
  detail: Joi.string().trim().allow(""),
  address_detail: Joi.string().trim().allow(""),
})
  .or("detail", "address_detail")
  .messages({
    "object.missing": "Äá»‹a chá»‰ chi tiáº¿t lÃ  báº¯t buá»™c",
  });

// Schema cho customer_info
const customerInfoSchema = Joi.object({
  full_name: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(100)
    .messages({
      "any.required": "Há» vÃ  tÃªn lÃ  báº¯t buá»™c",
      "string.min": "Há» vÃ  tÃªn pháº£i cÃ³ Ã­t nháº¥t 2 kÃ½ tá»±",
      "string.max": "Há» vÃ  tÃªn khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 100 kÃ½ tá»±",
    }),
  phone: Joi.string()
    .required()
    .trim()
    .pattern(/^(0|\+84)[0-9]{9,10}$/)
    .messages({
      "any.required": "Sá»‘ Ä‘iá»‡n thoáº¡i lÃ  báº¯t buá»™c",
      "string.pattern.base": "Sá»‘ Ä‘iá»‡n thoáº¡i khÃ´ng há»£p lá»‡",
    }),
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .allow("")
    .messages({
      "string.email": "Email khÃ´ng há»£p lá»‡",
    }),
  address: addressSchema.required().messages({
    "any.required": "Äá»‹a chá»‰ lÃ  báº¯t buá»™c",
  }),
});

// Schema cho tá»«ng item trong Ä‘Æ¡n hÃ ng
const orderItemSchema = Joi.object({
  product_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      "any.required": "Product ID lÃ  báº¯t buá»™c",
      "number.positive": "Product ID pháº£i lÃ  sá»‘ dÆ°Æ¡ng",
    }),
  sku: Joi.string()
    .required()
    .trim()
    .messages({
      "any.required": "SKU lÃ  báº¯t buá»™c",
    }),
  name: Joi.string()
    .required()
    .trim()
    .min(3)
    .max(200)
    .messages({
      "any.required": "TÃªn sáº£n pháº©m lÃ  báº¯t buá»™c",
      "string.min": "TÃªn sáº£n pháº©m pháº£i cÃ³ Ã­t nháº¥t 3 kÃ½ tá»±",
      "string.max": "TÃªn sáº£n pháº©m khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 200 kÃ½ tá»±",
    }),
  thumbnail: Joi.string()
    .uri()
    .allow("")
    .default("")
    .messages({
      "string.uri": "Thumbnail pháº£i lÃ  URL há»£p lá»‡",
    }),
  size: Joi.string()
    .trim()
    .allow("", null)
    .messages({
      "string.base": "Size pháº£i lÃ  chuá»—i",
    }),
  color: Joi.string()
    .trim()
    .allow("", null)
    .messages({
      "string.base": "MÃ u sáº¯c pháº£i lÃ  chuá»—i",
    }),
  price: Joi.number()
    .min(0)
    .required()
    .messages({
      "any.required": "GiÃ¡ sáº£n pháº©m lÃ  báº¯t buá»™c",
      "number.min": "GiÃ¡ sáº£n pháº©m khÃ´ng Ä‘Æ°á»£c Ã¢m",
    }),
  quantity: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      "any.required": "Sá»‘ lÆ°á»£ng lÃ  báº¯t buá»™c",
      "number.min": "Sá»‘ lÆ°á»£ng pháº£i Ã­t nháº¥t lÃ  1",
    }),
});

// Schema cho viá»‡c táº¡o Ä‘Æ¡n hÃ ng má»›i
export const createBuyOrderSchema = Joi.object({
  user_id: Joi.string()
    .trim()
    .pattern(/^USR\d{6}$/)
    .allow(null)
    .messages({
      "string.pattern.base": "User ID pháº£i cÃ³ Ä‘á»‹nh dáº¡ng USR000123",
    }),
  guest_id: Joi.string()
    .trim()
    .pattern(/^GST\d{6}$/)
    .allow(null)
    .messages({
      "string.pattern.base": "Guest ID pháº£i cÃ³ Ä‘á»‹nh dáº¡ng GST000456",
    }),
  customer_info: customerInfoSchema.required().messages({
    "any.required": "ThÃ´ng tin khÃ¡ch hÃ ng lÃ  báº¯t buá»™c",
  }),
  items: Joi.array()
    .items(orderItemSchema)
    .min(1)
    .required()
    .messages({
      "any.required": "ÄÆ¡n hÃ ng pháº£i cÃ³ Ã­t nháº¥t 1 sáº£n pháº©m",
      "array.min": "ÄÆ¡n hÃ ng pháº£i cÃ³ Ã­t nháº¥t 1 sáº£n pháº©m",
    }),
  shipping_fee: Joi.number()
    .min(0)
    .default(0)
    .messages({
      "number.min": "PhÃ­ ship khÃ´ng Ä‘Æ°á»£c Ã¢m",
    }),
  discount_amount: Joi.number()
    .min(0)
    .default(0)
    .messages({
      "number.min": "Sá»‘ tiá»n giáº£m giÃ¡ khÃ´ng Ä‘Æ°á»£c Ã¢m",
    }),
  payment_method: Joi.string()
    .valid("cod", "vnpay", "momo", "bank_transfer")
    .required()
    .messages({
      "any.required": "PhÆ°Æ¡ng thá»©c thanh toÃ¡n lÃ  báº¯t buá»™c",
      "any.only": "PhÆ°Æ¡ng thá»©c thanh toÃ¡n khÃ´ng há»£p lá»‡",
    }),
  shipping_provider: Joi.string()
    .trim()
    .allow(null, "")
    .default(null)
    .max(100),
  shipping_method: Joi.string()
    .trim()
    .allow(null, "")
    .default(null)
    .max(100),
  tracking_code: Joi.string()
    .trim()
    .allow(null, "")
    .default(null)
    .max(100),
})
  .custom((value, helpers) => {
    if (!value.user_id && !value.guest_id) {
      return helpers.error("any.custom", {
        message: "Order must include user_id or guest_id",
      });
    }

    const guestEmail = (value.customer_info?.email || "").trim();
    if (value.guest_id && !guestEmail) {
      return helpers.error("any.custom", {
        message: "Guest orders require a valid email to receive tracking info",
      });
    }

    return value;
  })
  .messages({
    "any.custom": "{{#message}}",
  });

// Schema cho query params khi láº¥y danh sÃ¡ch Ä‘Æ¡n hÃ ng
export const getBuyOrdersSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  order_status: Joi.string()
    .valid("pending", "confirmed", "processing", "shipping", "completed", "cancelled")
    .allow("")
    .messages({
      "any.only": "Tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng khÃ´ng há»£p lá»‡",
    }),
  payment_status: Joi.string()
    .valid("unpaid", "partial", "paid", "failed", "refunded")
    .allow("")
    .messages({
      "any.only": "Tráº¡ng thÃ¡i thanh toÃ¡n khÃ´ng há»£p lá»‡",
    }),
  payment_method: Joi.string()
    .valid("cod", "vnpay", "momo", "bank_transfer")
    .allow("")
    .messages({
      "any.only": "PhÆ°Æ¡ng thá»©c thanh toÃ¡n khÃ´ng há»£p lá»‡",
    }),
});

// Schema cho params khi láº¥y Ä‘Æ¡n hÃ ng theo order_id
export const getOrderByIdSchema = Joi.object({
  order_id: Joi.string()
    .pattern(/^(ORD\d{10}|PHUC-BUY-\d{10}|[a-fA-F0-9]{24})$/)
    .required()
    .messages({
      "any.required": "Order ID lÃ  báº¯t buá»™c",
      "string.pattern.base": "Order ID pháº£i cÃ³ Ä‘á»‹nh dáº¡ng ORD2402030001",
    }),
});

// Schema cho params khi láº¥y Ä‘Æ¡n hÃ ng theo user_id
export const getOrdersByUserIdSchema = Joi.object({
  user_id: Joi.string()
    .pattern(/^USR\d{6}$/)
    .required()
    .messages({
      "any.required": "User ID lÃ  báº¯t buá»™c",
      "string.pattern.base": "User ID pháº£i cÃ³ Ä‘á»‹nh dáº¡ng USR000123",
    }),
});

// Schema cho params khi láº¥y Ä‘Æ¡n hÃ ng theo guest_id
export const getOrdersByGuestIdSchema = Joi.object({
  guest_id: Joi.string()
    .pattern(/^GST\d{6}$/)
    .required()
    .messages({
      "any.required": "Guest ID lÃ  báº¯t buá»™c",
      "string.pattern.base": "Guest ID pháº£i cÃ³ Ä‘á»‹nh dáº¡ng GST000456",
    }),
});

// Schema cho cáº­p nháº­t tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng
export const updateOrderStatusSchema = Joi.object({
  order_status: Joi.string()
    .valid("pending", "confirmed", "processing", "shipping", "completed", "cancelled")
    .required()
    .messages({
      "any.required": "Tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng lÃ  báº¯t buá»™c",
      "any.only": "Tráº¡ng thÃ¡i Ä‘Æ¡n hÃ ng khÃ´ng há»£p lá»‡",
    }),
  cancel_reason: Joi.string().trim().allow("").max(500),
  admin_note: Joi.string().trim().allow("").max(1000),
  shipping_provider: Joi.string().trim().allow("", null).max(100),
  tracking_code: Joi.string().trim().allow("", null).max(100),
  shipping_status: Joi.string()
    .valid("pending", "ready_to_ship", "shipped", "delivered", "delivery_failed")
    .allow("", null),
  shipping_status_detail: Joi.string().trim().allow("", null).max(200),
  shipping_method: Joi.string().trim().allow("", null).max(100),
  shipping_fee: Joi.number().min(0).optional(),
  estimated_delivery_at: Joi.date().iso().allow(null),
  contact_channel: Joi.string().valid("zalo", "phone", "web").allow("", null),
  contacted_at: Joi.date().iso().allow(null),
});

// Schema cho cáº­p nháº­t tráº¡ng thÃ¡i thanh toÃ¡n
export const updatePaymentStatusSchema = Joi.object({
  payment_status: Joi.string()
    .valid("unpaid", "partial", "paid", "failed", "refunded")
    .required()
    .messages({
      "any.required": "Tráº¡ng thÃ¡i thanh toÃ¡n lÃ  báº¯t buá»™c",
      "any.only": "Tráº¡ng thÃ¡i thanh toÃ¡n khÃ´ng há»£p lá»‡",
    }),
  payment_transaction_code: Joi.string().trim().allow("", null).max(120),
});

// Schema cho cáº­p nháº­t thÃ´ng tin váº­n chuyá»ƒn
export const updateTrackingSchema = Joi.object({
  shipping_provider: Joi.string()
    .trim()
    .required()
    .max(100)
    .messages({
      "any.required": "NhÃ  váº­n chuyá»ƒn lÃ  báº¯t buá»™c",
      "string.max": "TÃªn nhÃ  váº­n chuyá»ƒn khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 100 kÃ½ tá»±",
    }),
  tracking_code: Joi.string()
    .trim()
    .required()
    .max(100)
    .messages({
      "any.required": "MÃ£ váº­n Ä‘Æ¡n lÃ  báº¯t buá»™c",
      "string.max": "MÃ£ váº­n Ä‘Æ¡n khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 100 kÃ½ tá»±",
    }),
  shipping_status: Joi.string()
    .valid("pending", "ready_to_ship", "shipped", "delivered", "delivery_failed")
    .allow("", null),
  shipping_method: Joi.string().trim().allow("", null).max(100),
  shipping_fee: Joi.number().min(0).optional(),
  estimated_delivery_at: Joi.date().iso().allow(null),
  shipping_status_detail: Joi.string().trim().allow("", null).max(200),
});

// Schema cho há»§y Ä‘Æ¡n hÃ ng
export const cancelOrderSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .allow("")
    .max(500)
    .messages({
      "string.max": "LÃ½ do há»§y khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 500 kÃ½ tá»±",
    }),
});

// Schema cho khách xác nhận nhận hàng
export const confirmReceivedSchema = Joi.object({
  note: Joi.string().trim().allow("").max(500),
});

// Schema cho yêu cầu hoàn trả
export const createReturnRequestSchema = Joi.object({
  reason: Joi.string().trim().allow("").max(500),
  note: Joi.string().trim().allow("").max(1000),
});

// Schema cho láº¥y thá»‘ng kÃª
export const getStatsSchema = Joi.object({
  user_id: Joi.string()
    .pattern(/^USR\d{6}$/)
    .allow("")
    .messages({
      "string.pattern.base": "User ID pháº£i cÃ³ Ä‘á»‹nh dáº¡ng USR000123",
    }),
  guest_id: Joi.string()
    .pattern(/^GST\d{6}$/)
    .allow("")
    .messages({
      "string.pattern.base": "Guest ID pháº£i cÃ³ Ä‘á»‹nh dáº¡ng GST000456",
    }),
  start_date: Joi.date()
    .iso()
    .allow("")
    .messages({
      "date.format": "NgÃ y báº¯t Ä‘áº§u pháº£i cÃ³ Ä‘á»‹nh dáº¡ng ISO 8601",
    }),
  end_date: Joi.date()
    .iso()
    .min(Joi.ref("start_date"))
    .allow("")
    .messages({
      "date.format": "NgÃ y káº¿t thÃºc pháº£i cÃ³ Ä‘á»‹nh dáº¡ng ISO 8601",
      "date.min": "NgÃ y káº¿t thÃºc pháº£i sau ngÃ y báº¯t Ä‘áº§u",
    }),
});

// Schema cho dashboard report
export const getDashboardReportSchema = Joi.object({
  days: Joi.number()
    .integer()
    .min(7)
    .max(365)
    .default(30)
    .messages({
      "number.base": "Days phải là số",
      "number.integer": "Days phải là số nguyên",
      "number.min": "Days tối thiểu là 7",
      "number.max": "Days tối đa là 365",
    }),
});
