import Product from "../models/Product.js";
import UserChatboxConversation from "../models/user/UserChatboxConversation.js";
import { ApiError } from "../utils/index.js";

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const CHATBOX_TIMEZONE = process.env.CHATBOX_TIMEZONE || "Asia/Ho_Chi_Minh";
const MAX_PERSISTED_MESSAGES = 80;

const pickText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part?.text)
    .filter(Boolean)
    .join("\n")
    .trim();
};

const pickFinishReason = (data) => data?.candidates?.[0]?.finishReason || "";

const looksIncompleteAnswer = (text, finishReason = "") => {
  const normalizedText = String(text || "").trim();
  if (!normalizedText) return true;

  const normalizedFinishReason = String(finishReason || "").toUpperCase();
  if (normalizedFinishReason && normalizedFinishReason !== "STOP") {
    return true;
  }

  const starCount = (normalizedText.match(/\*\*/g) || []).length;
  const openParentheses = (normalizedText.match(/\(/g) || []).length;
  const closeParentheses = (normalizedText.match(/\)/g) || []).length;
  if (starCount % 2 !== 0 || openParentheses > closeParentheses) {
    return true;
  }

  const lastLine = normalizedText.split("\n").pop()?.trim() || "";
  if (/^[-*]\s*$/.test(lastLine)) {
    return true;
  }

  if (/^[-*]\s+\*\*[^*]+$/.test(lastLine)) {
    return true;
  }

  return /[:;,\-(/]$/.test(normalizedText);
};

const normalizeModelName = (model = "") =>
  String(model)
    .trim()
    .replace(/^models\//i, "");

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeHistory = (history = []) => {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && typeof item?.content === "string")
    .slice(-8)
    .map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: String(item.content).slice(0, 1000) }],
    }));
};

const normalizeConversationHistory = (history = []) => {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && typeof item?.content === "string")
    .map((item) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: String(item.content).trim(),
      created_at: item?.createdAt ? new Date(item.createdAt) : new Date(),
    }))
    .filter(
      (item) =>
        item.content.length > 0 &&
        (item.role === "assistant" || item.role === "user"),
    )
    .map((item) => ({
      ...item,
      created_at: Number.isNaN(item.created_at.getTime())
        ? new Date()
        : item.created_at,
    }))
    .slice(-MAX_PERSISTED_MESSAGES);
};

const formatProductLine = (product) => {
  const price = Number(product?.price_buy || 0).toLocaleString("vi-VN");
  const rating = Number(product?.rating_average || 0).toFixed(1);
  const ratingCount = Number(product?.rating_count || 0);

  return `- ${product.name} | Giá: ${price} VND | Đánh giá: ${rating}/5 (${ratingCount} lượt) | Danh mục: ${product.category_name}`;
};

const getTimeContext = (date = new Date()) => {
  const dateText = new Intl.DateTimeFormat("vi-VN", {
    timeZone: CHATBOX_TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

  const timeText = new Intl.DateTimeFormat("vi-VN", {
    timeZone: CHATBOX_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return {
    dateText,
    timeText,
  };
};

const buildDeterministicTimeAnswer = (question) => {
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) return null;

  const dateKeywords = [
    "hom nay",
    "ngay may",
    "ngay bao nhieu",
    "thu may",
    "thu bao nhieu",
    "ngay hien tai",
    "hom qua",
    "ngay mai",
  ];
  const timeKeywords = ["may gio", "gio hien tai", "bay gio", "hien tai"];

  const asksDate = dateKeywords.some((keyword) =>
    normalizedQuestion.includes(keyword),
  );
  const asksTime = timeKeywords.some((keyword) =>
    normalizedQuestion.includes(keyword),
  );

  if (!asksDate && !asksTime) {
    return null;
  }

  let dayOffset = 0;
  if (normalizedQuestion.includes("hom qua")) dayOffset = -1;
  if (normalizedQuestion.includes("ngay mai")) dayOffset = 1;

  const targetDate = new Date();
  if (dayOffset !== 0) {
    targetDate.setDate(targetDate.getDate() + dayOffset);
  }

  const { dateText } = getTimeContext(targetDate);
  const { timeText } = getTimeContext(new Date());

  if (dayOffset === -1) {
    return `Hôm qua là ${dateText}.`;
  }

  if (dayOffset === 1) {
    return `Ngày mai là ${dateText}.`;
  }

  if (asksDate && asksTime) {
    return `Hôm nay là ${dateText}. Bây giờ là ${timeText} (${CHATBOX_TIMEZONE}).`;
  }

  if (asksDate) {
    return `Hôm nay là ${dateText}.`;
  }

  return `Bây giờ là ${timeText} (${CHATBOX_TIMEZONE}).`;
};

class ChatboxService {
  async buildProductContext(question) {
    const [mostExpensiveProduct, topRatedProduct, bestSellingProducts] =
      await Promise.all([
        Product.findOne({ status: "active" })
          .sort({ price_buy: -1 })
          .select("name price_buy rating_average rating_count category_name")
          .lean(),
        Product.findOne({ status: "active", rating_count: { $gt: 0 } })
          .sort({ rating_average: -1, rating_count: -1 })
          .select("name price_buy rating_average rating_count category_name")
          .lean(),
        Product.find({ status: "active" })
          .sort({ sold_count: -1 })
          .limit(3)
          .select("name price_buy rating_average rating_count category_name")
          .lean(),
      ]);

    const tokens = String(question || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
      .slice(0, 6);

    let matchedProducts = [];
    if (tokens.length > 0) {
      const regex = new RegExp(tokens.join("|"), "i");
      matchedProducts = await Product.find({
        status: "active",
        $or: [
          { name: regex },
          { category_name: regex },
          { tags: regex },
          { description: regex },
        ],
      })
        .select("name price_buy rating_average rating_count category_name")
        .limit(5)
        .lean();
    }

    return {
      mostExpensiveProduct,
      topRatedProduct,
      bestSellingProducts,
      matchedProducts,
    };
  }

  createPrompt(question, productContext) {
    const {
      mostExpensiveProduct,
      topRatedProduct,
      bestSellingProducts,
      matchedProducts,
    } = productContext;

    const expensiveLine = mostExpensiveProduct
      ? formatProductLine(mostExpensiveProduct)
      : "- Chưa có dữ liệu";
    const topRatedLine = topRatedProduct
      ? formatProductLine(topRatedProduct)
      : "- Chưa có dữ liệu";

    const bestSellingBlock = bestSellingProducts?.length
      ? bestSellingProducts.map(formatProductLine).join("\n")
      : "- Chưa có dữ liệu";

    const matchedBlock = matchedProducts?.length
      ? matchedProducts.map(formatProductLine).join("\n")
      : "- Không tìm thấy sản phẩm liên quan trực tiếp trong câu hỏi";

    const { dateText, timeText } = getTimeContext(new Date());

    return [
      "Bạn là trợ lý AI cho cửa hàng Phục (thời trang truyền thống Việt Nam).",
      "Nguyên tắc trả lời:",
      "1) Trả lời bằng tiếng Việt, thân thiện, ngắn gọn.",
      "2) Khi nhắc đến tên cửa hàng, LUÔN dùng đúng cụm \"cửa hàng Phục\". Không dùng tên khác.",
      "3) Nếu câu hỏi về sản phẩm trong shop, PHẢI ưu tiên dữ liệu bên dưới.",
      "4) Tuyệt đối KHÔNG bịa tên sản phẩm, giá, đánh giá, danh mục.",
      "5) Chỉ được dùng sản phẩm có trong dữ liệu bên dưới. Nếu thiếu dữ liệu thì nói rõ là chưa có.",
      "6) Khi người dùng hỏi sản phẩm mắc nhất, đánh giá cao nhất, bán chạy nhất thì trả lời đúng theo dữ liệu.",
      "7) Nếu người dùng hỏi ngày/giờ hiện tại thì dùng đúng [Thời gian hệ thống] bên dưới, không tự suy đoán.",
      "8) Trả lời đầy đủ, không cụt câu. Không dừng giữa dòng liệt kê.",
      "9) Trả lời plain text, không dùng markdown (**,#,-).",
      "",
      "[Thời gian hệ thống]",
      `- Hôm nay: ${dateText}`,
      `- Bây giờ: ${timeText} (${CHATBOX_TIMEZONE})`,
      "",
      "Dữ liệu sản phẩm của shop:",
      "[Sản phẩm mắc nhất]",
      expensiveLine,
      "",
      "[Sản phẩm đánh giá cao nhất]",
      topRatedLine,
      "",
      "[Top 3 sản phẩm bán chạy]",
      bestSellingBlock,
      "",
      "[Sản phẩm liên quan câu hỏi]",
      matchedBlock,
      "",
      `Câu hỏi người dùng: ${question}`,
      "",
      "Hãy trả lời trực tiếp cho người dùng.",
    ].join("\n");
  }

  async callGemini({ prompt, history }) {
    const apiKey = process.env.CHATBOX_API_KEY;
    if (!apiKey) {
      throw ApiError.internal("Thiếu cấu hình CHATBOX_API_KEY");
    }

    const preferredModel = normalizeModelName(
      process.env.CHATBOX_MODEL || "gemini-flash-latest",
    );
    const fallbackModels = [
      preferredModel,
      "gemini-flash-latest",
      "gemini-3-flash-preview",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
    ];
    const uniqueModels = Array.from(
      new Set(fallbackModels.map(normalizeModelName).filter(Boolean)),
    );

    let lastError = "";

    for (const model of uniqueModels) {
      try {
        const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

        let attemptPrompt = prompt;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                ...history,
                { role: "user", parts: [{ text: attemptPrompt }] },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: attempt === 0 ? 900 : 1200,
              },
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            lastError =
              data?.error?.message || `Gemini API error (${response.status})`;
            break;
          }

          const text = pickText(data);
          if (!text) {
            lastError = "Gemini không trả về nội dung phản hồi";
            continue;
          }

          const finishReason = pickFinishReason(data);
          if (!looksIncompleteAnswer(text, finishReason)) {
            return text;
          }

          attemptPrompt = [
            prompt,
            "",
            "Bổ sung bắt buộc: Trả lời lại một phiên bản hoàn chỉnh, không cụt câu, không dừng giữa ngoặc hoặc giữa danh sách.",
            "Mỗi ý cần đủ chủ ngữ và thông tin cụ thể.",
          ].join("\n");

          lastError = "Gemini trả lời bị cụt";
        }
      } catch (error) {
        lastError = error?.message || "Không thể kết nối Gemini API";
      }
    }

    throw ApiError.internal(lastError || "Không thể lấy phản hồi từ Gemini");
  }

  async ask(question, history = []) {
    const cleanQuestion = String(question || "").trim();
    if (!cleanQuestion) {
      throw ApiError.badRequest("Câu hỏi không được để trống");
    }

    const deterministicAnswer = buildDeterministicTimeAnswer(cleanQuestion);
    if (deterministicAnswer) {
      return {
        answer: deterministicAnswer,
        meta: {
          usedProductContext: false,
          answeredBy: "deterministic-time",
        },
      };
    }

    const productContext = await this.buildProductContext(cleanQuestion);
    const prompt = this.createPrompt(cleanQuestion, productContext);
    const normalizedHistory = normalizeHistory(history);
    const answer = await this.callGemini({
      prompt,
      history: normalizedHistory,
    });

    return {
      answer,
      meta: {
        usedProductContext: true,
        answeredBy: "gemini",
      },
    };
  }

  async saveUserHistory({ userId, history = [], answer }) {
    if (!userId) return;

    const normalizedHistory = normalizeConversationHistory(history);
    const normalizedAnswer = String(answer || "").trim();

    const mergedMessages = [...normalizedHistory];
    if (normalizedAnswer) {
      mergedMessages.push({
        role: "assistant",
        content: normalizedAnswer,
        created_at: new Date(),
      });
    }

    const messagesToSave = mergedMessages.slice(-MAX_PERSISTED_MESSAGES);

    await UserChatboxConversation.findOneAndUpdate(
      { user_id: userId },
      {
        $set: {
          messages: messagesToSave,
          last_active_at: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  async getUserHistory(userId) {
    if (!userId) return [];

    const conversation = await UserChatboxConversation.findOne({
      user_id: userId,
    })
      .select("messages")
      .lean();

    if (!conversation?.messages?.length) {
      return [];
    }

    return conversation.messages.slice(-MAX_PERSISTED_MESSAGES).map((message) => {
      const createdAt = message?.created_at ? new Date(message.created_at) : new Date();
      return {
        role: message?.role === "assistant" ? "assistant" : "user",
        content: String(message?.content || "").trim(),
        createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
      };
    });
  }
}

export default new ChatboxService();

