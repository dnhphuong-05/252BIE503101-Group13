import "dotenv/config";
import mongoose from "mongoose";
import GuestCustomer from "../src/models/GuestCustomer.js";

const normalizeName = (name) =>
  String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const isAdminName = (name) => {
  const normalized = normalizeName(name);
  return normalized === "phục - admin" || normalized === "phuc - admin";
};

const getCreatedTime = (doc) => {
  const created =
    doc.created_at ||
    doc.createdAt ||
    doc.createdAt?.$date ||
    doc.created_at?.$date;

  if (created) {
    const time = new Date(created).getTime();
    if (!Number.isNaN(time)) return time;
  }

  if (doc._id && typeof doc._id.getTimestamp === "function") {
    return doc._id.getTimestamp().getTime();
  }

  return 0;
};

const extractGuestNumber = (guestId) => {
  if (!guestId) return null;
  const match = /^GST(\d{6})$/.exec(guestId);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
};

const formatGuestId = (num) => `GST${String(num).padStart(6, "0")}`;

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const guestCollection = db.collection("guest_customers");
  const blogCommentsCollection = db.collection("blog_comments");

  const guests = await guestCollection.find({}).toArray();
  const nameGroups = new Map();
  const adminIds = [];

  let maxGuestNumber = 0;
  const usedGuestIds = new Set();

  for (const guest of guests) {
    if (guest.guest_id) {
      usedGuestIds.add(guest.guest_id);
      const num = extractGuestNumber(guest.guest_id);
      if (Number.isFinite(num) && num > maxGuestNumber) {
        maxGuestNumber = num;
      }
    }

    if (isAdminName(guest.full_name)) {
      adminIds.push(guest._id);
      continue;
    }

    const key = normalizeName(guest.full_name);
    if (!key) continue;

    if (!nameGroups.has(key)) {
      nameGroups.set(key, []);
    }
    nameGroups.get(key).push(guest);
  }

  let nextGuestNumber = maxGuestNumber + 1;
  const allocateGuestId = () => {
    let candidate = formatGuestId(nextGuestNumber);
    while (usedGuestIds.has(candidate)) {
      nextGuestNumber += 1;
      candidate = formatGuestId(nextGuestNumber);
    }
    usedGuestIds.add(candidate);
    nextGuestNumber += 1;
    return candidate;
  };

  const nameToGuestId = new Map();
  const guestBulkOps = [];
  const deleteIds = new Set(adminIds.map((id) => id.toString()));

  for (const [nameKey, list] of nameGroups.entries()) {
    list.sort((a, b) => getCreatedTime(a) - getCreatedTime(b));
    const keep = list[0];

    let guestId = keep.guest_id;
    if (!guestId) {
      guestId = allocateGuestId();
      guestBulkOps.push({
        updateOne: {
          filter: { _id: keep._id },
          update: { $set: { guest_id: guestId } },
        },
      });
    }

    nameToGuestId.set(nameKey, guestId);

    for (let i = 1; i < list.length; i += 1) {
      deleteIds.add(list[i]._id.toString());
    }
  }

  if (deleteIds.size > 0) {
    guestBulkOps.push({
      deleteMany: {
        filter: { _id: { $in: Array.from(deleteIds).map((id) => new mongoose.Types.ObjectId(id)) } },
      },
    });
  }

  if (guestBulkOps.length > 0) {
    await guestCollection.bulkWrite(guestBulkOps);
  }

  const comments = await blogCommentsCollection.find({}).toArray();
  const commentBulkOps = [];
  let updatedComments = 0;

  for (const comment of comments) {
    const userId = comment.user_id;
    const hasUserId =
      typeof userId === "string" && userId.trim().startsWith("USR");

    if (hasUserId) {
      continue;
    }

    const nameKey = normalizeName(comment.user_name);
    const guestId = nameToGuestId.get(nameKey) || null;
    const setUpdate = {
      user_id: null,
      guest_id: guestId,
    };

    const currentUserId = comment.user_id ?? null;
    const currentGuestId = comment.guest_id ?? null;
    const needsUpdate = currentUserId !== null || currentGuestId !== guestId;

    if (needsUpdate) {
      commentBulkOps.push({
        updateOne: {
          filter: { _id: comment._id },
          update: { $set: setUpdate },
        },
      });
      updatedComments += 1;
    }
  }

  if (commentBulkOps.length > 0) {
    await blogCommentsCollection.bulkWrite(commentBulkOps);
  }

  console.log(`OK: Removed ${deleteIds.size} guest_customers`);
  console.log(`OK: Updated ${updatedComments} blog_comments`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("ERROR: Cleanup failed:", error);
  process.exit(1);
});
