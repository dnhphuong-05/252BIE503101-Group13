import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import UserLoyalty from "../src/models/user/UserLoyalty.js";
import LoyaltyTransaction from "../src/models/user/LoyaltyTransaction.js";
import BuyOrder from "../src/models/order/BuyOrder.js";
import RentOrder from "../src/models/order/RentOrder.js";
import loyaltyService from "../src/services/user/loyalty.service.js";

const args = process.argv.slice(2);
const userArg = args.find((arg) => arg.startsWith("--user="));
const userId = userArg ? userArg.split("=")[1] : null;

const run = async () => {
  await connectDB();

  if (userId) {
    await LoyaltyTransaction.deleteMany({ user_id: userId });
    await UserLoyalty.updateOne(
      { user_id: userId },
      { $set: { total_points: 0, tier_level: 1, tier_name: "Classic" } },
      { upsert: true },
    );
  } else {
    await LoyaltyTransaction.deleteMany({});
    await UserLoyalty.updateMany(
      {},
      { $set: { total_points: 0, tier_level: 1, tier_name: "Classic" } },
    );
  }

  let userIds = [];
  if (userId) {
    userIds = [userId];
  } else {
    const [buyUserIds, rentUserIds] = await Promise.all([
      BuyOrder.distinct("user_id", { user_id: { $ne: null } }),
      RentOrder.distinct("user_id", { user_id: { $ne: null } }),
    ]);
    userIds = Array.from(new Set([...(buyUserIds || []), ...(rentUserIds || [])])).filter(
      Boolean,
    );
  }

  if (!userIds.length) {
    console.log("No users found in buy_orders or rent_orders.");
    await mongoose.connection.close();
    return;
  }

  let totalSynced = 0;
  for (const id of userIds) {
    const result = await loyaltyService.syncOrderPointsForUser(id);
    totalSynced += result?.synced || 0;
    console.log(`Synced ${result?.synced || 0} orders for ${id}`);
  }

  console.log(`Done. Total new loyalty transactions: ${totalSynced}`);
  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("Rebuild failed:", error);
  try {
    await mongoose.connection.close();
  } catch (closeError) {
    console.error("Failed to close Mongo connection:", closeError);
  }
  process.exit(1);
});
