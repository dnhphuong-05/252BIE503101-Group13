import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import User from "../models/user/User.js";

/**
 * Middleware to verify JWT token and authenticate user
 * Throws error if token is invalid or missing
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Access token required");
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );

    // Get user from database
    const user = await User.findById(decoded.id).select("-password_hash");

    if (!user) {
      throw ApiError.unauthorized("User not found");
    }

    if (user.status !== "active") {
      throw ApiError.forbidden("Account is not active");
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      next(ApiError.unauthorized("Invalid token"));
    } else if (error.name === "TokenExpiredError") {
      next(ApiError.unauthorized("Token expired"));
    } else {
      next(error);
    }
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't throw error if missing
 * Used for endpoints that work for both authenticated and guest users
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    // If no token, continue without user
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Try to verify token
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      );

      // Get user from database
      const user = await User.findById(decoded.id).select("-password_hash");

      if (user && user.status === "active") {
        req.user = user;
      } else {
        req.user = null;
      }
    } catch (tokenError) {
      // If token is invalid, just continue as guest
      req.user = null;
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden("You do not have permission to perform this action"),
      );
    }

    next();
  };
};

/**
 * Alias for authenticate middleware (commonly used as 'protect')
 */
export const protect = authenticate;
