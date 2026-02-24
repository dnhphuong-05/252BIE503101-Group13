import express from "express";
import {
  createContactMessage,
  getAllContactMessages,
  getContactMessageById,
  updateContactStatus,
  deleteContactMessage,
  getContactStatistics,
} from "../../controllers/contact/contactMessage.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { optionalAuthenticate } from "../../middlewares/auth.middleware.js";
import {
  createContactMessageSchema,
  updateContactStatusSchema,
  getContactMessagesQuerySchema,
} from "../../validators/contact/contactMessage.validator.js";
// import { protect, restrictTo } from "../../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * Public routes - Không cần authentication
 */

// POST /api/contact - Tạo contact message mới (từ form liên hệ)
router.post(
  "/",
  optionalAuthenticate,
  validate(createContactMessageSchema),
  createContactMessage,
);

/**
 * Admin routes - Cần authentication và quyền admin
 * TODO: Uncomment khi đã có auth middleware
 */

// GET /api/contact/statistics - Lấy thống kê (Admin)
// router.get(
//   "/statistics",
//   protect,
//   restrictTo("admin"),
//   getContactStatistics,
// );

// GET /api/contact - Lấy danh sách (Admin)
// router.get(
//   "/",
//   protect,
//   restrictTo("admin"),
//   validate(getContactMessagesQuerySchema, "query"),
//   getAllContactMessages,
// );

// GET /api/contact/:contactId - Lấy chi tiết (Admin)
// router.get(
//   "/:contactId",
//   protect,
//   restrictTo("admin"),
//   getContactMessageById,
// );

// PATCH /api/contact/:contactId/status - Cập nhật trạng thái (Admin)
// router.patch(
//   "/:contactId/status",
//   protect,
//   restrictTo("admin"),
//   validate(updateContactStatusSchema),
//   updateContactStatus,
// );

// DELETE /api/contact/:contactId - Xóa (Admin)
// router.delete(
//   "/:contactId",
//   protect,
//   restrictTo("admin"),
//   deleteContactMessage,
// );

/**
 * Temporary routes for testing without auth
 * TODO: Remove these when auth is implemented
 */
router.get("/statistics", getContactStatistics);
router.get(
  "/",
  validate(getContactMessagesQuerySchema, "query"),
  getAllContactMessages,
);
router.get("/:contactId", getContactMessageById);
router.patch(
  "/:contactId/status",
  optionalAuthenticate,
  validate(updateContactStatusSchema),
  updateContactStatus,
);
router.delete("/:contactId", deleteContactMessage);

export default router;
