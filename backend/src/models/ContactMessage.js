import mongoose from "mongoose";

const normalizeStatus = (status) => {
  if (status === "done" || status === "cancelled") {
    return "closed";
  }
  return status;
};

const contactMessageSchema = new mongoose.Schema(
  {
    contact_id: {
      type: Number,
      unique: true,
      index: true,
    },
    full_name: {
      type: String,
      required: [true, "Vui lÃ²ng nháº­p há» tÃªn"],
      trim: true,
      maxlength: [100, "Há» tÃªn khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 100 kÃ½ tá»±"],
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: [100, "Há» tÃªn khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 100 kÃ½ tá»±"],
    },
    phone: {
      type: String,
      required: [true, "Vui lÃ²ng nháº­p sá»‘ Ä‘iá»‡n thoáº¡i"],
      trim: true,
      match: [/^[0-9]{10,11}$/, "Sá»‘ Ä‘iá»‡n thoáº¡i khÃ´ng há»£p lá»‡ (10-11 chá»¯ sá»‘)"],
    },
    email: {
      type: String,
      required: [true, "Vui lÃ²ng nháº­p email"],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Email khÃ´ng há»£p lá»‡",
      ],
    },
    purpose: {
      type: String,
      required: [true, "Vui lÃ²ng chá»n má»¥c Ä‘Ã­ch liÃªn há»‡"],
      enum: {
        values: ["consult", "rent", "buy", "custom", "cooperation"],
        message: "Má»¥c Ä‘Ã­ch liÃªn há»‡ khÃ´ng há»£p lá»‡",
      },
    },
    message: {
      type: String,
      required: [true, "Vui lÃ²ng nháº­p ná»™i dung liÃªn há»‡"],
      trim: true,
      maxlength: [1000, "Ná»™i dung liÃªn há»‡ khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 1000 kÃ½ tá»±"],
    },
    status: {
      type: String,
      enum: {
        values: ["new", "processing", "replied", "closed", "done", "cancelled"],
        message: "Tráº¡ng thÃ¡i khÃ´ng há»£p lá»‡",
      },
      default: "new",
      index: true,
    },
    user_id: {
      type: String,
      default: null,
      index: true,
      match: [/^USR\d{6}$/, "User ID must match USR000123"],
    },
    guest_id: {
      type: String,
      default: null,
      index: true,
      match: [/^GST\d{6}$/, "Guest ID must match GST000001"],
    },
    admin_note: {
      type: String,
      default: "",
      maxlength: [500, "Ghi chÃº khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 500 kÃ½ tá»±"],
    },
    replied_at: {
      type: Date,
      default: null,
    },
    replied_by: {
      type: String,
      default: null,
      match: [/^USR\d{6}$/, "User ID must match USR000123"],
    },
    createdAt: {
      type: Date,
    },
    updatedAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "contact_messages",
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        const ordered = {
          contact_id: ret.contact_id,
          full_name: ret.full_name || ret.fullName,
          phone: ret.phone,
          email: ret.email,
          purpose: ret.purpose,
          message: ret.message,
          status: normalizeStatus(ret.status),
          user_id: ret.user_id || null,
          guest_id: ret.guest_id || null,
          admin_note: ret.admin_note || "",
          replied_at: ret.replied_at || ret.repliedAt || null,
          replied_by: ret.replied_by || ret.repliedBy || null,
          created_at: ret.created_at || ret.createdAt,
          updated_at: ret.updated_at || ret.updatedAt,
        };
        delete ret._id;
        delete ret.__v;
        return ordered;
      },
    },
    toObject: { virtuals: true },
  },
);

// Index cho tÃ¬m kiáº¿m
contactMessageSchema.index({ email: 1 });
contactMessageSchema.index({ phone: 1 });
contactMessageSchema.index({ full_name: 1 });
contactMessageSchema.index({ fullName: 1 });
contactMessageSchema.index({ status: 1, created_at: -1 });

// Virtual field Ä‘á»ƒ format purpose
contactMessageSchema.virtual("purposeLabel").get(function () {
  const purposeMap = {
    consult: "TÆ° váº¥n mua cá»• phá»¥c",
    rent: "ThuÃª cá»• phá»¥c chá»¥p áº£nh",
    buy: "Mua cá»• phá»¥c",
    custom: "May Ä‘o theo yÃªu cáº§u",
    cooperation: "Há»£p tÃ¡c / dá»± Ã¡n / sá»± kiá»‡n",
  };
  return purposeMap[this.purpose] || this.purpose;
});

// Virtual field Ä‘á»ƒ format status
contactMessageSchema.virtual("statusLabel").get(function () {
  const statusMap = {
    new: "Má»›i",
    processing: "Äang xá»­ lÃ½",
    replied: "ÄÃ£ pháº£n há»“i",
    closed: "ÄÃ£ Ä‘Ã³ng",
  };
  const normalized = normalizeStatus(this.status);
  return statusMap[normalized] || normalized;
});

// Middleware Ä‘á»ƒ tá»± Ä‘á»™ng táº¡o contact_id vÃ  normalize legacy fields
contactMessageSchema.pre("save", async function (next) {
  if (!this.full_name && this.fullName) {
    this.full_name = this.fullName;
  }
  if (this.full_name && this.fullName) {
    this.fullName = undefined;
  }

  if (!this.contact_id) {
    try {
      const lastContact = await this.constructor
        .findOne()
        .sort({ contact_id: -1 })
        .select("contact_id")
        .lean();

      this.contact_id = lastContact ? lastContact.contact_id + 1 : 1;
    } catch (error) {
      console.error("Error generating contact_id:", error);
      return next(error);
    }
  }
  next();
});

// Method Ä‘á»ƒ cáº­p nháº­t tráº¡ng thÃ¡i
contactMessageSchema.methods.updateStatus = async function (
  newStatus,
  adminNote = "",
  repliedBy = null,
) {
  this.status = newStatus;
  if (adminNote !== undefined) {
    this.admin_note = adminNote;
  }
  if (newStatus === "replied" && !this.replied_at) {
    this.replied_at = new Date();
  }
  if (repliedBy) {
    this.replied_by = repliedBy;
  }
  return await this.save();
};

// Static method Ä‘á»ƒ láº¥y thá»‘ng kÃª
contactMessageSchema.statics.getStatistics = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    total: 0,
    new: 0,
    processing: 0,
    replied: 0,
    closed: 0,
  };

  stats.forEach((stat) => {
    const normalized = normalizeStatus(stat._id);
    if (!result[normalized]) {
      result[normalized] = 0;
    }
    result[normalized] += stat.count;
    result.total += stat.count;
  });

  return result;
};

const ContactMessage = mongoose.model("ContactMessage", contactMessageSchema);

export default ContactMessage;
