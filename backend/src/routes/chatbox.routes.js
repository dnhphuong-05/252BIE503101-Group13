import express from "express";
import { protect, optionalAuthenticate } from "../middlewares/auth.middleware.js";
import { askChatbox, getChatboxHistory } from "../controllers/chatbox.controller.js";

const router = express.Router();

router.get("/history", protect, getChatboxHistory);
router.post("/ask", optionalAuthenticate, askChatbox);

export default router;
