import "dotenv/config";
import mongoose from "mongoose";
import Notification from "../src/models/Notification.js";

const ORDER_CODE_REGEX = /[A-Z]{2,}-[A-Z]{2,}-\d{6,}/;

const extractOrderCode = (text) => {
  if (!text) return null;
  const match = text.match(ORDER_CODE_REGEX);
  return match ? match[0] : null;
};

const looksEnglish = (text) =>
  typeof text === "string" &&
  /[A-Za-z]/.test(text) &&
  /(Order|Rental|Your|admin)/i.test(text);

const RULES = [
  {
    name: "rent_created",
    match: ({ title, message }) =>
      /Rental order created/i.test(title) ||
      /Your rental order .* has been created\./i.test(message),
    title: "Tạo đơn thuê thành công",
    message: (code) =>
      code ? `Đơn thuê ${code} đã được tạo thành công.` : "Đơn thuê đã được tạo thành công.",
  },
  {
    name: "order_placed",
    match: ({ title, message }) =>
      /Order placed successfully/i.test(title) ||
      /has been created successfully\./i.test(message),
    title: "Đặt hàng thành công",
    message: (code) =>
      code ? `Đơn mua ${code} đã được tạo thành công.` : "Đơn mua đã được tạo thành công.",
  },
  {
    name: "order_confirmed",
    match: ({ title, message }) =>
      /Order confirmed/i.test(title) ||
      /has been confirmed by admin\./i.test(message),
    title: "Đơn mua đã xác nhận",
    message: (code) =>
      code
        ? `Đơn mua ${code} đã được admin xác nhận.`
        : "Đơn mua đã được admin xác nhận.",
  },
  {
    name: "order_shipped",
    match: ({ title, message }) =>
      /Order shipped/i.test(title) || /is on the way\./i.test(message),
    title: "Đơn mua đang giao",
    message: (code) =>
      code ? `Đơn mua ${code} đang được giao.` : "Đơn mua đang được giao.",
  },
  {
    name: "order_delivered",
    match: ({ title, message }) =>
      /Order delivered|Order completed/i.test(title) ||
      /has been delivered\./i.test(message) ||
      /has been completed\./i.test(message),
    title: "Đơn mua hoàn thành",
    message: (code) =>
      code
        ? `Đơn mua ${code} đã được giao thành công.`
        : "Đơn mua đã được giao thành công.",
  },
  {
    name: "order_cancelled",
    match: ({ title, message }) =>
      /Order cancelled|Order canceled/i.test(title) ||
      /has been cancelled\./i.test(message) ||
      /has been canceled\./i.test(message),
    title: "Đơn mua đã hủy",
    message: (code) => (code ? `Đơn mua ${code} đã bị hủy.` : "Đơn mua đã bị hủy."),
  },
  {
    name: "rent_cancelled",
    match: ({ title, message }) =>
      /Rental order cancelled|Rental order canceled/i.test(title) ||
      /Your rental order .* has been cancelled\./i.test(message) ||
      /Your rental order .* has been canceled\./i.test(message),
    title: "Đơn thuê đã hủy",
    message: (code) => (code ? `Đơn thuê ${code} đã bị hủy.` : "Đơn thuê đã bị hủy."),
  },
];

const translateNotification = (doc) => {
  const title = doc?.title || "";
  const message = doc?.message || "";
  const code = extractOrderCode(message) || extractOrderCode(title);

  for (const rule of RULES) {
    if (rule.match({ title, message })) {
      const nextTitle = rule.title;
      const nextMessage = rule.message(code);
      if (nextTitle === title && nextMessage === message) {
        return null;
      }
      return { title: nextTitle, message: nextMessage, rule: rule.name };
    }
  }

  return null;
};

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const cursor = Notification.find({
    $or: [
      { title: { $regex: /(Order|Rental order)/i } },
      { message: { $regex: /(Your order|Your rental order)/i } },
    ],
  }).cursor();

  const bulkOps = [];
  let scanned = 0;
  let updated = 0;
  let matched = 0;
  const unmatchedSamples = [];

  const flush = async () => {
    if (!bulkOps.length) return;
    const result = await Notification.bulkWrite(bulkOps);
    updated += result.modifiedCount || 0;
    bulkOps.length = 0;
  };

  for await (const doc of cursor) {
    scanned += 1;
    const next = translateNotification(doc);
    if (next) {
      matched += 1;
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              title: next.title,
              message: next.message,
            },
          },
        },
      });
    } else if (unmatchedSamples.length < 5) {
      const isEnglish = looksEnglish(doc?.title) || looksEnglish(doc?.message);
      if (isEnglish) {
        unmatchedSamples.push({
          title: doc?.title,
          message: doc?.message,
        });
      }
    }

    if (bulkOps.length >= 500) {
      await flush();
    }
  }

  await flush();

  console.log(`Scanned: ${scanned}`);
  console.log(`Matched rules: ${matched}`);
  console.log(`Updated: ${updated}`);

  if (unmatchedSamples.length) {
    console.log("Unmatched English notifications (sample):");
    for (const sample of unmatchedSamples) {
      console.log(`- ${sample.title} | ${sample.message}`);
    }
  }

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("Migration failed:", error);
  try {
    await mongoose.connection.close();
  } catch (closeError) {
    console.error("Failed to close Mongo connection:", closeError);
  }
  process.exit(1);
});
