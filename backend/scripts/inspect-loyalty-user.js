import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import UserLoyalty from "../src/models/user/UserLoyalty.js";
import LoyaltyTransaction from "../src/models/user/LoyaltyTransaction.js";

const args = process.argv.slice(2);
const userArg = args.find((arg) => arg.startsWith("--user="));
const userId = userArg ? userArg.split("=")[1] : null;

if (!userId) {
  console.error("Please provide --user=USRxxxxxx");
  process.exit(1);
}

const run = async () => {
  await connectDB();

  const loyalty = await UserLoyalty.findOne({ user_id: userId }).lean();
  const transactions = await LoyaltyTransaction.find({ user_id: userId })
    .sort({ created_at: -1 })
    .lean();

  console.log("User loyalty:", loyalty);
  console.log("Transactions:", transactions);

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("Inspect user loyalty failed:", error);
  try {
    await mongoose.connection.close();
  } catch (closeError) {
    console.error("Failed to close Mongo connection:", closeError);
  }
  process.exit(1);
});
