import BaseService from "../BaseService.js";
import User from "../../models/user/User.js";
import UserProfile from "../../models/user/UserProfile.js";
import UserAddress from "../../models/user/UserAddress.js";
import UserMeasurement from "../../models/user/UserMeasurement.js";
import UserLoyalty from "../../models/user/UserLoyalty.js";
import LoyaltyTransaction from "../../models/user/LoyaltyTransaction.js";
import ApiError from "../../utils/ApiError.js";

const attachUserDetails = async (user) => {
  const userId = user.user_id;

  const [profile, addresses, loyalty, latestMeasurement] =
    await Promise.all([
      UserProfile.findOne({ user_id: userId }).lean(),
      UserAddress.find({ user_id: userId })
        .sort({ is_default: -1, created_at: -1 })
        .lean(),
      UserLoyalty.findOne({ user_id: userId }).lean(),
      UserMeasurement.findOne({ user_id: userId })
        .sort({ measured_at: -1, created_at: -1 })
        .lean(),
    ]);

  return {
    ...user,
    profile: profile || null,
    addresses: addresses || [],
    loyalty: loyalty || null,
    latest_measurement: latestMeasurement || null,
  };
};

class UserService extends BaseService {
  constructor() {
    super(User);
  }

  /**
   * Get user by email
   */
  async getByEmail(email) {
    return await this.getOne({ email, status: "active" });
  }

  /**
   * Get user by user_id
   */
  async getByUserId(user_id) {
    const user = await this.model.findOne({ user_id }).lean();
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    return await attachUserDetails(user);
  }

  /**
   * Get all users with profiles and loyalty
   */
  async getAllUsers(filter = {}, options = {}) {
    const { page = 1, limit = 20, sort = "-created_at" } = options;
    const result = await super.getAll(filter, { page, limit, sort });

    const userIds = result.items.map((user) => user.user_id).filter(Boolean);
    const [profiles, loyalties] = await Promise.all([
      UserProfile.find({ user_id: { $in: userIds } }).lean(),
      UserLoyalty.find({ user_id: { $in: userIds } }).lean(),
    ]);

    const profileMap = new Map(
      profiles.map((profile) => [profile.user_id, profile]),
    );
    const loyaltyMap = new Map(
      loyalties.map((loyalty) => [loyalty.user_id, loyalty]),
    );

    const items = result.items.map((user) => ({
      ...user,
      profile: profileMap.get(user.user_id) || null,
      loyalty: loyaltyMap.get(user.user_id) || null,
    }));

    return { items, pagination: result.pagination };
  }

  /**
   * Create user with auto-generated user_id
   */
  async createUser(data) {
    const {
      email,
      phone,
      password,
      full_name,
      avatar,
      gender,
      birthday,
      height,
      weight,
      size_standard,
    } = data;

    if (!full_name) {
      throw ApiError.badRequest("Full name is required");
    }

    const user = await this.model.create({
      email,
      phone,
      password_hash: password,
      role: "customer",
      status: "active",
    });

    await Promise.all([
      UserProfile.create({
        user_id: user.user_id,
        full_name,
        avatar: avatar || "",
        gender: gender ?? null,
        birthday: birthday ?? null,
        height: height ?? null,
        weight: weight ?? null,
        size_standard: size_standard ?? null,
      }),
      UserLoyalty.create({
        user_id: user.user_id,
        total_points: 0,
      }),
    ]);

    return await this.getById(user._id.toString());
  }

  /**
   * Get user by ID with related data
   */
  async getById(id) {
    const user = await this.model.findById(id).lean();
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    return await attachUserDetails(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(id, data) {
    const user = await this.model.findById(id);
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const userUpdates = {};
    if (data.email) userUpdates.email = data.email;
    if (data.phone) userUpdates.phone = data.phone;

    if (Object.keys(userUpdates).length > 0) {
      Object.assign(user, userUpdates);
      await user.save();
    }

    const profileUpdates = {};
    if (data.full_name !== undefined) profileUpdates.full_name = data.full_name;
    if (data.avatar !== undefined) profileUpdates.avatar = data.avatar;
    if (data.gender !== undefined) profileUpdates.gender = data.gender;
    if (data.birthday !== undefined) profileUpdates.birthday = data.birthday;
    if (data.height !== undefined) profileUpdates.height = data.height;
    if (data.weight !== undefined) profileUpdates.weight = data.weight;
    if (data.size_standard !== undefined) {
      profileUpdates.size_standard = data.size_standard;
    }

    if (Object.keys(profileUpdates).length > 0) {
      const existingProfile = await UserProfile.findOne({
        user_id: user.user_id,
      });

      if (existingProfile) {
        Object.assign(existingProfile, profileUpdates);
        await existingProfile.save();
      } else {
        if (!profileUpdates.full_name) {
          throw ApiError.badRequest("Full name is required to create profile");
        }
        await UserProfile.create({
          user_id: user.user_id,
          ...profileUpdates,
        });
      }
    }

    return await this.getById(user._id.toString());
  }

  /**
   * Change password
   */
  async changePassword(id, oldPassword, newPassword) {
    const user = await this.model.findById(id).select("+password_hash");

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      throw ApiError.badRequest("Old password is incorrect");
    }

    user.password_hash = newPassword;
    await user.save();

    return { message: "Password changed successfully" };
  }

  /**
   * Add address
   */
  async addAddress(id, address) {
    const user = await this.model.findById(id).lean();

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    if (address.is_default) {
      await UserAddress.updateMany(
        { user_id: user.user_id },
        { $set: { is_default: false } },
      );
    }

    await UserAddress.create({
      user_id: user.user_id,
      receiver_name: address.receiver_name,
      phone: address.phone,
      province: address.province,
      district: address.district ?? "",
      ward: address.ward,
      address_detail: address.address_detail,
      note: address.note ?? null,
      is_default: address.is_default ?? false,
    });

    return await this.getById(id);
  }

  /**
   * Update address
   */
  async updateAddress(id, addressId, addressData) {
    const user = await this.model.findById(id).lean();

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const address = await UserAddress.findOne({
      user_id: user.user_id,
      address_id: addressId,
    });
    if (!address) {
      throw ApiError.notFound("Address not found");
    }

    if (addressData.is_default) {
      await UserAddress.updateMany(
        { user_id: user.user_id },
        { $set: { is_default: false } },
      );
    }

    Object.assign(address, {
      receiver_name: addressData.receiver_name ?? address.receiver_name,
      phone: addressData.phone ?? address.phone,
      province: addressData.province ?? address.province,
      district: addressData.district ?? address.district ?? "",
      ward: addressData.ward ?? address.ward,
      address_detail: addressData.address_detail ?? address.address_detail,
      note: addressData.note ?? address.note,
      is_default: addressData.is_default ?? address.is_default,
    });

    await address.save();

    return await this.getById(id);
  }

  /**
   * Delete address
   */
  async deleteAddress(id, addressId) {
    const user = await this.model.findById(id).lean();

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const result = await UserAddress.deleteOne({
      user_id: user.user_id,
      address_id: addressId,
    });

    if (result.deletedCount === 0) {
      throw ApiError.notFound("Address not found");
    }

    return await this.getById(id);
  }

  /**
   * Set default address
   */
  async setDefaultAddress(id, addressId) {
    const user = await this.model.findById(id).lean();

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const address = await UserAddress.findOne({
      user_id: user.user_id,
      address_id: addressId,
    });

    if (!address) {
      throw ApiError.notFound("Address not found");
    }

    await UserAddress.updateMany(
      { user_id: user.user_id },
      { $set: { is_default: false } },
    );

    address.is_default = true;
    await address.save();

    return await this.getById(id);
  }

  /**
   * Update measurements (insert history)
   */
  async updateMeasurements(id, measurements) {
    const user = await this.model.findById(id).lean();

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    await UserMeasurement.create({
      user_id: user.user_id,
      neck: measurements.neck ?? null,
      shoulder: measurements.shoulder ?? null,
      chest: measurements.chest ?? null,
      waist: measurements.waist ?? null,
      hip: measurements.hip ?? null,
      sleeve: measurements.sleeve ?? null,
      arm: measurements.arm ?? null,
      back_length: measurements.back_length ?? null,
      leg_length: measurements.leg_length ?? null,
      unit: measurements.unit || "cm",
      measured_at: measurements.measured_at || new Date(),
    });

    return await this.getById(id);
  }

  /**
   * Block user
   */
  async blockUser(id) {
    return await this.update(id, { status: "blocked" });
  }

  /**
   * Unblock user
   */
  async unblockUser(id) {
    return await this.update(id, { status: "active" });
  }

  /**
   * Delete user and related data
   */
  async delete(id) {
    const user = await this.model.findById(id).lean();
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    await Promise.all([
      UserProfile.deleteOne({ user_id: user.user_id }),
      UserAddress.deleteMany({ user_id: user.user_id }),
      UserMeasurement.deleteMany({ user_id: user.user_id }),
      UserLoyalty.deleteOne({ user_id: user.user_id }),
      LoyaltyTransaction.deleteMany({ user_id: user.user_id }),
      this.model.deleteOne({ _id: user._id }),
    ]);

    return { id, deleted: true };
  }
}

export default new UserService();
