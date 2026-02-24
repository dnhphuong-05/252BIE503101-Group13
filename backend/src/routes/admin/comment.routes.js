import express from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import { requireStaff } from "../../middlewares/role.middleware.js";
import {
  getAdminComments,
  approveComment,
  rejectComment,
  markAsSpam,
  deleteComment,
  replyComment,
} from "../../controllers/admin/comment.controller.js";

const router = express.Router();

router.use(protect, requireStaff);

router.get("/", getAdminComments);
router.patch("/:id/approve", approveComment);
router.patch("/:id/reject", rejectComment);
router.patch("/:id/spam", markAsSpam);
router.delete("/:id", deleteComment);
router.post("/:id/reply", replyComment);

export default router;
