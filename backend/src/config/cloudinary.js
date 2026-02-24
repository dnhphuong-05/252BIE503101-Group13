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
