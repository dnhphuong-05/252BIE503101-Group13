import { catchAsync, successResponse, ApiError } from "../utils/index.js";
import chatboxService from "../services/chatbox.service.js";

export const askChatbox = catchAsync(async (req, res) => {
  const { question, history } = req.body || {};

  if (typeof question !== "string" || !question.trim()) {
    throw ApiError.badRequest("Vui lòng nhập câu hỏi");
  }

  if (question.length > 2000) {
    throw ApiError.badRequest("Câu hỏi quá dài (tối đa 2000 ký tự)");
  }

  const result = await chatboxService.ask(question, history || []);

  const userId = req?.user?.user_id || null;
  if (userId) {
    try {
      await chatboxService.saveUserHistory({
        userId,
        history: history || [],
        answer: result?.answer || "",
      });
    } catch (error) {
      // Do not break chat reply when persistence fails
      console.error("Chatbox history save error:", error?.message || error);
    }
  }

  return successResponse(res, result, "Lấy phản hồi chatbot thành công");
});

export const getChatboxHistory = catchAsync(async (req, res) => {
  const userId = req?.user?.user_id || null;
  if (!userId) {
    throw ApiError.unauthorized("Vui lòng đăng nhập để xem lịch sử chat");
  }

  const messages = await chatboxService.getUserHistory(userId);
  return successResponse(
    res,
    { messages },
    "Lấy lịch sử hội thoại thành công",
  );
});
