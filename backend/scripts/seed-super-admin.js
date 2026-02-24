import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { generateNextId } from "../src/utils/idGenerator.js";

// ✅ Đồng bộ role trong toàn hệ thống
const Roles = {
  CUSTOMER: "customer",
  STAFF: "staff",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

const userSchema = new mongoose.Schema(
  {
    user_id: { type: String, unique: true, index: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, default: "" },
    password_hash: { type: String, required: true },
    role: { type: String, required: true },
    status: { type: String, default: "active" },
    last_login_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "users",
  },
);

userSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.user_id) {
      this.user_id = await generateNextId(this.constructor, "user_id", "USR");
    }
    if (this.isModified("password_hash")) {
      const isBcryptHash = this.password_hash?.startsWith("$2");
      if (!isBcryptHash) {
        this.password_hash = await bcrypt.hash(this.password_hash, 10);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

const userProfileSchema = new mongoose.Schema(
  {
    profile_id: { type: String, unique: true, index: true },
    user_id: { type: String, required: true, unique: true, index: true },
    full_name: { type: String, required: true },
    avatar: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "user_profiles",
  },
);

userProfileSchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.profile_id) {
      this.profile_id = await generateNextId(
        this.constructor,
        "profile_id",
        "PRO",
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

const userLoyaltySchema = new mongoose.Schema(
  {
    loyalty_id: { type: String, unique: true, index: true },
    user_id: { type: String, required: true, unique: true, index: true },
    total_points: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: false, updatedAt: "updated_at" },
    collection: "user_loyalty",
  },
);

userLoyaltySchema.pre("save", async function (next) {
  try {
    if (this.isNew && !this.loyalty_id) {
      this.loyalty_id = await generateNextId(
        this.constructor,
        "loyalty_id",
        "LOY",
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.models.User || mongoose.model("User", userSchema);
const UserProfile =
  mongoose.models.UserProfile || mongoose.model("UserProfile", userProfileSchema);
const UserLoyalty =
  mongoose.models.UserLoyalty || mongoose.model("UserLoyalty", userLoyaltySchema);

/**
 * Validate required environment variables
 */
function assertEnv(name) {
  if (!process.env[name]) {
    throw new Error(`❌ Missing required environment variable: ${name}`);
  }
  return process.env[name];
}

/**
 * Main seed function
 */
async function main() {
  console.log("🚀 Starting Super Admin seed script...\n");

  // ✅ Validate environment variables
  assertEnv("MONGODB_URI");
  assertEnv("SUPER_ADMIN_EMAIL");
  assertEnv("SUPER_ADMIN_PASSWORD");
  assertEnv("SUPER_ADMIN_NAME");

  // ✅ Connect to MongoDB
  console.log("📡 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB\n");

  // ✅ Check if super_admin already exists
  const existed = await User.findOne({ role: Roles.SUPER_ADMIN }).lean();
  if (existed) {
    const profile = await UserProfile.findOne({
      user_id: existed.user_id,
    }).lean();
    console.log(`✅ Super admin already exists:`);
    console.log(`   Email: ${existed.email}`);
    console.log(`   User ID: ${existed.user_id}`);
    console.log(`   Name: ${profile?.full_name || "N/A"}\n`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // ✅ Create new super_admin
  console.log("📝 Creating new Super Admin...");

  const email = process.env.SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 10);

  const doc = await User.create({
    phone: process.env.SUPER_ADMIN_PHONE || "",
    email,
    password_hash: passwordHash,
    role: Roles.SUPER_ADMIN,
    status: "active",
  });

  await Promise.all([
    UserProfile.create({
      user_id: doc.user_id,
      full_name: process.env.SUPER_ADMIN_NAME,
      avatar: process.env.SUPER_ADMIN_AVATAR || "",
    }),
    UserLoyalty.create({
      user_id: doc.user_id,
      total_points: 0,
    }),
  ]);

  console.log("✅ Super Admin created successfully!");
  console.log(`   Email: ${doc.email}`);
  console.log(`   User ID: ${doc.user_id}`);
  console.log(`   Name: ${process.env.SUPER_ADMIN_NAME}`);
  console.log(`   Role: ${doc.role}`);
  console.log(`   Phone: ${doc.phone}\n`);

  console.log("🎉 Seed completed successfully!");

  await mongoose.disconnect();
  process.exit(0);
}

// ✅ Run seed script
main().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  console.error(err);
  process.exit(1);
});
