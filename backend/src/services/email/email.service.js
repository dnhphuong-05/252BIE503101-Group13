import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email Service
 *
 * @description Service để gửi email
 */

class EmailService {
  constructor() {
    // Cấu hình transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || "smtp.gmail.com",
      port: process.env.MAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  /**
   * Load email template từ file
   * @param {string} templateName - Tên template
   * @returns {string} HTML template
   */
  loadTemplate(templateName) {
    const templatePath = path.join(
      __dirname,
      "../../templates/email",
      `${templateName}.html`,
    );
    return fs.readFileSync(templatePath, "utf8");
  }

  /**
   * Thay thế placeholders trong template
   * @param {string} template - HTML template
   * @param {Object} data - Dữ liệu để thay thế
   * @returns {string} HTML đã được thay thế
   */
  replacePlaceholders(template, data) {
    let html = template;

    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      html = html.replace(new RegExp(placeholder, "g"), value || "");
    }

    return html;
  }

  /**
   * Format số tiền VND
   * @param {number} amount - Số tiền
   * @returns {string} Số tiền đã format
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }

  /**
   * Tạo HTML cho order items
   * @param {Array} items - Danh sách sản phẩm
   * @returns {string} HTML cho các sản phẩm
   */
  generateOrderItemsHTML(items) {
    return items
      .map(
        (item) => `
      <div class="product-item">
        <img src="${item.image || "https://via.placeholder.com/80"}" alt="${item.name}" class="product-image">
        <div class="product-info">
          <div class="product-name">${item.name}</div>
          <div class="product-meta">
            ${
              item.attributes
                ? Object.entries(item.attributes)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" | ")
                : ""
            }
            <br>Số lượng: x${item.quantity}
          </div>
          <div class="product-price">${this.formatCurrency(item.price * item.quantity)}</div>
        </div>
      </div>
    `,
      )
      .join("");
  }

  /**
   * Gửi email xác nhận đơn hàng
   * @param {Object} orderData - Dữ liệu đơn hàng
   * @returns {Promise} Promise kết quả gửi email
   */
  async sendOrderConfirmation(orderData) {
    try {
      // Load template
      const template = this.loadTemplate("order-confirmation");

      // Chuẩn bị dữ liệu
      const data = {
        ORDER_CODE: orderData.orderCode,
        ORDER_STATUS: orderData.status || "Chờ xác nhận",
        CUSTOMER_NAME: orderData.customer.full_name,
        CUSTOMER_PHONE: orderData.customer.phone,
        CUSTOMER_EMAIL: orderData.customer.email || "Không có",
        SHIPPING_ADDRESS: orderData.customer.full_address,
        ORDER_ITEMS: this.generateOrderItemsHTML(orderData.items),
        SUBTOTAL: this.formatCurrency(orderData.subtotal),
        SHIPPING_FEE: this.formatCurrency(orderData.shippingFee || 0),
        TOTAL_AMOUNT: this.formatCurrency(orderData.total),
        TRACKING_URL: orderData.trackingUrl,
        ORDER_DATE: new Date().toLocaleDateString("vi-VN"),
      };

      // Thay thế placeholders
      const html = this.replacePlaceholders(template, data);

      console.log(`📧 Đang gửi email đến: ${orderData.customer.email}`);

      // Gửi email
      const info = await this.transporter.sendMail({
        from: `"PHỤC - Việt Phục Truyền Thống" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
        to: orderData.customer.email,
        subject: `🎉 Xác nhận đơn hàng ${orderData.orderCode} - PHỤC`,
        html: html,
      });

      console.log(
        `✅ Email sent successfully to ${orderData.customer.email}:`,
        info.messageId,
      );
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error("❌ Error sending email:", error);
      // Không throw error để không làm gián đoạn flow đặt hàng
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Gửi email thông báo đơn hàng cho admin
   * @param {Object} orderData - Dữ liệu đơn hàng
   * @returns {Promise} Promise kết quả gửi email
   */
  async sendNewOrderNotificationToAdmin(orderData) {
    try {
      const html = `
        <h2>🛍️ Đơn hàng mới: ${orderData.orderCode}</h2>
        <p><strong>Khách hàng:</strong> ${orderData.customer.full_name}</p>
        <p><strong>Số điện thoại:</strong> ${orderData.customer.phone}</p>
        <p><strong>Email:</strong> ${orderData.customer.email || "Không có"}</p>
        <p><strong>Địa chỉ:</strong> ${orderData.customer.full_address}</p>
        <p><strong>Tổng tiền:</strong> ${this.formatCurrency(orderData.total)}</p>
        <hr>
        <h3>Sản phẩm:</h3>
        ${orderData.items
          .map(
            (item) => `
          <p>- ${item.name} x${item.quantity}: ${this.formatCurrency(item.price * item.quantity)}</p>
        `,
          )
          .join("")}
      `;

      const info = await this.transporter.sendMail({
        from: `"PHỤC System" <${process.env.MAIL_USER}>`,
        to: process.env.ADMIN_EMAIL || process.env.MAIL_USER,
        subject: `🛍️ Đơn hàng mới ${orderData.orderCode}`,
        html: html,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error("❌ Error sending admin notification:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new EmailService();
