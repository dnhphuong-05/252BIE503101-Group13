import UserLoyalty from "../../models/user/UserLoyalty.js";
import LoyaltyTransaction from "../../models/user/LoyaltyTransaction.js";
import BuyOrder from "../../models/order/BuyOrder.js";
import RentOrder from "../../models/order/RentOrder.js";

const POINT_RULES = [
  { min: 2000000, points: 15 },
  { min: 1000000, points: 10 },
  { min: 300000, points: 5 },
];

const TIER_RULES = [
  { min: 1000, level: 3, name: "Royal" },
  { min: 300, level: 2, name: "Heritage" },
  { min: 0, level: 1, name: "Classic" },
];

const MAX_TIER_POINTS = 3000;

const calculateEarnedPoints = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const rule = POINT_RULES.find((item) => value >= item.min);
  return rule ? rule.points : 0;
};

const resolveTier = (totalPoints) => {
  const normalized = Math.max(0, Math.min(Number(totalPoints) || 0, MAX_TIER_POINTS));
  const rule = TIER_RULES.find((item) => normalized >= item.min) || TIER_RULES[TIER_RULES.length - 1];
  return { level: rule.level, name: rule.name };
};

const awardOrderPoints = async ({ userId, amount, refId, reason }) => {
  if (!userId || !refId) return null;

  const points = calculateEarnedPoints(amount);
  if (points <= 0) return null;

  const existing = await LoyaltyTransaction.findOne({
    user_id: userId,
    ref_type: "order",
    ref_id: refId,
    type: "earn",
  }).lean();
  if (existing) return null;

  const updated = await UserLoyalty.findOneAndUpdate(
    { user_id: userId },
    {
      $inc: { total_points: points },
      $setOnInsert: {
        user_id: userId,
        tier_level: 1,
        tier_name: "Classic",
      },
    },
    { new: true, upsert: true },
  ).lean();

  const totalPoints = updated?.total_points ?? points;
  const tier = resolveTier(totalPoints);

  await UserLoyalty.updateOne(
    { user_id: userId },
    { $set: { tier_level: tier.level, tier_name: tier.name } },
  );

  await LoyaltyTransaction.create({
    user_id: userId,
    type: "earn",
    points,
    reason: reason || "Tích điểm đơn hàng",
    ref_type: "order",
    ref_id: refId,
  });

  return { points, total_points: totalPoints, tier };
};

const syncOrderPointsForUser = async (userId) => {
  if (!userId) return { synced: 0 };

  const [buyOrders, rentOrders] = await Promise.all([
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

  const candidates = [];
  for (const order of buyOrders || []) {
    const isPaid = ["paid", "partial"].includes(order.payment_status);
    const isCod = order.payment_method === "cod";
    if (!isPaid && (isCod || order.order_status === "completed")) {
      await BuyOrder.updateOne(
        { order_id: order.order_id },
        {
          $set: {
            payment_status: "paid",
            paid_at: order.paid_at || new Date(),
            updated_at: new Date(),
          },
        },
      );
    }
    candidates.push({
      refId: order.order_id,
      amount: order.total_amount,
      reason: `Hoàn tất đơn mua ${order.order_code}`,
    });
  }
  for (const order of rentOrders || []) {
    const totalValue = order?.pricing?.total_due_today ?? order?.pricing?.rent_fee_expected ?? 0;
    candidates.push({
      refId: order.rent_order_id,
      amount: totalValue,
      reason: `Hoàn tất đơn thuê ${order.rent_order_code}`,
    });
  }

  if (!candidates.length) return { synced: 0 };

  const refIds = candidates.map((item) => item.refId);
  const existing = await LoyaltyTransaction.find({
    user_id: userId,
    ref_type: "order",
    type: "earn",
    ref_id: { $in: refIds },
  })
    .select("ref_id")
    .lean();
  const existingSet = new Set((existing || []).map((item) => item.ref_id));

  let synced = 0;
  for (const item of candidates) {
    if (existingSet.has(item.refId)) continue;
    if (calculateEarnedPoints(item.amount) <= 0) continue;
    await awardOrderPoints({
      userId,
      amount: item.amount,
      refId: item.refId,
      reason: item.reason,
    });
    synced += 1;
  }

  return { synced };
};

export default {
  calculateEarnedPoints,
  resolveTier,
  awardOrderPoints,
  syncOrderPointsForUser,
};
