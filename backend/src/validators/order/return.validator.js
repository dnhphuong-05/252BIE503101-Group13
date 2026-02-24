import Joi from "joi";

export const getReturnsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid(
      "submitted",
      "need_more_info",
      "approved",
      "awaiting_return_shipment",
      "return_in_transit",
      "received_inspecting",
      "refund_processing",
      "refunded",
      "closed",
    )
    .allow(""),
  search: Joi.string().trim().allow(""),
});

export const getReturnByIdSchema = Joi.object({
  return_id: Joi.string()
    .pattern(/^RET\d{6}$/)
    .required(),
});

export const updateReturnStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      "submitted",
      "need_more_info",
      "approved",
      "awaiting_return_shipment",
      "return_in_transit",
      "received_inspecting",
      "refund_processing",
      "refunded",
      "closed",
    )
    .allow(null, ""),
  note: Joi.string().trim().allow("").max(1000),
  admin_note: Joi.string().trim().allow("").max(1000),
  return_shipping: Joi.object({
    provider: Joi.string().trim().allow("", null).max(100),
    tracking_code: Joi.string().trim().allow("", null).max(100),
    label_code: Joi.string().trim().allow("", null).max(100),
    received_label_at: Joi.date().iso().allow(null),
  }).optional(),
  refund: Joi.object({
    requested_amount: Joi.number().min(0).optional(),
    approved_amount: Joi.number().min(0).optional(),
    adjusted_amount: Joi.number().min(0).optional(),
    method: Joi.string().trim().allow("", null).max(100),
    note: Joi.string().trim().allow("").max(1000),
    processed_at: Joi.date().iso().allow(null),
    receipt_url: Joi.string().trim().allow("", null).max(500),
  }).optional(),
});
