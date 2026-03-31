import BaseService from "../BaseService.js";
import BlogComment from "../../models/blog/BlogComment.js";
import BlogPost from "../../models/blog/BlogPost.js";
import GuestCustomer from "../../models/GuestCustomer.js";
import UserProfile from "../../models/user/UserProfile.js";
import ApiError from "../../utils/ApiError.js";

const buildCommentsId = (blogId, commentId) => `bc_${blogId}_${commentId}`;
const PUBLIC_COMMENT_FILTER = {
  $or: [{ status: "approved" }, { status: { $exists: false } }],
};

const getCommentKey = (comment) => {
  if (!comment) return null;
  if (comment.comments_id) return comment.comments_id;
  if (comment.blog_id !== undefined && comment.id !== undefined) {
    return buildCommentsId(comment.blog_id, comment.id);
  }
  return comment._id ? String(comment._id) : null;
};

const normalizeParentId = (parentId, blogId) => {
  if (parentId === null || parentId === undefined || parentId === "") {
    return null;
  }

  if (typeof parentId === "string") {
    if (/^\d+$/.test(parentId)) {
      return blogId ? buildCommentsId(blogId, parentId) : parentId;
    }
    return parentId;
  }

  if (typeof parentId === "number") {
    return blogId ? buildCommentsId(blogId, parentId) : String(parentId);
  }

  return null;
};

class BlogCommentService extends BaseService {
  constructor() {
    super(BlogComment);
  }

  /**
   * Get comments by blog ID
   * @param {Number} blogId - Blog ID
   * @param {Object} options - Query options
   * @param {Boolean} options.includeReplies - If true, return all comments including replies
   */
  async getByBlogId(blogId, options = {}) {
    const {
      includeReplies = false,
      publicOnly = true,
      ...queryOptions
    } = options;
    const visibilityFilter = publicOnly ? PUBLIC_COMMENT_FILTER : {};

    // If includeReplies is true, get all comments (root + replies)
    if (includeReplies) {
      const result = await this.getAll(
        { blog_id: blogId, ...visibilityFilter },
        queryOptions,
      );

      // Public payload may include approved replies whose parent is still pending.
      // Include those non-spam parent comments to avoid orphaned replies on UI.
      if (publicOnly && Array.isArray(result.items) && result.items.length > 0) {
        const knownKeys = new Set(result.items.map(getCommentKey).filter(Boolean));
        const missingParentIds = Array.from(
          new Set(
            result.items
              .map((item) => normalizeParentId(item.parent_id, blogId))
              .filter(
                (parentId) =>
                  typeof parentId === "string" &&
                  parentId.startsWith("bc_") &&
                  !knownKeys.has(parentId),
              ),
          ),
        );

        if (missingParentIds.length > 0) {
          const missingParents = await this.model
            .find({
              blog_id: blogId,
              comments_id: { $in: missingParentIds },
              status: { $ne: "spam" },
            })
            .lean();

          if (missingParents.length > 0) {
            const merged = new Map();
            [...result.items, ...missingParents].forEach((item) => {
              const key = getCommentKey(item);
              if (key && !merged.has(key)) {
                merged.set(key, item);
              }
            });

            result.items = Array.from(merged.values()).sort(
              (a, b) =>
                new Date(b.created_at || 0).getTime() -
                new Date(a.created_at || 0).getTime(),
            );
          }
        }
      }

      return result;
    }

    // Otherwise, only get root comments (parent_id = null)
    return await this.getAll(
      { blog_id: blogId, parent_id: null, ...visibilityFilter },
      queryOptions,
    );
  }

  /**
   * Get replies for a comment
   */
  async getReplies(parentId, options = {}) {
    const { publicOnly = true, ...queryOptions } = options;
    let normalizedParentId = parentId;

    if (typeof parentId === "number" || /^\d+$/.test(parentId)) {
      const numericId = Number(parentId);
      const parentComment = await this.model
        .findOne({ id: numericId })
        .select("comments_id blog_id")
        .lean();

      if (parentComment?.comments_id) {
        normalizedParentId = parentComment.comments_id;
      } else if (parentComment?.blog_id) {
        normalizedParentId = buildCommentsId(parentComment.blog_id, numericId);
      }
    }

    return await this.getAll(
      {
        parent_id: normalizedParentId,
        ...(publicOnly ? PUBLIC_COMMENT_FILTER : {}),
      },
      queryOptions,
    );
  }

  /**
   * Get comments by user_id (exclude replies by default)
   */
  async getByUserId(userId, options = {}) {
    const { includeReplies = true, ...queryOptions } = options;
    const filter = { user_id: userId };

    if (!includeReplies) {
      filter.parent_id = null;
    }

    return await this.getAll(filter, queryOptions);
  }

  /**
   * Create comment
   * @param {Object} data - Comment data
   * @param {Object} user - Authenticated user object (optional)
   */
  async createComment(data, user = null) {
    const normalized = await this.normalizePayload(data, user);
    const isAuthorReply = Boolean(data?.is_author_reply || data?.isAuthorReply);
    // Get next global ID
    const lastComment = await this.model
      .findOne({ id: { $type: "number" } })
      .sort({ id: -1 })
      .lean();
    const baseId = Number.isFinite(lastComment?.id)
      ? lastComment.id + 1
      : Date.now();
    const nextId = Number.isFinite(baseId) ? baseId : Date.now();

    // Get next per-blog sequence for comments_id
    let nextSeq = 1;
    const lastSeq = await this.model
      .findOne({ blog_id: normalized.blog_id, comment_seq: { $type: "number" } })
      .sort({ comment_seq: -1 })
      .select("comment_seq")
      .lean();

    if (Number.isFinite(lastSeq?.comment_seq)) {
      nextSeq = lastSeq.comment_seq + 1;
    } else {
      const seqRegex = new RegExp(`^bc_${normalized.blog_id}_\\\\d+$`);
      const seqResult = await this.model.aggregate([
        { $match: { blog_id: normalized.blog_id, comments_id: { $regex: seqRegex } } },
        {
          $project: {
            seq: {
              $toInt: {
                $arrayElemAt: [{ $split: ["$comments_id", "_"] }, 2],
              },
            },
          },
        },
        { $sort: { seq: -1 } },
        { $limit: 1 },
      ]);
      if (Number.isFinite(seqResult?.[0]?.seq)) {
        nextSeq = seqResult[0].seq + 1;
      }
    }

    const comments_id = buildCommentsId(normalized.blog_id, nextSeq);

    return await this.create({
      ...normalized,
      id: nextId,
      comments_id,
      comment_seq: nextSeq,
      is_author_reply: isAuthorReply,
      status: isAuthorReply ? "approved" : "pending",
      created_at: new Date(),
    });
  }

  async normalizePayload(data, user = null) {
    // Determine user_name and user_id
    let user_name = data.user_name || data.userName;
    let user_id = null;
    let guest_id = null;

    if (typeof user_name === "string") {
      user_name = user_name.trim();
    }

    // If user is authenticated, always take full_name from profile
    if (user) {
      user_id = user.user_id || null;

      user_name =
        user.full_name ||
        user.fullName ||
        user.profile?.full_name ||
        user.profile?.fullName ||
        null;

      if (!user_name && user.user_id) {
        const profile = await UserProfile.findOne({
          user_id: user.user_id,
        })
          .select("full_name")
          .lean();
        user_name = profile?.full_name || null;
      }

      if (!user_name) {
        throw ApiError.badRequest(
          "Full name is required for authenticated comments",
        );
      }

      if (!user_id) {
        throw ApiError.badRequest("user_id is required for authenticated comments");
      }
    } else {
      // Guest comments require user_name and guest_id
      if (!user_name) {
        throw ApiError.badRequest("user_name is required for guest comments");
      }

      const newGuestId = await GuestCustomer.generateGuestId();
      const guestCustomer = await GuestCustomer.create({
        guest_id: newGuestId,
        full_name: user_name,
      });

      guest_id = guestCustomer.guest_id;
    }

    if (data.blog_id) {
      return {
        blog_id: data.blog_id,
        blog_slug: data.blog_slug,
        user_id: user_id,
        guest_id,
        user_name: user_name,
        comment: data.comment,
        parent_id: normalizeParentId(data.parent_id ?? null, data.blog_id),
      };
    }

    const blog_id = data.blogId;
    let blog_slug = data.blogSlug || data.blog_slug;

    if (!blog_slug && blog_id) {
      const blog = await BlogPost.findOne({ blog_id }).select("slug").lean();
      if (blog?.slug) blog_slug = blog.slug;
    }

    if (!blog_slug) {
      throw ApiError.badRequest("Missing blog_slug for comment");
    }

    return {
      blog_id,
      blog_slug,
      user_id: user_id,
      guest_id,
      user_name: user_name,
      comment: data.content,
      parent_id: normalizeParentId(data.parentId ?? null, blog_id),
    };
  }

  /**
   * Like comment
   */
  async likeComment(id) {
    const comment = await this.model
      .findOneAndUpdate({ id }, { $inc: { likes: 1 } }, { new: true })
      .lean();

    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }

    return comment;
  }

  /**
   * Get comment count for blog
   */
  async getCommentCount(blogId, options = {}) {
    const { includeReplies = false, publicOnly = true } = options;
    const filter = { blog_id: blogId };

    if (!includeReplies) {
      filter.parent_id = null;
    }

    if (publicOnly) {
      Object.assign(filter, PUBLIC_COMMENT_FILTER);
    }

    return await this.count(filter);
  }
}

export default new BlogCommentService();
