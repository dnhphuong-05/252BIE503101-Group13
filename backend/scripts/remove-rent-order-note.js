import "dotenv/config";
import mongoose from "mongoose";
import RentOrder from "../src/models/order/RentOrder.js";

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const result = await RentOrder.updateMany(
    { note: { $exists: true } },
    { $unset: { note: "" } },
  );

  const matched = result.matchedCount ?? result.n ?? 0;
  const modified = result.modifiedCount ?? result.nModified ?? 0;

  console.log(`Matched: ${matched}`);
  console.log(`Removed note: ${modified}`);

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("Remove rent order note failed:", error);
  try {
    await mongoose.connection.close();
  } catch (closeError) {
    console.error("Failed to close Mongo connection:", closeError);
  }
  process.exit(1);
});
