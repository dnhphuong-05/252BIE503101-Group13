import Joi from "joi";
import { errorResponse } from "../utils/response.js";

/**
 * Middleware to validate request using Joi schema
 * @param {Object} schema - Joi validation schema object
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Return all errors
      allowUnknown: true, // Allow unknown keys that will be ignored
      stripUnknown: true, // Remove unknown keys from the validated data
    };

    const toValidate = {};
    const schemaToUse = {};

    if (schema.body) {
      toValidate.body = req.body;
      schemaToUse.body = schema.body;
    }
    if (schema.params) {
      toValidate.params = req.params;
      schemaToUse.params = schema.params;
    }
    if (schema.query) {
      toValidate.query = req.query;
      schemaToUse.query = schema.query;
    }

    const schemaObject = Joi.object(schemaToUse).unknown(true);

    const { error, value } = schemaObject.validate(
      toValidate,
      validationOptions,
    );

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return errorResponse(res, "Validation error", 400, errors);
    }

    // Replace request data with validated data
    if (value.body) req.body = value.body;
    if (value.params) req.params = value.params;
    if (value.query) req.query = value.query;

    next();
  };
};

export default validate;
export { validate }; // Named export for convenience
