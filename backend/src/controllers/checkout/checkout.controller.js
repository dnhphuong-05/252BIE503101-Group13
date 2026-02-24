import mongoose from "mongoose";
import Cart from "../../models/cart/Cart.js";
import CartItem from "../../models/cart/CartItem.js";
import Product from "../../models/Product.js";
import UserAddress from "../../models/user/UserAddress.js";
import buyOrderService from "../../services/order/buyOrder.service.js";
import guestCustomerService from "../../services/user/guestCustomer.service.js";
import ApiError from "../../utils/ApiError.js";
import catchAsync from "../../utils/catchAsync.js";
import { createdResponse } from "../../utils/response.js";

const normalizeAddress = (address = {}) => {
  const detail = address.detail || address.address_detail || "";
  return {
    province: address.province?.trim() || "",
    district: address.district?.trim() || "",
    ward: address.ward?.trim() || "",
    detail: detail.trim(),
  };
};

const buildSku = (product, size, color) => {
  let sku = product?.sku || `${product?.product_id || ""}`;
  const parts = [];
  if (size) parts.push(size);
  if (color) parts.push(color);
  if (parts.length) {
    sku = `${sku} - ${parts.join(" - ")}`;
  }
  return sku;
};

const mapCartItemsToOrderItems = (cartItems, productMap) => {
  return cartItems.map((item) => {
    const product = productMap.get(item.product_id);
    const price =
      item.price_snapshot ??
      (product?.price_sale && product.price_sale > 0
        ? product.price_sale
        : product?.price_buy || 0);
    return {
      product_id: item.product_id,
      sku: buildSku(product, item.size, item.color) || `${item.product_id}`,
      name: item.product_name_snapshot || product?.name || `Sản phẩm #${item.product_id}`,
      thumbnail: item.thumbnail_snapshot || product?.thumbnail || "",
      price,
      quantity: item.quantity,
      total_price: price * item.quantity,
    };
  });
};

const mapGuestItemsToOrderItems = (items, productMap) => {
  return items.map((item) => {
    const product = productMap.get(item.product_id);
    if (!product) {
      throw ApiError.notFound(`Không tìm thấy sản phẩm ${item.product_id}`);
    }
    const price =
      product.price_sale && product.price_sale > 0
        ? product.price_sale
        : product.price_buy || 0;
    return {
      product_id: product.product_id,
      sku: buildSku(product, item.size, item.color) || `${item.product_id}`,
      name: product.name,
      thumbnail: product.thumbnail || "",
      price,
      quantity: item.quantity,
      total_price: price * item.quantity,
    };
  });
};

export const createCheckout = catchAsync(async (req, res) => {
  const {
    address_id,
    customer_info,
    shipping_provider,
    shipping_method,
    shipping_fee,
    discount_amount,
    payment_method,
    note,
    cart_item_ids,
    items: guestItems,
  } = req.body;

  const shippingFeeByMethod = {
    standard: 30000,
    express: 50000,
  };
  const resolvedShippingFee =
    shipping_method && shippingFeeByMethod[shipping_method] !== undefined
      ? shippingFeeByMethod[shipping_method]
      : typeof shipping_fee === "number"
        ? shipping_fee
        : 30000;
  const resolvedDiscount = typeof discount_amount === "number" ? discount_amount : 0;
  const normalizedShippingProvider =
    typeof shipping_provider === "string" && shipping_provider.trim()
      ? shipping_provider.trim()
      : null;
  const normalizedShippingMethod =
    typeof shipping_method === "string" && shipping_method.trim()
      ? shipping_method.trim()
      : null;

  if (req.user) {
    const user_id = req.user.user_id;

    let address = null;
    if (address_id) {
      const lookup = { user_id };
      if (/^ADR\d{6}$/i.test(address_id)) {
        lookup.address_id = address_id;
      } else if (mongoose.Types.ObjectId.isValid(address_id)) {
        lookup._id = address_id;
      } else {
        lookup.address_id = address_id;
      }
      address = await UserAddress.findOne(lookup).lean();
    }
    if (!address) {
      address = await UserAddress.findOne({ user_id, is_default: true }).lean();
    }
    if (!address) {
      address = await UserAddress.findOne({ user_id }).sort({ created_at: 1 }).lean();
    }

    if (!address) {
      throw ApiError.badRequest("Vui lòng thêm địa chỉ nhận hàng");
    }

    const customerInfo = {
      full_name: address.receiver_name,
      phone: address.phone,
      email: req.user.email || "",
      address: {
        province: address.province,
        district: address.district || "",
        ward: address.ward,
        detail: address.address_detail,
      },
    };

    if (Array.isArray(guestItems) && guestItems.length > 0) {
      const productIds = [...new Set(guestItems.map((item) => item.product_id))];
      const products = await Product.find({ product_id: { $in: productIds } }).lean();
      const productMap = new Map(products.map((product) => [product.product_id, product]));

      const orderItems = mapGuestItemsToOrderItems(guestItems, productMap);

      const result = await buyOrderService.createBuyOrder({
        user_id,
        customer_info: customerInfo,
        items: orderItems,
        shipping_fee: resolvedShippingFee,
        discount_amount: resolvedDiscount,
        payment_method,
        shipping_provider: normalizedShippingProvider,
        shipping_method: normalizedShippingMethod,
        note: note || "",
      });

      return createdResponse(res, result, "Äáº·t hÃ ng thÃ nh cÃ´ng");
    }

    const cart = await Cart.findOne({ user_id, status: "active" })
      .sort({ updated_at: -1 })
      .lean();
    if (!cart) {
      throw ApiError.notFound("Giỏ hàng trống");
    }

    const filter = { cart_id: cart.cart_id };
    const cartItemIds = Array.isArray(cart_item_ids)
      ? cart_item_ids
      : cart_item_ids
        ? [cart_item_ids]
        : [];
    if (cartItemIds.length > 0) {
      filter.cart_item_id = { $in: cartItemIds };
    }

    const cartItems = await CartItem.find(filter).lean();
    if (!cartItems || cartItems.length === 0) {
      throw ApiError.badRequest("Không có sản phẩm để thanh toán");
    }

    const productIds = [...new Set(cartItems.map((item) => item.product_id))];
    const products = await Product.find({ product_id: { $in: productIds } }).lean();
    const productMap = new Map(products.map((product) => [product.product_id, product]));

    const orderItems = mapCartItemsToOrderItems(cartItems, productMap);

    const result = await buyOrderService.createBuyOrder({
      user_id,
      customer_info: customerInfo,
      items: orderItems,
      shipping_fee: resolvedShippingFee,
      discount_amount: resolvedDiscount,
      payment_method,
      shipping_provider: normalizedShippingProvider,
      shipping_method: normalizedShippingMethod,
      note: note || "",
    });

    await CartItem.deleteMany(filter);
    await Cart.updateOne({ cart_id: cart.cart_id }, { $set: { updated_at: new Date() } });

    return createdResponse(res, result, "Đặt hàng thành công");
  }

  if (!customer_info) {
    throw ApiError.badRequest("Vui lòng nhập thông tin khách hàng");
  }

  if (!guestItems || guestItems.length === 0) {
    throw ApiError.badRequest("Không có sản phẩm để thanh toán");
  }

  const normalizedAddress = normalizeAddress(customer_info.address);
  const guestCustomer = await guestCustomerService.createOrUpdateGuest({
    full_name: customer_info.full_name,
    phone: customer_info.phone,
    email: customer_info.email || null,
    address: normalizedAddress,
  });

  const productIds = [...new Set(guestItems.map((item) => item.product_id))];
  const products = await Product.find({ product_id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((product) => [product.product_id, product]));

  const orderItems = mapGuestItemsToOrderItems(guestItems, productMap);

  const result = await buyOrderService.createBuyOrder({
    guest_id: guestCustomer.guest_id,
    customer_info: {
      full_name: guestCustomer.full_name,
      phone: guestCustomer.phone,
      email: guestCustomer.email || "",
      address: normalizedAddress,
    },
    items: orderItems,
    shipping_fee: resolvedShippingFee,
    discount_amount: resolvedDiscount,
    payment_method,
    shipping_provider: normalizedShippingProvider,
    shipping_method: normalizedShippingMethod,
    note: note || "",
  });

  return createdResponse(res, result, "Đặt hàng thành công");
});
