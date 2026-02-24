import Joi from "joi";

export const getNotifications = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    unread: Joi.boolean().optional(),
  }),
};

export const markNotificationRead = {
  params: Joi.object({
    notification_id: Joi.string()
      .pattern(/^NTF\d{6}$/)
      .required(),
  }),
};

export const createNotification = {
  body: Joi.object({
    user_id: Joi.string()
      .pattern(/^USR\d{6}$/)
      .required(),
    type: Joi.string()
      .valid(
        "order_confirmed",
        "order_shipped",
        "order_delivered",
        "order_received",
        "order_cancelled",
        "return_requested",
        "rent_confirmed",
        "rent_out_for_delivery",
        "rent_ongoing",
        "rent_return_requested",
        "rent_return_label_created",
        "rent_return_shipped",
        "rent_return_received",
        "rent_inspected",
        "rent_closed",
        "rent_cancelled",
        "rent_violated",
        "deposit_refunded",
        "contact_received",
        "contact_handled",
      )
      .required(),
    title: Joi.string().trim().min(2).max(200).required(),
    message: Joi.string().trim().min(2).max(1000).required(),
    entity_type: Joi.string().valid("sales_order", "rent_order", "contact").required(),
    entity_id: Joi.string().trim().required(),
    link: Joi.string().trim().allow("").optional(),
    is_read: Joi.boolean().optional(),
  }),
};
