import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * Schema định nghĩa cho Guest Customers - Khách hàng không đăng nhập
 *
 * @description Lưu trữ thông tin khách hàng đặt hàng mà không cần đăng ký tài khoản
 * @purpose Tăng tỷ lệ chuyển đổi, giảm ma sát trong quá trình mua hàng
 */
const GuestCustomerSchema = new Schema(
  {
    /**
     * guest_id - Mã định danh duy nhất cho guest customer
     * Format: GST000001, GST000002, ...
     * @type {String}
     * @required true
     * @unique true
     */
    guest_id: {
      type: String,
      required: [true, "Guest ID is required"],
      unique: true,
      match: [/^GST\d{6}$/, "Guest ID must be GST000001"],
      index: true,
    },

    /**
     * full_name - Họ và tên đầy đủ của khách hàng
     * @type {String}
     * @required true
     */
    full_name: {
      type: String,
      required: [true, "Họ và tên là bắt buộc"],
      trim: true,
      minlength: [2, "Họ và tên phải có ít nhất 2 ký tự"],
      maxlength: [100, "Họ và tên không được vượt quá 100 ký tự"],
    },

    /**
     * phone - Số điện thoại liên hệ chính
     * @type {String}
     * @required true
     * @unique true - 1 số điện thoại tương ứng 1 khách
     */
    phone: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
      validate: {
        validator: (value) =>
          !value || /^(0|\+84)[0-9]{9,10}$/.test(value),
        message: "Invalid phone number",
      },
      index: true,
    },

    /**
     * email - Địa chỉ email của khách hàng
     * @type {String}
     * @required true - Bắt buộc để gửi xác nhận đơn hàng
     */
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value) =>
          !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Invalid email",
      },
      index: true,
    },

    /**
     * address - Địa chỉ giao hàng của khách
     * @type {Object}
     * @required true
     */
    address: {
      /**
       * province - Tỉnh/Thành phố
       */
      province: {
        type: String,
        required: false,
        trim: true,
      },

      /**
       * district - Quận/Huyện (dữ liệu cũ, không còn bắt buộc)
       */
      district: {
        type: String,
        trim: true,
        default: "",
      },

      /**
       * ward - Xã/Phường/Đặc khu
       */
      ward: {
        type: String,
        required: false,
        trim: true,
      },

      /**
       * detail - Địa chỉ chi tiết (số nhà, đường, tòa nhà...)
       */
      detail: {
        type: String,
        required: false,
        trim: true,
        maxlength: [500, "Địa chỉ chi tiết không được vượt quá 500 ký tự"],
      },
    },

    /**
     * last_order_at - Thời điểm khách đặt đơn gần nhất
     * @type {Date}
     * @default null - Sẽ được cập nhật khi có đơn hàng
     */
    last_order_at: {
      type: Date,
      default: null,
      index: true,
    },

    /**
     * order_count - Tổng số đơn hàng đã đặt
     * @type {Number}
     * @default 0
     */
    order_count: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * total_spent - Tổng số tiền đã chi tiêu
     * @type {Number}
     * @default 0
     */
    total_spent: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * notes - Ghi chú về khách hàng (cho admin)
     * @type {String}
     */
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Ghi chú không được vượt quá 1000 ký tự"],
    },
  },
  {
    timestamps: true, // Auto create created_at và updated_at
    collection: "guest_customers",
  },
);

// ============================================================================
// INDEXES
// ============================================================================

// Index để tìm kiếm nhanh theo phone và email
GuestCustomerSchema.index({ phone: 1, email: 1 });

// Index để thống kê khách hàng mới
GuestCustomerSchema.index({ created_at: -1 });

// Index để phân tích khách hàng theo thời gian đơn hàng cuối
GuestCustomerSchema.index({ last_order_at: -1 });

// ============================================================================
// VIRTUAL FIELDS
// ============================================================================

/**
 * Virtual field: full_address - Địa chỉ đầy đủ dạng string
 */
GuestCustomerSchema.virtual("full_address").get(function () {
  const { detail, ward, district, province } = this.address;
  const parts = [detail, ward, district, province]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
  return parts.join(", ");
});

/**
 * Virtual field: customer_status - Trạng thái khách hàng
 * - new: Chưa từng đặt đơn
 * - active: Đã đặt đơn trong 30 ngày gần đây
 * - inactive: Đã đặt đơn nhưng lâu không mua (>30 ngày)
 */
GuestCustomerSchema.virtual("customer_status").get(function () {
  if (this.order_count === 0) {
    return "new";
  }

  if (!this.last_order_at) {
    return "inactive";
  }

  const daysSinceLastOrder = Math.floor(
    (Date.now() - this.last_order_at.getTime()) / (1000 * 60 * 60 * 24),
  );

  return daysSinceLastOrder <= 30 ? "active" : "inactive";
});

// ---------------------------------------------------------------------------
// HOOKS
// ---------------------------------------------------------------------------

GuestCustomerSchema.pre("validate", async function (next) {
  if (this.isNew && !this.guest_id) {
    try {
      this.guest_id = await this.constructor.generateGuestId();
    } catch (error) {
      return next(error);
    }
  }

  next();
});

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Tạo guest_id mới theo format GST000001
 * @returns {Promise<String>} Guest ID mới
 */
GuestCustomerSchema.statics.generateGuestId = async function () {
  const lastGuest = await this.findOne()
    .sort({ guest_id: -1 })
    .select("guest_id")
    .lean();

  if (!lastGuest || !lastGuest.guest_id) {
    return "GST000001";
  }

  // Extract number from GST000001 format
  const lastNumber = parseInt(lastGuest.guest_id.replace("GST", ""), 10);
  const nextNumber = lastNumber + 1;

  // Pad with zeros to make it 6 digits
  return `GST${nextNumber.toString().padStart(6, "0")}`;
};

/**
 * Tìm hoặc tạo guest customer theo phone
 * @param {Object} guestData - Dữ liệu guest customer
 * @returns {Promise<Object>} Guest customer document
 */
GuestCustomerSchema.statics.findOrCreate = async function (guestData) {
  // Tìm theo phone
  let guest = await this.findOne({ phone: guestData.phone });

  if (guest) {
    // Cập nhật thông tin nếu đã tồn tại
    Object.assign(guest, guestData);
    await guest.save();
    return guest;
  }

  // Tạo mới nếu chưa tồn tại
  const guest_id = await this.generateGuestId();
  guest = await this.create({ ...guestData, guest_id });

  return guest;
};

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Cập nhật thông tin đơn hàng mới
 * @param {Number} orderAmount - Giá trị đơn hàng
 */
GuestCustomerSchema.methods.recordOrder = function (orderAmount = 0) {
  this.order_count += 1;
  this.total_spent += orderAmount;
  this.last_order_at = new Date();
  return this.save();
};

/**
 * Transform toJSON để ẩn các field không cần thiết
 */
GuestCustomerSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const GuestCustomer = mongoose.model("GuestCustomer", GuestCustomerSchema);

export default GuestCustomer;
