import mongoose from "mongoose";

const blogCommentSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    comment_seq: {
      type: Number,
      required: true,
      index: true,
    },
    comments_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    blog_id: {
      type: Number,
      required: true,
      index: true,
    },
    blog_slug: {
      type: String,
      required: true,
      index: true,
    },
    parent_id: {
      type: String,
      default: null,
      index: true,
    },
    user_id: {
      type: String,
      default: null,
      index: true,
    },
    guest_id: {
      type: String,
      default: null,
      index: true,
    },
    user_name: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    images: [String],
    is_author_reply: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "spam"],
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: "blog_comments",
  },
);

// Indexes
blogCommentSchema.index({ blog_id: 1, parent_id: 1 });
blogCommentSchema.index({ blog_id: 1, comment_seq: -1 });
blogCommentSchema.index({ created_at: -1 });

blogCommentSchema.pre("save", function (next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.model("BlogComment", blogCommentSchema);
