import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Product from "../../models/Product.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.assetBaseUrl = this.resolveAssetBaseUrl();
    this.smtpUser = "";
    this.smtpPass = "";
    this.mailFromRaw = "no-reply@phuc.local";
    this.mailFromAddress = "no-reply@phuc.local";
    this.smtpHost = "smtp.gmail.com";
    this.smtpPort = 587;
    this.transporter = null;
    this.refreshMailerConfig();
  }

  refreshMailerConfig() {
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

    this.smtpHost = smtpHost;
    this.smtpPort = smtpPort;
    this.smtpUser = smtpUser || "";
    this.smtpPass = smtpPass || "";
    this.mailFromRaw =
      process.env.MAIL_FROM ||
      process.env.EMAIL_FROM ||
      smtpUser ||
      "no-reply@phuc.local";
    this.mailFromAddress = this.extractEmailAddress(this.mailFromRaw);

    this.transporter = nodemailer.createTransport({
      host: this.smtpHost,
      port: this.smtpPort,
      secure: this.smtpPort === 465,
      auth: {
        user: this.smtpUser,
        pass: this.smtpPass,
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

  buildCloudinaryFetchUrl(sourceUrl, transformation = "f_auto,q_auto") {
    const source = String(sourceUrl || "").trim();
    if (!source) return "";
    const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
    if (!cloudName) return source;
    return `https://res.cloudinary.com/${cloudName}/image/fetch/${transformation}/${encodeURIComponent(source)}`;
  }

  getCloudinaryPlaceholderImageUrl() {
    const explicitPlaceholder = process.env.MAIL_IMAGE_PLACEHOLDER_URL || process.env.EMAIL_IMAGE_PLACEHOLDER_URL;
    if (explicitPlaceholder && String(explicitPlaceholder).trim()) {
      return String(explicitPlaceholder).trim();
    }

    const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
    if (!cloudName) {
      return "https://dummyimage.com/160x160/f3f4f6/9ca3af.png?text=PHUC";
    }
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_png,w_160,h_160,c_fill/vietphuc/email/product-placeholder.png`;
  }

  getHeaderIconUrl() {
    const explicitIcon = process.env.MAIL_HEADER_ICON_URL || process.env.EMAIL_HEADER_ICON_URL;
    if (explicitIcon && String(explicitIcon).trim()) {
      return String(explicitIcon).trim();
    }
    const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
    if (!cloudName) {
      return "";
    }
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_png,w_64,h_64,c_fit/vietphuc/email/fa-circle-check-white.png`;
  }

  resolveAssetBaseUrl() {
    const candidates = [
      process.env.ASSET_BASE_URL,
      process.env.BACKEND_PUBLIC_URL,
      process.env.BACKEND_URL,
      process.env.API_URL,
      process.env.FRONTEND_URL,
    ];
    const rawBase =
      candidates.find((value) => typeof value === "string" && value.trim()) ||
      "http://localhost:3000";
    return String(rawBase).trim().replace(/\/+$/, "");
  }

  pickImageValue(item) {
    const candidates = [
      item?.image,
      item?.thumbnail,
      item?.thumbnail_snapshot,
      item?.imageUrl,
      item?.image_url,
      item?.photo,
      Array.isArray(item?.images) ? item.images[0] : "",
      Array.isArray(item?.gallery) ? item.gallery[0] : "",
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
      if (typeof candidate === "object") {
        const nested = candidate.secure_url || candidate.url || candidate.path;
        if (typeof nested === "string" && nested.trim()) {
          return nested.trim();
        }
      }
    }

    return "";
  }

  resolveImageUrl(rawValue) {
    const value = String(rawValue || "").trim().replace(/\\/g, "/");
    if (!value) return "";
    if (/^(https?:|data:)/i.test(value)) return value;
    if (value.startsWith("//")) return `https:${value}`;

    const normalizedPath = value.startsWith("/") ? value : `/${value}`;
    return `${this.assetBaseUrl}${normalizedPath}`;
  }

  isLocalOrPrivateUrl(rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.toLowerCase();
      return (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        host === "0.0.0.0" ||
        host.endsWith(".local") ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
      );
    } catch (_error) {
      return true;
    }
  }

  normalizeImageForEmail(rawValue) {
    const resolved = this.resolveImageUrl(rawValue);
    if (!resolved) {
      return this.getCloudinaryPlaceholderImageUrl();
    }

    if (/res\.cloudinary\.com/i.test(resolved)) {
      return resolved;
    }

    if (this.isLocalOrPrivateUrl(resolved)) {
      return this.getCloudinaryPlaceholderImageUrl();
    }

    return resolved;
  }

  normalizeProductId(rawValue) {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async enrichItemsWithProductImages(items = []) {
    const normalizedItems = Array.isArray(items) ? items.map((item) => ({ ...item })) : [];
    const missingIds = new Set();

    for (const item of normalizedItems) {
      const hasImage = Boolean(this.pickImageValue(item));
      if (hasImage) continue;
      const id = this.normalizeProductId(item?.product_id ?? item?.productId);
      if (id !== null) {
        missingIds.add(id);
      }
    }

    if (!missingIds.size) {
      return normalizedItems;
    }

    try {
      const products = await Product.find({ product_id: { $in: [...missingIds] } })
        .select("product_id thumbnail images")
        .lean();

      const productImageMap = new Map();
      for (const product of products) {
        const imageValue = this.pickImageValue(product);
        if (imageValue) {
          productImageMap.set(Number(product.product_id), imageValue);
        }
      }

      for (const item of normalizedItems) {
        if (this.pickImageValue(item)) continue;
        const id = this.normalizeProductId(item?.product_id ?? item?.productId);
        if (id === null) continue;
        const fallbackImage = productImageMap.get(id);
        if (fallbackImage) {
          item.image = fallbackImage;
          if (!item.thumbnail) {
            item.thumbnail = fallbackImage;
          }
        }
      }
    } catch (error) {
      console.error("Error enriching email items with product images:", error);
    }

    return normalizedItems;
  }

  generateOrderItemsHTML(items = []) {
    return items
      .map((item) => {
        const safeName = this.escapeHtml(item?.name || "San pham");
        const quantity = Math.max(1, Number(item?.quantity) || 1);
        const unitPrice = Number(item?.price) || 0;
        const itemTotal = Number(item?.total);
        const lineTotal = Number.isFinite(itemTotal) ? itemTotal : unitPrice * quantity;

        const rawImage = this.pickImageValue(item);
        const imageUrl = this.normalizeImageForEmail(rawImage);
        const imageMarkup = imageUrl
          ? `<img src="${this.escapeHtml(imageUrl)}" alt="${safeName}" class="product-image" width="80" height="80">`
          : `<div class="product-image-placeholder">Anh san pham</div>`;

        const attributes =
          item?.attributes && typeof item.attributes === "object"
            ? Object.entries(item.attributes)
                .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
                .map(([key, value]) => `${this.escapeHtml(key)}: ${this.escapeHtml(value)}`)
                .join(" | ")
            : "";

        const metaLine = attributes
          ? `${attributes}<br />So luong: x${quantity}`
          : `So luong: x${quantity}`;

        return `
      <div class="product-item">
        <table class="product-table" role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td class="product-image-cell" width="96">${imageMarkup}</td>
            <td class="product-info-cell">
              <div class="product-name">${safeName}</div>
              <div class="product-meta">${metaLine}</div>
              <div class="product-price">${this.formatCurrency(lineTotal)}</div>
            </td>
          </tr>
        </table>
      </div>
    `;
      })
      .join("");
  }

  async sendOrderConfirmation(orderData) {
    try {
      this.refreshMailerConfig();
      if (!this.smtpUser || !this.smtpPass) {
        return {
          success: false,
          error: "Missing SMTP credentials (MAIL_USER/SMTP_USER and MAIL_PASSWORD/SMTP_PASSWORD)",
        };
      }

      if (!orderData?.customer?.email) {
        return { success: false, error: "Customer email is missing" };
      }

      const template = this.loadTemplate("order-confirmation");
      const enrichedItems = await this.enrichItemsWithProductImages(orderData.items || []);
      const data = {
        ORDER_CODE: orderData.orderCode,
        ORDER_STATUS: orderData.status || "Cho xac nhan",
        CUSTOMER_NAME: orderData.customer.full_name,
        CUSTOMER_PHONE: orderData.customer.phone,
        CUSTOMER_EMAIL: orderData.customer.email || "Khong co",
        SHIPPING_ADDRESS: orderData.customer.full_address,
        ORDER_ITEMS: this.generateOrderItemsHTML(enrichedItems),
        SUBTOTAL: this.formatCurrency(orderData.subtotal),
        SHIPPING_FEE: this.formatCurrency(orderData.shippingFee || 0),
        TOTAL_AMOUNT: this.formatCurrency(orderData.total),
        TRACKING_URL: orderData.trackingUrl,
        HEADER_ICON_URL: this.getHeaderIconUrl(),
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
      this.refreshMailerConfig();
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
      this.refreshMailerConfig();
      if (!this.smtpUser || !this.smtpPass) {
        return {
          success: false,
          error: "Missing SMTP credentials (MAIL_USER/SMTP_USER and MAIL_PASSWORD/SMTP_PASSWORD)",
        };
      }

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
