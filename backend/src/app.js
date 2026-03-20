import express from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/index.js";
import { logger } from "./utils/index.js";

/**
 * Create Express application
 */
const app = express();

// ========== Middleware ==========

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Cho phép Postman, mobile app, curl
    if (!origin) return callback(null, true);

    // 🔥 Cho phép mọi localhost (mọi port)
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Whitelist production (nếu có)
    const allowedOrigins = (process.env.CORS_ORIGIN || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};


app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// HTTP request logger
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ========== Routes ==========

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Phục API Server",
    version: "1.0.0",
    documentation: "/api-docs",
    endpoints: {
      health: "/health",
      api: "/api",
    },
  });
});

// API Routes
app.use("/api", routes);

// ========== Error Handling ==========

// Handle 404 - Route not found
app.use(notFoundHandler);

// Global error handler (phải đặt cuối cùng)
app.use(errorHandler);

// ========== Export ==========
export default app;
