import "dotenv/config";
import mongoose from "mongoose";

const ADMIN_ID = process.env.ADMIN_ID || "USR000001";
const ADMIN_NAME = process.env.ADMIN_NAME || "Phục - Admin";

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const result = await db.collection("blog_comments").updateMany(
    { user_id: ADMIN_ID },
    {
      $set: {
        user_name: ADMIN_NAME,
        is_author_reply: true,
        updated_at: new Date(),
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
