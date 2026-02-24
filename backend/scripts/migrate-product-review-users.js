import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/user/User.js";
import UserProfile from "../src/models/user/UserProfile.js";

const REVIEW_COLLECTIONS = [
  "products_reviews",
  "products_reivews", // common typo
  "product_reviews",
];

const pickReviewCollection = async (db) => {
  const existing = await db
    .listCollections({ name: { $in: REVIEW_COLLECTIONS } })
    .toArray();

  if (!existing.length) {
    throw new Error(
      `No review collection found. Checked: ${REVIEW_COLLECTIONS.join(", ")}`,
    );
  }

  const names = existing.map((col) => col.name);
  for (const name of REVIEW_COLLECTIONS) {
    if (names.includes(name)) {
      return db.collection(name);
    }
  }

  return db.collection(existing[0].name);
};

const normalizeName = (value) => {
  if (!value) return "";
  return value.toString().replace(/\s+/g, " ").trim().slice(0, 100);
};

const collectExistingCredentials = async (db) => {
  const users = await db
    .collection("users")
    .find({}, { projection: { email: 1, phone: 1 } })
    .toArray();

  const emails = new Set();
  const phones = new Set();

  users.forEach((user) => {
    if (user.email) emails.add(user.email.toLowerCase());
    if (user.phone) phones.add(user.phone);
  });

  return { emails, phones };
};

const makeEmail = (base, index) =>
  `review_${base}_${index}@vietphuc.local`;

const makePhone = (index) => {
  const number = String(10000000 + index).slice(0, 8);
  return `09${number}`;
};

const makePassword = (index) => `VietPhuc@${String(100000 + index).slice(0, 6)}`;

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const reviewsCol = await pickReviewCollection(db);
  const { emails, phones } = await collectExistingCredentials(db);

  const rawNames = await reviewsCol.distinct("user_name", {
    user_name: { $type: "string", $ne: "", $not: /^USR\d{6}$/ },
  });

  const userNameList = rawNames.map(normalizeName).filter(Boolean);
  const userMap = new Map();

  let createdUsers = 0;
  let updatedReviews = 0;
  const base = Date.now().toString(36);
  let index = 0;

  for (const userName of userNameList) {
    if (userMap.has(userName)) continue;

    let email = makeEmail(base, index);
    while (emails.has(email.toLowerCase())) {
      index += 1;
      email = makeEmail(base, index);
    }

    let phone = makePhone(index);
    while (phones.has(phone)) {
      index += 1;
      phone = makePhone(index);
    }

    const password = makePassword(index);

    const user = await User.create({
      email,
      phone,
      password_hash: password,
    });

    await UserProfile.create({
      user_id: user.user_id,
      full_name: userName,
    });

    emails.add(email.toLowerCase());
    phones.add(phone);
    userMap.set(userName, {
      user_id: user.user_id,
      email,
      phone,
      password,
    });

    createdUsers += 1;
    index += 1;
  }

  for (const [userName, payload] of userMap.entries()) {
    const result = await reviewsCol.updateMany(
      { user_name: userName },
      { $set: { user_id: payload.user_id, user_name: payload.user_id } },
    );
    updatedReviews += result.modifiedCount || 0;
  }

  console.log(`Created ${createdUsers} users`);
  console.log(`Updated ${updatedReviews} reviews`);
  console.log("Sample credentials (first 5):");

  Array.from(userMap.values())
    .slice(0, 5)
    .forEach((payload, idx) => {
      console.log(
        `${idx + 1}. user_id=${payload.user_id}, email=${payload.email}, phone=${payload.phone}, password=${payload.password}`,
      );
    });

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
