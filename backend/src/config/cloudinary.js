import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import config from "./env.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

// Avatar upload configuration
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "Home/vietphuc/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return `avatar-${req.user?._id || "guest"}-${uniqueSuffix}`;
    },
  },
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Định dạng file không hợp lệ. Chỉ chấp nhận jpg, jpeg, png, gif, webp",
        ),
        false,
      );
    }
  },
});

// Product images upload configuration
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "vietphuc/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

export const uploadProductImages = multer({
  storage: productStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Blog images upload configuration
const blogStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "vietphuc/blogs",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

export const uploadBlogImages = multer({
  storage: blogStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Review media upload configuration
const reviewMediaStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype?.startsWith("video/");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    return {
      folder: "vietphuc/reviews",
      resource_type: "auto",
      allowed_formats: isVideo
        ? ["mp4", "mov", "webm", "m4v"]
        : ["jpg", "jpeg", "png", "gif", "webp"],
      public_id: `review-${req.user?.user_id || req.user?._id || "guest"}-${uniqueSuffix}`,
    };
  },
});

export const uploadReviewMedia = multer({
  storage: reviewMediaStorage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 6,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-m4v",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(
      new Error(
        "Định dạng file không hợp lệ. Chỉ chấp nhận ảnh jpg, jpeg, png, gif, webp hoặc video mp4, webm, mov, m4v",
      ),
      false,
    );
  },
});

// Tailor order images upload configuration
const tailorOrderStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, _file) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    return {
      folder: "vietphuc/tailor-orders",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      public_id: `tailor-${req.user?.user_id || req.user?._id || "staff"}-${uniqueSuffix}`,
    };
  },
});

export const uploadTailorOrderImages = multer({
  storage: tailorOrderStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 12,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(
      new Error("Dinh dang file khong hop le. Chi chap nhan jpg, jpeg, png, webp"),
      false,
    );
  },
});

// Delete image from Cloudinary
export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw error;
  }
};

export default cloudinary;
