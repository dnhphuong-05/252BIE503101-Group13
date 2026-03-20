import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    const smtpHost = process.env.MAIL_HOST || process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = Number(process.env.MAIL_PORT || process.env.SMTP_PORT || 587);
    const smtpUser =
      process.env.MAIL_USER ||
      process.env.SMTP_USER ||
      process.env.EMAIL_USER ||
      this.extractEmailAddress(process.env.MAIL_FROM || process.env.EMAIL_FROM);
    const smtpPass =
      process.env.MAIL_PASSWORD ||
      process.env.SMTP_PASSWORD ||
      process.env.EMAIL_PASSWORD;

    this.smtpUser = smtpUser;
    this.smtpPass = smtpPass;

    this.mailFromRaw =
      process.env.MAIL_FROM ||
      process.env.EMAIL_FROM ||
      smtpUser ||
      "no-reply@phuc.local";
    this.mailFromAddress = this.extractEmailAddress(this.mailFromRaw);

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  extractEmailAddress(raw) {
    if (!raw) return "";
    const text = String(raw).trim();
    const match = text.match(/<([^>]+)>/);
    if (match && match[1]) return match[1].trim();
    return text;
  }

  buildFrom(displayName) {
    const address = this.mailFromAddress || this.smtpUser || "no-reply@phuc.local";
    return `"${displayName}" <${address}>`;
  }

  loadTemplate(templateName) {
    const templatePath = path.join(
      __dirname,
      "../../templates/email",
      `${templateName}.html`,
    );
    return fs.readFileSync(templatePath, "utf8");
  }

  replacePlaceholders(template, data) {
    let html = template;
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      html = html.replace(new RegExp(placeholder, "g"), value || "");
    }
    return html;
  }

  escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }

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
            <br>So luong: x${item.quantity}
          </div>
          <div class="product-price">${this.formatCurrency(item.price * item.quantity)}</div>
        </div>
      </div>
    `,
      )
      .join("");
  }

  async sendOrderConfirmation(orderData) {
    try {
      if (!orderData?.customer?.email) {
        return { success: false, error: "Customer email is missing" };
      }

      const template = this.loadTemplate("order-confirmation");
      const data = {
        ORDER_CODE: orderData.orderCode,
        ORDER_STATUS: orderData.status || "Cho xac nhan",
        CUSTOMER_NAME: orderData.customer.full_name,
        CUSTOMER_PHONE: orderData.customer.phone,
        CUSTOMER_EMAIL: orderData.customer.email || "Khong co",
        SHIPPING_ADDRESS: orderData.customer.full_address,
        ORDER_ITEMS: this.generateOrderItemsHTML(orderData.items),
        SUBTOTAL: this.formatCurrency(orderData.subtotal),
        SHIPPING_FEE: this.formatCurrency(orderData.shippingFee || 0),
        TOTAL_AMOUNT: this.formatCurrency(orderData.total),
        TRACKING_URL: orderData.trackingUrl,
        ORDER_DATE: new Date().toLocaleDateString("vi-VN"),
      };

      const html = this.replacePlaceholders(template, data);
      const info = await this.transporter.sendMail({
        from: this.buildFrom("PHUC - Viet Phuc Truyen Thong"),
        to: orderData.customer.email,
        subject: `Xac nhan don hang ${orderData.orderCode} - PHUC`,
        html,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error("Error sending order confirmation email:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendRegisterInvitation(inviteData) {
    try {
      if (!this.smtpUser || !this.smtpPass) {
        return {
          success: false,
          error:
            "Thiếu cấu hình SMTP (username/password). Vui lòng kiểm tra biến MAIL_* hoặc SMTP_* trong file .env",
        };
      }

      if (!inviteData?.email) {
        return {
          success: false,
          error: "Email người nhận không hợp lệ",
        };
      }

      const fullName = this.escapeHtml(inviteData.fullName || "Bạn");
      const phone = this.escapeHtml(inviteData.phone || "Chưa cập nhật");
      const guestId = this.escapeHtml(inviteData.guestId || "-");
      const invitedBy = this.escapeHtml(inviteData.invitedBy || "Admin");
      const registerUrl = inviteData.registerUrl || "";

      const html = `
        <!doctype html>
        <html lang="vi">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Lời mời đăng ký</title>
          </head>
          <body style="margin:0; padding:0; background:#f8f8f8; font-family: Arial, sans-serif; color:#111827;">
            <div style="max-width:640px; margin:0 auto; padding:24px;">
              <div style="background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; padding:24px;">
                <h2 style="margin:0 0 12px; color:#8b1538;">Lời mời đăng ký tài khoản PHUC</h2>
                <p style="margin:0 0 12px;">Xin chào <strong>${fullName}</strong>,</p>
                <p style="margin:0 0 12px;">
                  PHUC xin mời bạn tạo tài khoản để theo dõi đơn hàng nhanh hơn và nhận ưu đãi thành viên.
                </p>

                <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:12px 16px; margin:16px 0;">
                  <div><strong>Email:</strong> ${this.escapeHtml(inviteData.email)}</div>
                  <div><strong>Số điện thoại:</strong> ${phone}</div>
                  <div><strong>Mã guest:</strong> ${guestId}</div>
                  <div><strong>Người mời:</strong> ${invitedBy}</div>
                </div>

                <p style="margin:0 0 16px;">Bấm nút bên dưới để đăng ký:</p>
                <a
                  href="${registerUrl}"
                  style="display:inline-block; padding:10px 18px; background:#8b1538; color:#ffffff; text-decoration:none; border-radius:999px; font-weight:600;"
                >
                  Đăng ký tài khoản
                </a>

                <p style="margin:16px 0 0; color:#6b7280; font-size:13px;">
                  Nếu nút không hoạt động, vui lòng copy link này vào trình duyệt:<br/>
                  <span>${this.escapeHtml(registerUrl)}</span>
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      const info = await this.transporter.sendMail({
        from: this.buildFrom("PHUC - Viet Phuc Truyen Thong"),
        to: inviteData.email,
        subject: "Lời mời đăng ký tài khoản PHUC",
        html,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error("Error sending register invitation email:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendNewOrderNotificationToAdmin(orderData) {
    try {
      const html = `
        <h2>Don hang moi: ${orderData.orderCode}</h2>
        <p><strong>Khach hang:</strong> ${orderData.customer.full_name}</p>
        <p><strong>So dien thoai:</strong> ${orderData.customer.phone}</p>
        <p><strong>Email:</strong> ${orderData.customer.email || "Khong co"}</p>
        <p><strong>Dia chi:</strong> ${orderData.customer.full_address}</p>
        <p><strong>Tong tien:</strong> ${this.formatCurrency(orderData.total)}</p>
        <hr>
        <h3>San pham:</h3>
        ${orderData.items
          .map(
            (item) => `
          <p>- ${item.name} x${item.quantity}: ${this.formatCurrency(item.price * item.quantity)}</p>
        `,
          )
          .join("")}
      `;

      const info = await this.transporter.sendMail({
        from: this.buildFrom("PHUC System"),
        to:
          process.env.ADMIN_EMAIL ||
          this.smtpUser ||
          this.mailFromAddress ||
          "no-reply@phuc.local",
        subject: `Don hang moi ${orderData.orderCode}`,
        html,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error("Error sending admin notification:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new EmailService();
