import "dotenv/config";
import mongoose from "mongoose";
import GuestCustomer from "../src/models/GuestCustomer.js";
import User from "../src/models/user/User.js";
import UserProfile from "../src/models/user/UserProfile.js";

const buildCommentsId = (blogId, commentId) => `bc_${blogId}_${commentId}`;

const normalizeParentId = (parentId, blogId) => {
  if (parentId === null || parentId === undefined || parentId === "") {
    return null;
  }

  if (typeof parentId === "string") {
    if (/^\d+$/.test(parentId)) {
      return blogId ? buildCommentsId(blogId, parentId) : parentId;
    }
    return parentId;
  }

  if (typeof parentId === "number") {
    return blogId ? buildCommentsId(blogId, parentId) : String(parentId);
  }

  return null;
};

const getObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
};

const extractGuestNumber = (guestId) => {
  if (!guestId) return null;
  const match = /^GST(\d{6})$/.exec(guestId);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
};

const formatGuestId = (num) => `GST${String(num).padStart(6, "0")}`;

const ensureGuestCustomerIndexes = async (collection) => {
  try {
    await collection.dropIndex("phone_1");
  } catch (error) {
    if (error?.codeName !== "IndexNotFound") {
      throw error;
    }
  }

  try {
    await collection.createIndex(
      { phone: 1 },
      { unique: true, sparse: true, name: "phone_1" },
    );
  } catch (error) {
    if (error?.codeName !== "IndexKeySpecsConflict") {
      throw error;
    }
  }
};

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const blogCommentsCollection = db.collection("blog_comments");
  const guestCollection = db.collection("guest_customers");

  await ensureGuestCustomerIndexes(guestCollection);
  const commentIndexes = await blogCommentsCollection.indexes();
  const commentsIdIndex = commentIndexes.find(
    (idx) => idx.key && idx.key.comments_id === 1,
  );

  if (commentsIdIndex) {
    await blogCommentsCollection.dropIndex(commentsIdIndex.name);
  }

  const lastGuest = await guestCollection
    .find({ guest_id: { $regex: /^GST\d{6}$/ } })
    .sort({ guest_id: -1 })
    .limit(1)
    .toArray();
  const lastGuestNumber = extractGuestNumber(lastGuest[0]?.guest_id) || 0;
  let nextGuestNumber = lastGuestNumber + 1;

  const makeGuestId = () => {
    const guestId = formatGuestId(nextGuestNumber);
    nextGuestNumber += 1;
    return guestId;
  };

  const comments = await blogCommentsCollection.find({}).toArray();
  const bulkOps = [];
  let updatedCount = 0;
  let guestCreated = 0;

  const commentsByBlog = new Map();
  for (const comment of comments) {
    const blogId = comment.blog_id ?? null;
    if (blogId === null || blogId === undefined) continue;
    if (!commentsByBlog.has(blogId)) {
      commentsByBlog.set(blogId, []);
    }
    commentsByBlog.get(blogId).push(comment);
  }

  const oldToNew = new Map();
  const newInfoById = new Map();

  for (const [blogId, list] of commentsByBlog) {
    list.sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      if (aTime !== bTime) return aTime - bTime;
      return String(a._id).localeCompare(String(b._id));
    });

    let seq = 1;
    for (const comment of list) {
      const newKey = buildCommentsId(blogId, seq);
      newInfoById.set(comment._id.toString(), {
        comments_id: newKey,
        comment_seq: seq,
      });

      const oldKeys = new Set();
      if (comment.comments_id) oldKeys.add(comment.comments_id);
      if (comment.id != null) {
        oldKeys.add(buildCommentsId(blogId, comment.id));
        oldKeys.add(String(comment.id));
      }
      for (const key of oldKeys) {
        oldToNew.set(key, newKey);
      }

      seq += 1;
    }
  }

  const userCache = new Map();
  const profileCache = new Map();

  const flush = async () => {
    if (bulkOps.length === 0) return;
    await blogCommentsCollection.bulkWrite(bulkOps);
    bulkOps.length = 0;
  };

  for (const comment of comments) {
    const setUpdate = {};
    const unsetUpdate = {};

    const newInfo = newInfoById.get(comment._id.toString());
    if (newInfo) {
      if (comment.comments_id !== newInfo.comments_id) {
        setUpdate.comments_id = newInfo.comments_id;
      }
      if (comment.comment_seq !== newInfo.comment_seq) {
        setUpdate.comment_seq = newInfo.comment_seq;
      }
    }

    const normalizedParent = normalizeParentId(
      comment.parent_id,
      comment.blog_id,
    );
    if (normalizedParent) {
      const mappedParent = oldToNew.get(normalizedParent) || null;
      if (mappedParent !== comment.parent_id) {
        setUpdate.parent_id = mappedParent;
      }
    } else if (comment.parent_id !== null && comment.parent_id !== undefined) {
      setUpdate.parent_id = null;
    }

    let userIdString = null;
    if (comment.user_id) {
      if (typeof comment.user_id === "string" && comment.user_id.startsWith("USR")) {
        userIdString = comment.user_id;
      } else {
        const objectId = getObjectId(comment.user_id);
        if (objectId) {
          const cacheKey = objectId.toString();
          let cachedUser = userCache.get(cacheKey);
          if (!cachedUser) {
            const user = await User.findById(objectId).lean();
            cachedUser = user || null;
            userCache.set(cacheKey, cachedUser);
          }
          if (cachedUser?.user_id) {
            userIdString = cachedUser.user_id;
          }
        }
      }
    }

    if (userIdString) {
      if (comment.user_id !== userIdString) {
        setUpdate.user_id = userIdString;
      }

      if (comment.guest_id) {
        unsetUpdate.guest_id = "";
      }

      if (!profileCache.has(userIdString)) {
        const profile = await UserProfile.findOne({
          user_id: userIdString,
        })
          .select("full_name")
          .lean();
        profileCache.set(userIdString, profile?.full_name || null);
      }

      const profileName = profileCache.get(userIdString);
      if (profileName && comment.user_name !== profileName) {
        setUpdate.user_name = profileName;
      }
    } else {
      const fullName =
        typeof comment.user_name === "string" && comment.user_name.trim()
          ? comment.user_name.trim()
          : "Guest";

      if (comment.user_id) {
        unsetUpdate.user_id = "";
      }

      let guestId = comment.guest_id;
      let guestExists = false;

      if (guestId) {
        const existingGuest = await guestCollection.findOne({
          guest_id: guestId,
        });
        guestExists = !!existingGuest;
      }

      if (!guestId || !guestExists) {
        guestId = guestId || makeGuestId();
        await GuestCustomer.create({
          guest_id: guestId,
          full_name: fullName,
        });
        guestCreated += 1;
      }

      if (comment.guest_id !== guestId) {
        setUpdate.guest_id = guestId;
      }
    }

    if (Object.keys(setUpdate).length || Object.keys(unsetUpdate).length) {
      bulkOps.push({
        updateOne: {
          filter: { _id: comment._id },
          update: {
            ...(Object.keys(setUpdate).length ? { $set: setUpdate } : {}),
            ...(Object.keys(unsetUpdate).length ? { $unset: unsetUpdate } : {}),
          },
        },
      });
      updatedCount += 1;
    }

    if (bulkOps.length >= 500) {
      await flush();
    }
  }

  await flush();

  await blogCommentsCollection.createIndex(
    { comments_id: 1 },
    { unique: true, sparse: true },
  );

  console.log(`OK: Updated ${updatedCount} blog_comments`);
  console.log(`OK: Created ${guestCreated} guest_customers`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("ERROR: Migration failed:", error);
  process.exit(1);
});
