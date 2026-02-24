import Joi from "joi";

export const createGuestCustomer = {
  body: Joi.object({
    full_name: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string()
      .trim()
      .pattern(/^[0-9]{10,11}$/)
      .required(),
    email: Joi.string().trim().email().allow("", null),
    address: Joi.object({
      province: Joi.string().trim().required(),
      district: Joi.string().trim().allow("", null),
      ward: Joi.string().trim().required(),
      detail: Joi.string().trim().required(),
    }).required(),
  }),
};
