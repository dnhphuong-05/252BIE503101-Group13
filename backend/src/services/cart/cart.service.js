import BaseService from "../BaseService.js";
import Cart from "../../models/cart/Cart.js";
import CartItem from "../../models/cart/CartItem.js";
import Product from "../../models/Product.js";
import ApiError from "../../utils/ApiError.js";

class CartService extends BaseService {
  constructor() {
    super(Cart);
  }

  async getOrCreateActiveCart(user_id) {
    if (!user_id) {
      throw ApiError.badRequest("user_id is required");
    }

    const existing = await this.model
      .findOne({ user_id, status: "active" })
      .sort({ updated_at: -1 })
      .lean();

    if (existing) {
      return existing;
    }

    return await this.create({
      user_id,
      status: "active",
      updated_at: new Date(),
    });
  }

  async getCartWithItems(user_id) {
    const cart = await this.getOrCreateActiveCart(user_id);
    const items = await CartItem.find({ cart_id: cart.cart_id })
      .sort({ created_at: 1 })
      .lean();

    return { cart, items: await this.attachPricingSnapshots(items) };
  }

  async addItem(user_id, { product_id, quantity = 1, size = null, color = null }) {
    const cart = await this.getOrCreateActiveCart(user_id);

    const product = await Product.findOne({ product_id }).lean();
    if (!product) {
      throw ApiError.notFound("Product not found");
    }

    const normalizedSize =
      typeof size === "string" && size.trim().length > 0 ? size.trim() : null;
    const normalizedColor =
      typeof color === "string" && color.trim().length > 0 ? color.trim() : null;

    const price_snapshot =
      product.price_sale && product.price_sale > 0
        ? product.price_sale
        : product.price_buy;
    const original_price_snapshot = product.price_buy || price_snapshot;
    const product_discount_snapshot = Math.max(
      0,
      original_price_snapshot - price_snapshot,
    );

    const filter = {
      cart_id: cart.cart_id,
      product_id,
      size: normalizedSize,
      color: normalizedColor,
    };
    const updated = await CartItem.findOneAndUpdate(
      filter,
      {
        $inc: { quantity },
        $set: {
          price_snapshot,
          original_price_snapshot,
          product_discount_snapshot,
          product_name_snapshot: product.name,
          thumbnail_snapshot: product.thumbnail,
          size: normalizedSize,
          color: normalizedColor,
        },
      },
      { new: true },
    ).lean();

    if (updated) {
      await this.touchCart(cart.cart_id);
      return await this.attachPricingSnapshot(updated);
    }

    const created = await CartItem.create({
      cart_id: cart.cart_id,
      product_id,
      product_name_snapshot: product.name,
      thumbnail_snapshot: product.thumbnail,
      price_snapshot,
      original_price_snapshot,
      product_discount_snapshot,
      size: normalizedSize,
      color: normalizedColor,
      quantity,
      created_at: new Date(),
    });

    await this.touchCart(cart.cart_id);
    return await this.attachPricingSnapshot(created.toObject());
  }

  async updateItemQuantity(user_id, cart_item_id, quantity) {
    const cart = await this.getOrCreateActiveCart(user_id);

    const updated = await CartItem.findOneAndUpdate(
      { cart_id: cart.cart_id, cart_item_id },
      { $set: { quantity } },
      { new: true },
    ).lean();

    if (!updated) {
      throw ApiError.notFound("Cart item not found");
    }

    await this.touchCart(cart.cart_id);
    return await this.attachPricingSnapshot(updated);
  }

  async removeItem(user_id, cart_item_id) {
    const cart = await this.getOrCreateActiveCart(user_id);

    const removed = await CartItem.findOneAndDelete({
      cart_id: cart.cart_id,
      cart_item_id,
    }).lean();

    if (!removed) {
      throw ApiError.notFound("Cart item not found");
    }

    await this.touchCart(cart.cart_id);
    return removed;
  }

  async checkout(user_id) {
    const cart = await this.model
      .findOne({ user_id, status: "active" })
      .sort({ updated_at: -1 })
      .lean();

    if (!cart) {
      throw ApiError.notFound("Active cart not found");
    }

    const updated = await this.model
      .findOneAndUpdate(
        { cart_id: cart.cart_id },
        { $set: { status: "checked_out", updated_at: new Date() } },
        { new: true },
      )
      .lean();

    return updated;
  }

  async clearItems(user_id) {
    const cart = await this.getOrCreateActiveCart(user_id);
    const result = await CartItem.deleteMany({ cart_id: cart.cart_id });
    await this.touchCart(cart.cart_id);
    return { removed: result.deletedCount || 0 };
  }

  async touchCart(cart_id) {
    await this.model.updateOne(
      { cart_id },
      { $set: { updated_at: new Date() } },
    );
  }

  async attachPricingSnapshot(item) {
    if (!item) {
      return item;
    }

    const [enrichedItem] = await this.attachPricingSnapshots([item]);
    return enrichedItem || item;
  }

  async attachPricingSnapshots(items = []) {
    if (!Array.isArray(items) || items.length === 0) {
      return items;
    }

    const productIds = [...new Set(items.map((item) => item.product_id).filter(Boolean))];
    const products = await Product.find({ product_id: { $in: productIds } })
      .select("product_id price_buy price_sale")
      .lean();

    const productMap = new Map(
      products.map((product) => [Number(product.product_id), product]),
    );

    return items.map((item) => {
      const product = productMap.get(Number(item.product_id));
      const finalUnitPrice = Number(
        item.price_snapshot ??
          (product?.price_sale && product.price_sale > 0
            ? product.price_sale
            : product?.price_buy ?? 0),
      );
      const originalUnitPrice = Number(
        item.original_price_snapshot ?? product?.price_buy ?? finalUnitPrice,
      );
      const productDiscount = Number(
        item.product_discount_snapshot ?? Math.max(0, originalUnitPrice - finalUnitPrice),
      );

      return {
        ...item,
        original_price_snapshot: originalUnitPrice,
        product_discount_snapshot: Math.max(0, productDiscount),
      };
    });
  }
}

export default new CartService();
