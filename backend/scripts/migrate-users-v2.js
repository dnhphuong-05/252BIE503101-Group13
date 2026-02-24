import "dotenv/config";
import mongoose from "mongoose";
import UserProfile from "../src/models/user/UserProfile.js";
import UserAddress from "../src/models/user/UserAddress.js";
import UserMeasurement from "../src/models/user/UserMeasurement.js";
import UserLoyalty from "../src/models/user/UserLoyalty.js";

const normalizeAddress = (addr = {}) => ({
  receiver_name: addr.recipientName || addr.receiver_name || "",
  phone: addr.phone || addr.phoneNumber || "",
  province: addr.city || addr.province || "",
  district: addr.district || "",
  ward: addr.ward || "",
  address_detail: addr.address || addr.streetAddress || addr.address_detail || "",
  note: addr.label || addr.note || null,
  is_default: addr.isDefault ?? addr.is_default ?? false,
});

const normalizeMeasurements = (measurements = {}) => ({
  neck: null,
  shoulder: measurements.shoulder ?? null,
  chest: measurements.bust ?? measurements.chest ?? null,
  waist: measurements.waist ?? null,
  hip: measurements.hips ?? measurements.hip ?? null,
  sleeve: measurements.armLength ?? measurements.sleeve ?? null,
  arm: null,
  back_length: null,
  leg_length: null,
  unit: "cm",
  measured_at: new Date(),
});

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const users = await db.collection("users").find({}).toArray();
  let migratedCount = 0;

  for (const user of users) {
    const userId = user.user_id;
    if (!userId) {
      continue;
    }

    const updates = {};
    const unset = {};

    if (!user.password_hash && user.password) {
      updates.password_hash = user.password;
      unset.password = "";
    }

    if (user.full_name || user.avatar) {
      const existingProfile = await UserProfile.findOne({
        user_id: userId,
      }).lean();
      if (!existingProfile && user.full_name) {
        await UserProfile.create({
          user_id: userId,
          full_name: user.full_name,
          avatar: user.avatar || "",
        });
      }
    }

    if (user.loyalty_points !== undefined) {
      const existingLoyalty = await UserLoyalty.findOne({
        user_id: userId,
      }).lean();
      if (!existingLoyalty) {
        await UserLoyalty.create({
          user_id: userId,
          total_points: user.loyalty_points || 0,
        });
      }
    }

    if (Array.isArray(user.addresses) && user.addresses.length > 0) {
      const existingAddresses = await UserAddress.find({
        user_id: userId,
      }).lean();
      if (existingAddresses.length === 0) {
        for (const addr of user.addresses) {
          const normalized = normalizeAddress(addr);
          if (
            normalized.receiver_name &&
            normalized.phone &&
            normalized.province &&
            normalized.district &&
            normalized.ward &&
            normalized.address_detail
          ) {
            await UserAddress.create({
              user_id: userId,
              ...normalized,
            });
          }
        }
      }
    }

    if (user.measurements && Object.keys(user.measurements).length > 0) {
      const existingMeasurement = await UserMeasurement.findOne({
        user_id: userId,
      }).lean();
      if (!existingMeasurement) {
        await UserMeasurement.create({
          user_id: userId,
          ...normalizeMeasurements(user.measurements),
        });
      }
    }

    if (user.full_name !== undefined) unset.full_name = "";
    if (user.avatar !== undefined) unset.avatar = "";
    if (user.loyalty_points !== undefined) unset.loyalty_points = "";
    if (user.addresses !== undefined) unset.addresses = "";
    if (user.measurements !== undefined) unset.measurements = "";

    if (Object.keys(updates).length > 0 || Object.keys(unset).length > 0) {
      await db.collection("users").updateOne(
        { _id: user._id },
        {
          ...(Object.keys(updates).length > 0 ? { $set: updates } : {}),
          ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
        },
      );
    }

    migratedCount += 1;
  }

  console.log(`✅ Migrated ${migratedCount} users`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
