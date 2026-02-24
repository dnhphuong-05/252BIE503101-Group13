// Central export for all config
import config from "./env.js";
import connectDB from "./db.js";
import cloudinary, { uploadAvatar, uploadProductImages, uploadBlogImages, deleteImage } from "./cloudinary.js";

export { config, connectDB, cloudinary, uploadAvatar, uploadProductImages, uploadBlogImages, deleteImage };

export default {
  config,
  connectDB,
  cloudinary,
  uploadAvatar,
  uploadProductImages,
  uploadBlogImages,
  deleteImage,
};
