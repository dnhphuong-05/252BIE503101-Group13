import { ApiError } from "../utils/index.js";

/**
 * Middleware để validate request data bằng Joi schema
 * @param {Object} schema - Joi validation schema hoặc object chứa schemas cho body, query, params
 * @param {String} source - Nguồn data cần validate: 'body', 'query', 'params' (chỉ dùng khi schema là Joi schema trực tiếp)
 */
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    // Check if schema is an object with body/params/query keys (multi-source validation)
    const isMultiSource =
      schema &&
      typeof schema === "object" &&
      !schema.validate &&
      (schema.body || schema.params || schema.query);

    if (isMultiSource) {
      // Use validateMultiple logic
      const errors = [];

      for (const [src, sch] of Object.entries(schema)) {
        if (!sch) continue;

        const { error, value } = sch.validate(req[src], {
          abortEarly: false,
          stripUnknown: true,
        });

        if (error) {
          const sourceErrors = error.details.map((detail) => ({
            source: src,
            field: detail.path.join("."),
            message: detail.message,
          }));
          errors.push(...sourceErrors);
        } else {
          req[src] = value;
        }
      }

      if (errors.length > 0) {
        const errorMessage = errors.length === 1 
          ? errors[0].message 
          : 'Dữ liệu không hợp lệ';
        
        const error = new ApiError(400, errorMessage);
        error.errors = errors;
        return next(error);
      }

      return next();
    }

    // Single source validation (original logic)
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Trả về tất cả lỗi
      stripUnknown: true, // Loại bỏ các field không có trong schema
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      const errorMessage = errors.length === 1 
        ? errors[0].message 
        : 'Dữ liệu không hợp lệ';
      
      const apiError = new ApiError(400, errorMessage);
      apiError.errors = errors;
      return next(apiError);
    }

    // Replace request data với validated & sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validate multiple sources cùng lúc
 * @param {Object} schemas - Object chứa schemas cho body, query, params
 * @example
 * validateMultiple({ body: createUserSchema, params: idParamSchema })
 */
export const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = [];

    for (const [source, schema] of Object.entries(schemas)) {
      const { error, value } = schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const sourceErrors = error.details.map((detail) => ({
          source,
          field: detail.path.join("."),
          message: detail.message,
        }));
        errors.push(...sourceErrors);
      } else {
        req[source] = value;
      }
    }

    if (errors.length > 0) {
      return next(
        new ApiError(
          400,
          "Dữ liệu không hợp lệ",
          true,
          JSON.stringify({ errors }),
        ),
      );
    }

    next();
  };
};
