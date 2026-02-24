import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/user/User.js";
import UserProfile from "../src/models/user/UserProfile.js";

const ADMIN_NAME = process.env.ADMIN_NAME || "Phục - Admin";

async function resolveAdminId() {
  if (process.env.ADMIN_ID) {
    return process.env.ADMIN_ID;
  }

  const profile = await UserProfile.findOne({ full_name: ADMIN_NAME })
    .select("user_id")
    .lean();
  if (profile?.user_id) {
    return profile.user_id;
  }

  const superAdmin = await User.findOne({ role: "super_admin" })
    .select("user_id")
    .lean();
  if (superAdmin?.user_id) {
    return superAdmin.user_id;
  }

  const admin = await User.findOne({ role: "admin" }).select("user_id").lean();
  if (admin?.user_id) {
    return admin.user_id;
  }

  return null;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const adminId = await resolveAdminId();
  if (!adminId) {
    throw new Error(
      "Unable to resolve admin_id. Set ADMIN_ID env or create a profile for 'Phục - Admin'.",
    );
  }

  const result = await db.collection("blog_comments").updateMany(
    { user_name: ADMIN_NAME },
    {
      $set: {
        user_name: adminId,
        user_id: adminId,
        is_author_reply: true,
        updated_at: new Date(),
      },
      $unset: {
        guest_id: "",
      },
    },
  );

  console.log(`Updated ${result.modifiedCount} blog_comments`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
