import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import BuyOrder from "../src/models/order/BuyOrder.js";
import RentOrder from "../src/models/order/RentOrder.js";
import loyaltyService from "../src/services/user/loyalty.service.js";

const run = async () => {
  await connectDB();

  const buyTotal = await BuyOrder.countDocuments({});
  const buyByStatus = await BuyOrder.aggregate([
    { $group: { _id: "$order_status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const buyByPayment = await BuyOrder.aggregate([
    { $group: { _id: "$payment_status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const buyByMethod = await BuyOrder.aggregate([
    { $group: { _id: "$payment_method", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const rentTotal = await RentOrder.countDocuments({});
  const rentByStatus = await RentOrder.aggregate([
    { $group: { _id: "$rent_status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const rentByPayment = await RentOrder.aggregate([
    { $group: { _id: "$payment.payment_status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  console.log("Buy orders total:", buyTotal);
  console.log("Buy orders by order_status:", buyByStatus);
  console.log("Buy orders by payment_status:", buyByPayment);
  console.log("Buy orders by payment_method:", buyByMethod);

  const completedBuyOrders = await BuyOrder.find({ order_status: "completed" })
    .select("order_id order_code user_id total_amount payment_status payment_method created_at")
    .lean();
  const completedBuyWithPoints = (completedBuyOrders || []).map((order) => ({
    ...order,
    user_id_len: typeof order.user_id === "string" ? order.user_id.length : null,
    earned_points: loyaltyService.calculateEarnedPoints(order.total_amount),
  }));
  console.log("Completed buy orders:", completedBuyWithPoints);

  console.log("Rent orders total:", rentTotal);
  console.log("Rent orders by rent_status:", rentByStatus);
  console.log("Rent orders by payment.payment_status:", rentByPayment);

  const closedRentOrders = await RentOrder.find({ rent_status: "closed" })
    .select("rent_order_id rent_order_code user_id pricing payment payment_status created_at")
    .lean();
  const closedRentWithPoints = (closedRentOrders || []).map((order) => ({
    ...order,
    earned_points: loyaltyService.calculateEarnedPoints(
      order?.pricing?.total_due_today ?? order?.pricing?.rent_fee_expected ?? 0,
    ),
  }));
  console.log("Closed rent orders:", closedRentWithPoints);

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("Inspect failed:", error);
  try {
    await mongoose.connection.close();
  } catch (closeError) {
    console.error("Failed to close Mongo connection:", closeError);
  }
  process.exit(1);
});
