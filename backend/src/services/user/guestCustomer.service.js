import BaseService from "../BaseService.js";
import GuestCustomer from "../../models/user/GuestCustomer.js";
import ApiError from "../../utils/ApiError.js";

class GuestCustomerService extends BaseService {
  constructor() {
    super(GuestCustomer);
  }

  async createOrUpdateGuest(data) {
    const { full_name, phone, email, address } = data;

    if (!full_name || !phone || !address) {
      throw ApiError.badRequest("Vui lòng điền đầy đủ thông tin khách");
    }

    const normalized = {
      full_name: full_name.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : null,
      address: {
        province: address.province?.trim(),
        district: address.district?.trim() || "",
        ward: address.ward?.trim(),
        detail: address.detail?.trim(),
      },
      last_order_at: new Date(),
    };

    const existing = await this.model.findOne({ phone: normalized.phone });
    if (existing) {
      existing.full_name = normalized.full_name;
      existing.email = normalized.email;
      existing.address = normalized.address;
      existing.last_order_at = normalized.last_order_at;
      await existing.save();
      return existing.toObject();
    }

    const guestCustomer = await this.model.create(normalized);
    return guestCustomer.toObject();
  }
}

export default new GuestCustomerService();
