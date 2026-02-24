import "dotenv/config";
import mongoose from "mongoose";

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections({ name: "user_preferences" }).toArray();
  if (collections.length > 0) {
    await db.collection("user_preferences").drop();
    console.log("Dropped collection: user_preferences");
  } else {
    console.log("Collection user_preferences not found. Nothing to drop.");
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Drop failed:", error);
  process.exit(1);
});
