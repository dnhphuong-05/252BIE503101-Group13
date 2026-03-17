import Joi from "joi";

const statusValues = [
  "created",
  "consulted",
  "sample_confirmed",
  "tailoring",
  "fitting_adjustment",
  "completed",
  "delivered",
  "cancelled",
  // Legacy statuses for backward compatibility.
  "confirmed_request",
  "quoted",
  "order_confirmed",
  "shipping",
];

const channelValues = ["zalo", "phone", "web"];
const paymentMethodValues = ["cash", "bank_transfer", "zalo_pay", "other"];
const paymentStatusValues = ["unpaid", "deposited", "partial", "paid"];
const receiveMethodValues = ["pickup_at_store", "home_delivery"];

export const getTailorOrdersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().trim().default("-created_at"),
    status: Joi.string()
      .valid(...statusValues, "all")
      .optional(),
    search: Joi.string().trim().allow("").optional(),
    source_contact_id: Joi.number().integer().min(1).optional(),
  }),
};

export const getTailorOrderByIdSchema = {
  params: Joi.object({
    order_id: Joi.string()
      .trim()
      .pattern(/^(TLR\d{6}|[a-fA-F0-9]{24})$/)
      .required(),
  }),
};

export const createTailorOrderFromContactSchema = {
  params: Joi.object({
    contact_id: Joi.number().integer().min(1).required(),
  }),
};

export const updateTailorOrderSchema = {
  body: Joi.object({
    customer: Joi.object({
      customer_code: Joi.string().trim().allow("").max(120).optional(),
      full_name: Joi.string().trim().allow("").max(255).optional(),
      phone: Joi.string().trim().allow("").max(40).optional(),
      email: Joi.string().trim().email().allow("").max(255).optional(),
      zalo_contact: Joi.string().trim().allow("").max(120).optional(),
      address: Joi.string().trim().allow("").max(1000).optional(),
      customer_note: Joi.string().trim().allow("").max(2000).optional(),
    }).optional(),
    communication: Joi.object({
      channel: Joi.string()
        .valid(...channelValues)
        .optional(),
      handled_by: Joi.string().trim().allow("").max(120).optional(),
      customer_confirmed_at: Joi.date().iso().allow(null).optional(),
      note: Joi.string().trim().allow("").max(2000).optional(),
    }).optional(),
    product: Joi.object({
      reference_product_id: Joi.number().integer().min(1).allow(null).optional(),
      reference_model_code: Joi.string().trim().allow("").max(120).optional(),
      reference_product_name: Joi.string().trim().allow("").max(255).optional(),
      reference_sku: Joi.string().trim().allow("").max(120).optional(),
      title: Joi.string().trim().allow("").max(255).optional(),
      category_name: Joi.string().trim().allow("").max(255).optional(),
      base_description: Joi.string().trim().allow("").max(2000).optional(),
      base_price: Joi.number().min(0).optional(),
      era: Joi.string().trim().allow("").max(255).optional(),
      material: Joi.string().trim().allow("").max(255).optional(),
      craftsmanship: Joi.string().trim().allow("").max(255).optional(),
      color_palette: Joi.string().trim().allow("").max(255).optional(),
      pattern_note: Joi.string().trim().allow("").max(500).optional(),
      style_adjustments: Joi.string().trim().allow("").max(2000).optional(),
      custom_request: Joi.string().trim().allow("").max(2000).optional(),
      size_note: Joi.string().trim().allow("").max(1000).optional(),
      measurement_note: Joi.string().trim().allow("").max(2000).optional(),
      extra_price: Joi.number().min(0).optional(),
      quantity: Joi.number().integer().min(1).optional(),
      accessories: Joi.string().trim().allow("").max(1000).optional(),
      customization_note: Joi.string().trim().allow("").max(2000).optional(),
      thumbnail: Joi.string().trim().allow("").max(500).optional(),
      measurements: Joi.object({
        height: Joi.number().allow(null).optional(),
        weight: Joi.number().allow(null).optional(),
        chest: Joi.number().allow(null).optional(),
        waist: Joi.number().allow(null).optional(),
        hip: Joi.number().allow(null).optional(),
        shoulder: Joi.number().allow(null).optional(),
        sleeve_length: Joi.number().allow(null).optional(),
        top_length: Joi.number().allow(null).optional(),
        bottom_length: Joi.number().allow(null).optional(),
        other_measurements: Joi.string().trim().allow("").max(2000).optional(),
      }).optional(),
      attachments: Joi.object({
        customer_reference_images: Joi.array()
          .items(Joi.string().trim().allow("").max(500))
          .optional(),
        fabric_images: Joi.array().items(Joi.string().trim().allow("").max(500)).optional(),
        final_design_images: Joi.array()
          .items(Joi.string().trim().allow("").max(500))
          .optional(),
      }).optional(),
      tailor_note: Joi.string().trim().allow("").max(2000).optional(),
    }).optional(),
    pricing: Joi.object({
      quoted_price: Joi.number().min(0).optional(),
      deposit_amount: Joi.number().min(0).optional(),
      shipping_fee: Joi.number().min(0).optional(),
    }).optional(),
    finance: Joi.object({
      payment_method: Joi.string()
        .valid(...paymentMethodValues)
        .optional(),
      payment_status: Joi.string()
        .valid(...paymentStatusValues)
        .optional(),
      paid_amount: Joi.number().min(0).optional(),
      payment_date: Joi.date().iso().allow(null).optional(),
      transaction_code: Joi.string().trim().allow("").max(120).optional(),
      material_cost: Joi.number().min(0).optional(),
      labor_cost: Joi.number().min(0).optional(),
      accessory_cost: Joi.number().min(0).optional(),
      other_cost: Joi.number().min(0).optional(),
      note: Joi.string().trim().allow("").max(2000).optional(),
    }).optional(),
    shipping: Joi.object({
      receive_method: Joi.string()
        .valid(...receiveMethodValues)
        .optional(),
      carrier_name: Joi.string().trim().allow("").max(120).optional(),
      tracking_code: Joi.string().trim().allow("").max(120).optional(),
      label_code: Joi.string().trim().allow("").max(120).optional(),
      note: Joi.string().trim().allow("").max(1000).optional(),
      estimated_delivery_at: Joi.date().iso().allow(null).optional(),
      actual_delivery_at: Joi.date().iso().allow(null).optional(),
    }).optional(),
    admin_note: Joi.string().trim().allow("").max(4000).optional(),
    cancel_reason: Joi.string().trim().allow("").max(1000).optional(),
    status_note: Joi.string().trim().allow("").max(1000).optional(),
    status: Joi.string()
      .valid(...statusValues)
      .optional(),
  }).min(1),
};

export const generateTailorShipmentSchema = {
  body: Joi.object({
    carrier_name: Joi.string().trim().allow("").max(120).optional(),
    note: Joi.string().trim().allow("").max(1000).optional(),
  }),
};
