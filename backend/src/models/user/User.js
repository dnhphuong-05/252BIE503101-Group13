import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Roles } from "../../constants/roles.js";
import { generateNextId } from "../../utils/idGenerator.js";

const userSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
      index: true,
    },
    google_id: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },
    phone: {
      type: String,
      required: function () {
        return this.provider !== "google";
      },
      default: null,
      index: true,
    },
    password_hash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(Roles), // ['customer', 'staff', 'admin', 'super_admin']
      default: Roles.CUSTOMER,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
      index: true,
    },
    last_login_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "users",
  },
);

// Indexes
userSchema.index({ email: 1, status: 1 });
userSchema.index({ role: 1, status: 1 });

// Methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

// Pre-save hook
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

export default mongoose.model("User", userSchema);
