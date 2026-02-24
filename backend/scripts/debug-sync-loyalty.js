import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import BuyOrder from "../src/models/order/BuyOrder.js";
import RentOrder from "../src/models/order/RentOrder.js";
import LoyaltyTransaction from "../src/models/user/LoyaltyTransaction.js";
import loyaltyService from "../src/services/user/loyalty.service.js";

const args = process.argv.slice(2);
const userArg = args.find((arg) => arg.startsWith("--user="));
const userId = userArg ? userArg.split("=")[1] : null;

if (!userId) {
  console.error("Please provide --user=USRxxxxxx");
  process.exit(1);
}

const run = async () => {
  await connectDB();

  const [completedOrders, buyOrders, rentOrders] = await Promise.all([
    BuyOrder.find({ order_status: "completed" })
      .select(
        "order_id order_code user_id total_amount payment_method payment_status refund_status",
      )
      .lean(),
    BuyOrder.find({
      user_id: userId,
      order_status: "completed",
      refund_status: { $ne: "refunded" },
    })
      .select(
        "order_id order_code total_amount payment_method payment_status paid_at refund_status order_status",
      )
      .lean(),
    RentOrder.find({
      user_id: userId,
      rent_status: "closed",
      "payment.payment_status": "paid",
    })
      .select("rent_order_id rent_order_code pricing")
      .lean(),
  ]);

  console.log("Completed orders raw:", completedOrders);
  console.log(
    "Completed orders match user:",
    completedOrders.map((order) => ({
      order_id: order.order_id,
      user_id: order.user_id,
      matches: order.user_id === userId,
    })),
  );

  const candidates = [];
  for (const order of buyOrders || []) {
    const points = loyaltyService.calculateEarnedPoints(order.total_amount);
    candidates.push({
      refId: order.order_id,
      amount: order.total_amount,
      points,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      order_status: order.order_status,
    });
  }
  for (const order of rentOrders || []) {
    const totalValue = order?.pricing?.total_due_today ?? order?.pricing?.rent_fee_expected ?? 0;
    const points = loyaltyService.calculateEarnedPoints(totalValue);
    candidates.push({
      refId: order.rent_order_id,
      amount: totalValue,
      points,
    });
  }

  const refIds = candidates.map((item) => item.refId);
  const existing = await LoyaltyTransaction.find({
    user_id: userId,
    ref_type: "order",
    type: "earn",
    ref_id: { $in: refIds },
  })
    .select("ref_id")
    .lean();

  console.log("Candidates:", candidates);
  console.log("Existing transactions:", existing);

  const result = await loyaltyService.syncOrderPointsForUser(userId);
  console.log("syncOrderPointsForUser result:", result);

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("Debug sync failed:", error);
  try {
    await mongoose.connection.close();
  } catch (closeError) {
    console.error("Failed to close Mongo connection:", closeError);
  }
  process.exit(1);
});
