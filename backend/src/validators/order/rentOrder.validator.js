import Joi from "joi";

const addressSchema = Joi.object({
  province: Joi.string().trim().allow("").default(""),
  district: Joi.string().trim().allow("").default(""),
  ward: Joi.string().trim().allow("").default(""),
  address_detail: Joi.string().trim().allow("").default(""),
});

const customerInfoSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string()
    .trim()
    .pattern(/^(0|\+84)[0-9]{9,10}$/)
    .required(),
  email: Joi.string().trim().lowercase().email().allow(null, "").default(null),
  delivery_method: Joi.string().valid("ship", "pickup").required(),
  address: addressSchema.allow(null).default(null),
});

const itemSchema = Joi.object({
  product_id: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().trim().min(1))
    .required(),
  sku: Joi.string().trim().required(),
  name_snapshot: Joi.string().trim().min(1).max(200).required(),
  thumbnail_snapshot: Joi.string().trim().allow("").default(""),
  rent_price_per_day: Joi.number().min(0).required(),
  deposit_amount: Joi.number().min(0).required(),
  quantity: Joi.number().integer().min(1).required(),
});

const rentalPeriodSchema = Joi.object({
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref("start_date")).required(),
  days: Joi.number().integer().min(1).required(),
});

const pricingSchema = Joi.object({
  rent_fee_expected: Joi.number().min(0).required(),
  deposit_required: Joi.number().min(0).required(),
  shipping_fee: Joi.number().min(0).default(0),
  discount_amount: Joi.number().min(0).default(0),
  total_due_today: Joi.number().min(0).required(),
  refund_expected: Joi.number().min(0).default(0),
  late_fee: Joi.number().min(0).default(0),
  damage_fee: Joi.number().min(0).default(0),
});

const paymentSchema = Joi.object({
  payment_method: Joi.string().valid("cod", "bank", "momo", "vnpay").required(),
  deposit_paid: Joi.number().min(0).default(0),
  payment_status: Joi.string().valid("unpaid", "partial", "paid").default("unpaid"),
  paid_at: Joi.date().iso().allow(null),
});

export const createRentOrder = {
  body: Joi.object({
    user_id: Joi.string().trim().pattern(/^USR\d{6}$/).allow(null),
    guest_id: Joi.string().trim().pattern(/^GST\d{6}$/).allow(null),
    customer_info: customerInfoSchema.required(),
    item: itemSchema.required(),
    rental_period: rentalPeriodSchema.required(),
    pricing: pricingSchema.required(),
    payment: paymentSchema.required(),
    rent_status: Joi.string()
      .valid(
        "booked",
        "ongoing",
        "return_requested",
        "returning",
        "returned",
        "closed",
        "cancelled",
        "violated",
      )
      .default("booked"),
    note: Joi.string().trim().allow("").max(500).default(""),
  })
    .custom((value, helpers) => {
      if (!value.user_id && !value.guest_id) {
        return helpers.error("any.custom", {
          message: "Rent order requires user_id or guest_id",
        });
      }
      const guestEmail = (value.customer_info?.email || "").trim();
      if (value.guest_id && !guestEmail) {
        return helpers.error("any.custom", {
          message: "Guest rent orders require email to receive tracking",
        });
      }
      if (
        value.customer_info?.delivery_method === "ship" &&
        !value.customer_info?.address
      ) {
        return helpers.error("any.custom", {
          message: "Shipping address is required for delivery",
        });
      }
      return value;
    })
    .messages({
      "any.custom": "{{#message}}",
    }),
};

export const getRentOrdersByUserId = {
  params: Joi.object({
    user_id: Joi.string().trim().pattern(/^USR\d{6}$/).required(),
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export const getRentOrdersByGuestId = {
  params: Joi.object({
    guest_id: Joi.string().trim().pattern(/^GST\d{6}$/).required(),
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export const getRentOrders = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    rent_status: Joi.string()
      .valid(
        "booked",
        "ongoing",
        "return_requested",
        "returning",
        "returned",
        "closed",
        "cancelled",
        "violated",
      )
      .optional(),
    payment_status: Joi.string().valid("unpaid", "partial", "paid").optional(),
  }),
};

export const getRentOrderById = {
  params: Joi.object({
    rent_order_id: Joi.string()
      .trim()
      .pattern(/^(RNT|PHUC-RNT-)\d{10}$/)
      .required(),
  }),
};

const conditionSchema = Joi.object({
  photos: Joi.array().items(Joi.string().trim()).default([]),
  note: Joi.string().trim().allow("").max(500).default(""),
});

export const updateRentOrderStatus = {
  body: Joi.object({
    rent_status: Joi.string()
      .valid(
        "booked",
        "ongoing",
        "return_requested",
        "returning",
        "returned",
        "closed",
        "cancelled",
        "violated",
      )
      .optional(),
    admin_note: Joi.string().trim().allow("").max(1000),
    cancel_reason: Joi.string().trim().allow("").max(500),
    contact_channel: Joi.string().valid("zalo", "phone", "web").allow("", null).optional(),
    contacted_at: Joi.date().iso().allow(null).optional(),
    confirmed_at: Joi.date().iso().allow(null).optional(),
    deposit_paid: Joi.number().min(0).optional(),
    payment_status: Joi.string().valid("unpaid", "partial", "paid").optional(),
    shipping_out: Joi.object({
      provider: Joi.string().trim().allow("", null).max(100),
      tracking_code: Joi.string().trim().allow("", null).max(100),
      shipped_at: Joi.date().iso().allow(null),
      delivered_at: Joi.date().iso().allow(null),
    }).optional(),
    shipping_back: Joi.object({
      provider: Joi.string().trim().allow("", null).max(100),
      tracking_code: Joi.string().trim().allow("", null).max(100),
      created_by_shop: Joi.boolean().optional(),
      shipped_at: Joi.date().iso().allow(null),
      delivered_at: Joi.date().iso().allow(null),
    }).optional(),
    return_request: Joi.object({
      requested_at: Joi.date().iso().allow(null),
      note: Joi.string().trim().allow("").max(500),
    }).optional(),
    condition_out: conditionSchema.optional(),
    condition_in: conditionSchema.optional(),
    pricing: Joi.object({
      late_fee: Joi.number().min(0).optional(),
      damage_fee: Joi.number().min(0).optional(),
      refund_expected: Joi.number().min(0).optional(),
    }).optional(),
    settlement: Joi.object({
      refund_expected: Joi.number().min(0).optional(),
      refund_paid: Joi.number().min(0).optional(),
      refunded_at: Joi.date().iso().allow(null),
      refund_receipt_url: Joi.string().trim().allow("", null).max(500),
      refund_note: Joi.string().trim().allow("").max(1000),
      penalty_fee: Joi.number().min(0).optional(),
      late_fee: Joi.number().min(0).optional(),
      damage_fee: Joi.number().min(0).optional(),
      cleaning_fee: Joi.number().min(0).optional(),
      extra_charge: Joi.number().min(0).optional(),
    }).optional(),
    log_note: Joi.string().trim().allow("").max(500),
    notify_return_reminder: Joi.boolean().optional(),
    notify_violation: Joi.boolean().optional(),
  }),
};

export const requestReturnByUser = {
  body: Joi.object({
    note: Joi.string().trim().allow("").max(500).default(""),
  }),
};

export const confirmReturnShipment = {
  body: Joi.object({
    note: Joi.string().trim().allow("").max(500).default(""),
  }),
};

export const cancelRentOrderByUser = {
  body: Joi.object({
    reason: Joi.string().trim().allow("").max(500).default(""),
  }),
};
