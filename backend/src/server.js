import dotenv from "dotenv";
import app from "./app.js";
import { connectDB } from "./config/index.js";
import { logger } from "./utils/index.js";
import {
  handleUnhandledRejection,
  handleUncaughtException,
} from "./middlewares/index.js";

// Load environment variables
dotenv.config();

// Handle uncaught exceptions
handleUncaughtException();

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log("\n" + "=".repeat(60));
    logger.success(`Server đang chạy tại: http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    logger.info(
      `CORS Origin: ${process.env.CORS_ORIGIN || "http://localhost:4200"}`,
    );
    console.log("=".repeat(60) + "\n");
  });

  // Handle server errors (like port already in use)
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      logger.error(`\n❌ Port ${PORT} is already in use!`);
      logger.info(`\n💡 Solutions:`);
      logger.info(`   1. Kill the process using port ${PORT}:`);
      logger.info(`      Windows: netstat -ano | findstr :${PORT}`);
      logger.info(`               taskkill /PID <PID> /F`);
      logger.info(`      Linux/Mac: lsof -ti:${PORT} | xargs kill -9`);
      logger.info(`   2. Or use a different port: PORT=${PORT + 1} npm start\n`);
      process.exit(1);
    } else {
      logger.error(`\n❌ Server error:`, error);
      process.exit(1);
    }
  });

  // Handle unhandled promise rejections
  handleUnhandledRejection();

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    logger.warn(`\n${signal} received. Closing server gracefully...`);

    server.close(() => {
      logger.success("Server closed successfully");
      process.exit(0);
    });

    // Force close after 10s
    setTimeout(() => {
      logger.error("Forcing shutdown...");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}).catch((error) => {
  logger.error("❌ Failed to connect to MongoDB:", error.message);
  process.exit(1);
});
