import mongoose from "mongoose";

const blogPostSchema = new mongoose.Schema(
  {
    blog_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    excerpt: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    category_id: {
      type: Number,
      required: true,
      index: true,
    },
    author: {
      name: String,
      avatar: String,
      bio: String,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    tags: [String],
    views: {
      type: Number,
      default: 0,
    },
    reading_time: {
      type: Number,
      default: 5,
    },
    is_featured: {
      type: Boolean,
      default: false,
    },
    is_published: {
      type: Boolean,
      default: true,
      index: true,
    },
    is_archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    published_at: {
      type: Date,
      default: Date.now,
    },
    seo: {
      meta_title: String,
      meta_description: String,
      meta_keywords: [String],
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    collection: "blog_posts",
  },
);

// Indexes
blogPostSchema.index({ title: "text", excerpt: "text", content: "text" });
blogPostSchema.index({ category_id: 1, is_published: 1, is_archived: 1 });
blogPostSchema.index({ created_at: -1 });
blogPostSchema.index({ views: -1 });

// Methods
blogPostSchema.methods.incrementViews = async function () {
  this.views += 1;
  return this.save();
};

export default mongoose.model("BlogPost", blogPostSchema);
