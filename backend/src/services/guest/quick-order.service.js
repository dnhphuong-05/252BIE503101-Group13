import GuestCustomer from "../../models/GuestCustomer.js";
import buyOrderService from "../order/buyOrder.service.js";
import emailService from "../email/email.service.js";
import ApiError from "../../utils/ApiError.js";
import { StatusCodes } from "http-status-codes";

/**
 * Quick Order Service
 *
 * @description Service để xử lý đơn hàng nhanh từ guest customers
 */

class QuickOrderService {
  /**
   * Tạo mã đơn hàng tự động
   * Format: PHUC + YYMMDD + 3 số tự tăng (PHUC240203001)
   * @returns {Promise<string>} Mã đơn hàng
   */
  async generateOrderCode() {
    const date = new Date();
    const yy = date.getFullYear().toString().slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const datePrefix = `PHUC${yy}${mm}${dd}`;

    // Đếm số đơn hàng trong ngày (giả định - có thể cải thiện bằng cách query database)
    const randomNum = Math.floor(Math.random() * 900) + 100; // 100-999

    return `${datePrefix}${randomNum}`;
  }

  /**
   * Tạo token theo dõi đơn hàng
   * @param {string} orderCode - Mã đơn hàng
   * @returns {string} Token
   */
  generateTrackingToken(orderCode) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}${random}`;
  }

  /**
   * Tạo đơn hàng nhanh từ guest customer
   * @param {Object} orderData - Dữ liệu đơn hàng
   * @returns {Promise<Object>} Đơn hàng đã tạo
   */
  async createQuickOrder(orderData) {
    try {
      // 1. Tìm hoặc tạo guest customer
      const guestCustomer = await GuestCustomer.findOrCreate({
        full_name: orderData.customer.full_name,
        phone: orderData.customer.phone,
        email: orderData.customer.email,
        address: orderData.customer.address,
      });

      console.log("✅ Guest customer created/found:", guestCustomer.guest_id);

      // 2. Tạo đơn hàng vào database thông qua BuyOrder Service
      const buyOrderData = {
        guest_id: guestCustomer.guest_id,
        customer_info: {
          full_name: guestCustomer.full_name,
          phone: guestCustomer.phone,
          email: guestCustomer.email || "",
          address: guestCustomer.address,
        },
        items: orderData.items,
        shipping_fee: orderData.shippingFee || 30000,
        discount_amount: orderData.discountAmount || 0,
        payment_method: orderData.paymentMethod || "cod",
        note: orderData.note || "",
      };

      const { order, orderItems } = await buyOrderService.createBuyOrder(
        buyOrderData
      );

      console.log("✅ Buy order created in database:", order.order_id);

      // 3. Cập nhật guest customer
      await guestCustomer.recordOrder(order.total_amount);

      // 4. Tạo tracking URL
      const trackingToken = this.generateTrackingToken(order.order_code);
      const trackingUrl = `${process.env.FRONTEND_URL || "http://localhost:4200"}/track-order/${order.order_code}?token=${trackingToken}`;

      // 5. Gửi email xác nhận (nếu có email)
      let emailSent = false;
      if (guestCustomer.email) {
        console.log("📧 Sending order confirmation email to:", guestCustomer.email);
        
        const emailData = {
          orderCode: order.order_code,
          status: this.translateOrderStatus(order.order_status),
          customer: {
            full_name: guestCustomer.full_name,
            phone: guestCustomer.phone,
            email: guestCustomer.email,
            full_address: guestCustomer.full_address,
          },
          items: order.items,
          subtotal: order.subtotal_amount,
          shippingFee: order.shipping_fee,
          total: order.total_amount,
          trackingUrl: trackingUrl,
        };

        const emailResult = await emailService.sendOrderConfirmation(emailData);
        emailSent = emailResult.success;

        if (emailSent) {
          console.log("✅ Email sent successfully");
        } else {
          console.log("⚠️ Email failed:", emailResult.error);
        }

        // Gửi thông báo cho admin
        if (process.env.ADMIN_EMAIL) {
          await emailService.sendNewOrderNotificationToAdmin(emailData);
          console.log("✅ Admin notification sent");
        }
      } else {
        console.log("ℹ️ No email provided, skipping email notification");
      }

      return {
        success: true,
        order: {
          order_id: order.order_id,
          order_code: order.order_code,
          guest_id: guestCustomer.guest_id,
          customer_info: order.customer_info,
          items: order.items,
          subtotal_amount: order.subtotal_amount,
          shipping_fee: order.shipping_fee,
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          order_status: order.order_status,
          trackingUrl: trackingUrl,
          created_at: order.created_at,
        },
        orderItems: orderItems,
        message: emailSent
          ? "Đơn hàng đã được tạo thành công. Email xác nhận đã được gửi!"
          : "Đơn hàng đã được tạo thành công!",
      };
    } catch (error) {
      console.error("❌ Error creating quick order:", error);
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        error.message || "Không thể tạo đơn hàng. Vui lòng thử lại sau.",
      );
    }
  }

  /**
   * Dịch trạng thái đơn hàng sang tiếng Việt
   * @param {string} status - Trạng thái tiếng Anh
   * @returns {string} Trạng thái tiếng Việt
   */
  translateOrderStatus(status) {
    const statusMap = {
      pending: "Chờ xác nhận",
      confirmed: "Đã xác nhận",
      processing: "Đang xử lý",
      shipping: "Đang giao",
      completed: "Hoàn thành",
      cancelled: "Đã hủy",
    };
    return statusMap[status] || status;
  }

  /**
   * Tra cứu đơn hàng theo mã
   * @param {string} orderCode - Mã đơn hàng
   * @param {string} trackingToken - Token theo dõi (optional)
   * @returns {Promise<Object>} Thông tin đơn hàng
   */
  async trackOrder(orderCode, trackingToken) {
    try {
      // Lấy order_id từ order_code (format: PHUC-BUY-2402030001)
      const order_id = orderCode.replace("PHUC-BUY-", "ORD");

      // Lấy thông tin đơn hàng từ database
      const orderData = await buyOrderService.getByOrderId(order_id);

      if (!orderData) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Không tìm thấy đơn hàng với mã này",
        );
      }

      // Trả về thông tin đơn hàng
      return {
        order_id: orderData.order_id,
        order_code: orderData.order_code,
        customer_info: orderData.customer_info,
        items: orderData.items,
        subtotal_amount: orderData.subtotal_amount,
        shipping_fee: orderData.shipping_fee,
        total_amount: orderData.total_amount,
        payment_method: orderData.payment_method,
        payment_status: orderData.payment_status,
        order_status: orderData.order_status,
        order_status_display: this.translateOrderStatus(orderData.order_status),
        shipping_provider: orderData.shipping_provider,
        tracking_code: orderData.tracking_code,
        note: orderData.note,
        created_at: orderData.created_at,
        updated_at: orderData.updated_at,
      };
    } catch (error) {
      console.error("❌ Error tracking order:", error);
      throw error;
    }
  }
}

export default new QuickOrderService();
