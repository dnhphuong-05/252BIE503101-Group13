import BlogComment from "../../models/blog/BlogComment.js";
import BlogPost from "../../models/blog/BlogPost.js";
import ProductReview from "../../models/ProductReview.js";
import blogCommentService from "../../services/blog/blogComment.service.js";
import catchAsync from "../../utils/catchAsync.js";
import ApiError from "../../utils/ApiError.js";
import { successResponse, createdResponse } from "../../utils/response.js";

const normalizeStatus = (status) => status || "approved";

const buildStatusFilter = (status) => {
  if (!status) return {};
  if (status === "approved") {
    return { $or: [{ status: "approved" }, { status: { $exists: false } }] };
  }
  return { status };
};

const buildSearchFilter = (search, fields = []) => {
  if (!search) return {};
  const regex = new RegExp(search, "i");
  return {
    $or: fields.map((field) => ({ [field]: regex })),
  };
};

const mapBlogReply = (reply) => {
  if (!reply) return null;
  return {
    content: reply.comment,
    respondedAt: reply.updated_at || reply.created_at,
    responderId: reply.user_id || reply.guest_id || null,
    responderName: reply.user_name || "Admin",
    responderRole: reply.is_author_reply ? "admin" : null,
  };
};

const mapBlogComment = (comment, blogTitleMap, reply = null) => ({
  id: `blog:${comment.comments_id || comment.id}`,
  type: "blog",
  userId: comment.user_id || comment.guest_id || "",
  userName: comment.user_name || "Guest",
  userAvatar: null,
  content: comment.comment,
  rating: undefined,
  productId: undefined,
  productName: undefined,
  blogPostId: String(comment.blog_id),
  blogTitle: blogTitleMap.get(comment.blog_id) || comment.blog_slug || "Blog",
  status: normalizeStatus(comment.status),
  createdAt: comment.created_at,
  updatedAt: comment.updated_at || comment.created_at,
  reply: mapBlogReply(reply),
});

const mapProductReview = (review) => ({
  id: `product:${review.id}`,
  type: "product",
  userId: review.user_id || "",
  userName: review.user_name || "Guest",
  userAvatar: null,
  content: review.comment || "",
  rating: review.rating,
  productId: String(review.product_id),
  productName: review.product_name || "Sản phẩm",
  blogPostId: undefined,
  blogTitle: undefined,
    status: normalizeStatus(review.status),
    createdAt: review.created_at,
    updatedAt: review.updated_at || review.created_at,
    reply:
      review?.seller_response?.content
        ? {
            content: review.seller_response.content,
            respondedAt: review.seller_response.responded_at || null,
            responderId: review.seller_response.responder_id || null,
            responderName: review.seller_response.responder_name || null,
            responderRole: review.seller_response.responder_role || null,
          }
        : null,
  });

const parseCompositeId = (raw) => {
  if (!raw || typeof raw !== "string") {
    return { type: null, id: raw };
  }
  const [type, id] = raw.split(":", 2);
  if (type === "blog" || type === "product") {
    return { type, id };
  }
  return { type: null, id: raw };
};

const pickReply = (current, next) => {
  if (!current) return next;
  const currentIsAuthor = !!current.is_author_reply;
  const nextIsAuthor = !!next.is_author_reply;
  if (nextIsAuthor && !currentIsAuthor) return next;
  if (currentIsAuthor && !nextIsAuthor) return current;
  const currentTime = new Date(current.updated_at || current.created_at || 0).getTime();
  const nextTime = new Date(next.updated_at || next.created_at || 0).getTime();
  return nextTime >= currentTime ? next : current;
};

const buildReplyMap = (replies = []) => {
  const replyMap = new Map();
  replies.forEach((reply) => {
    if (reply?.parent_id == null) return;
    const key = String(reply.parent_id);
    const existing = replyMap.get(key);
    replyMap.set(key, pickReply(existing, reply));
  });
  return replyMap;
};

export const getAdminComments = catchAsync(async (req, res) => {
  const { type, status, search } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
  const skip = (page - 1) * limit;

  const blogFilter = {
    ...buildStatusFilter(status),
    ...buildSearchFilter(search, ["comment", "user_name"]),
  };

  const productFilter = {
    ...buildStatusFilter(status),
    ...buildSearchFilter(search, ["comment", "user_name", "product_name"]),
  };

  let comments = [];
  let total = 0;

  if (type === "blog") {
    const rootBlogFilter = {
      ...blogFilter,
      parent_id: { $in: [null, ""] },
    };

    const [items, count] = await Promise.all([
      BlogComment.find(rootBlogFilter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BlogComment.countDocuments(rootBlogFilter),
    ]);

    const blogIds = [...new Set(items.map((item) => item.blog_id))];
    const blogPosts = await BlogPost.find({ blog_id: { $in: blogIds } })
      .select("blog_id title")
      .lean();
    const blogTitleMap = new Map(
      blogPosts.map((post) => [post.blog_id, post.title]),
    );

    const parentIds = [];
    items.forEach((item) => {
      if (item.comments_id) parentIds.push(item.comments_id);
      if (item.id != null) parentIds.push(String(item.id));
    });
    const replies = parentIds.length
      ? await BlogComment.find({ parent_id: { $in: parentIds } }).sort({ created_at: 1 }).lean()
      : [];
    const replyMap = buildReplyMap(replies);

    comments = items.map((item) =>
      mapBlogComment(
        item,
        blogTitleMap,
        replyMap.get(String(item.comments_id)) || replyMap.get(String(item.id)),
      ),
    );
    total = count;
  } else if (type === "product") {
    const [items, count] = await Promise.all([
      ProductReview.find(productFilter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductReview.countDocuments(productFilter),
    ]);

    comments = items.map(mapProductReview);
    total = count;
  } else {
    const fetchLimit = skip + limit;

    const rootBlogFilter = {
      ...blogFilter,
      parent_id: { $in: [null, ""] },
    };

    const [blogItems, productItems, blogCount, productCount] = await Promise.all([
      BlogComment.find(rootBlogFilter).sort({ created_at: -1 }).limit(fetchLimit).lean(),
      ProductReview.find(productFilter).sort({ created_at: -1 }).limit(fetchLimit).lean(),
      BlogComment.countDocuments(rootBlogFilter),
      ProductReview.countDocuments(productFilter),
    ]);

    const blogIds = [...new Set(blogItems.map((item) => item.blog_id))];
    const blogPosts = await BlogPost.find({ blog_id: { $in: blogIds } })
      .select("blog_id title")
      .lean();
    const blogTitleMap = new Map(
      blogPosts.map((post) => [post.blog_id, post.title]),
    );

    const parentIds = [];
    blogItems.forEach((item) => {
      if (item.comments_id) parentIds.push(item.comments_id);
      if (item.id != null) parentIds.push(String(item.id));
    });
    const replies = parentIds.length
      ? await BlogComment.find({ parent_id: { $in: parentIds } }).sort({ created_at: 1 }).lean()
      : [];
    const replyMap = buildReplyMap(replies);

    const merged = [
      ...blogItems.map((item) =>
        mapBlogComment(
          item,
          blogTitleMap,
          replyMap.get(String(item.comments_id)) || replyMap.get(String(item.id)),
        ),
      ),
      ...productItems.map(mapProductReview),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    comments = merged.slice(skip, skip + limit);
    total = blogCount + productCount;
  }

  successResponse(res, {
    comments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

const updateCommentStatus = async (id, status) => {
  const { type, id: rawId } = parseCompositeId(id);

  if (type === "blog") {
    const updated = await BlogComment.findOneAndUpdate(
      { comments_id: rawId },
      { status, updated_at: new Date() },
      { new: true },
    ).lean();

    if (!updated) {
      throw ApiError.notFound("Comment not found");
    }
    return { type, comment: updated };
  }

  if (type === "product") {
    const updated = await ProductReview.findOneAndUpdate(
      { id: rawId },
      { status },
      { new: true },
    ).lean();

    if (!updated) {
      throw ApiError.notFound("Comment not found");
    }
    return { type, comment: updated };
  }

  throw ApiError.badRequest("Invalid comment id");
};

export const approveComment = catchAsync(async (req, res) => {
  await updateCommentStatus(req.params.id, "approved");
  successResponse(res, { id: req.params.id });
});

export const markAsSpam = catchAsync(async (req, res) => {
  await updateCommentStatus(req.params.id, "spam");
  successResponse(res, { id: req.params.id });
});

export const rejectComment = catchAsync(async (req, res) => {
  const { type, id: rawId } = parseCompositeId(req.params.id);

  if (type === "blog") {
    const result = await BlogComment.deleteOne({ comments_id: rawId });
    if (!result.deletedCount) {
      throw ApiError.notFound("Comment not found");
    }
    return successResponse(res, { id: req.params.id });
  }

  if (type === "product") {
    const result = await ProductReview.deleteOne({ id: rawId });
    if (!result.deletedCount) {
      throw ApiError.notFound("Comment not found");
    }
    return successResponse(res, { id: req.params.id });
  }

  throw ApiError.badRequest("Invalid comment id");
});

export const deleteComment = catchAsync(async (req, res) => {
  const { type, id: rawId } = parseCompositeId(req.params.id);

  if (type === "blog") {
    const result = await BlogComment.deleteOne({ comments_id: rawId });
    if (!result.deletedCount) {
      throw ApiError.notFound("Comment not found");
    }
    return successResponse(res, { id: req.params.id });
  }

  if (type === "product") {
    const result = await ProductReview.deleteOne({ id: rawId });
    if (!result.deletedCount) {
      throw ApiError.notFound("Comment not found");
    }
    return successResponse(res, { id: req.params.id });
  }

  throw ApiError.badRequest("Invalid comment id");
});

export const replyComment = catchAsync(async (req, res) => {
  const { type, id: rawId } = parseCompositeId(req.params.id);
  const { content } = req.body;

  if (!content || typeof content !== "string" || !content.trim()) {
    throw ApiError.badRequest("Reply content is required");
  }

  if (type === "blog") {
    const parent = await BlogComment.findOne({ comments_id: rawId }).lean();
    if (!parent) {
      throw ApiError.notFound("Comment not found");
    }

    const reply = await blogCommentService.createComment(
      {
        blog_id: parent.blog_id,
        blog_slug: parent.blog_slug,
        comment: content.trim(),
        parent_id: parent.comments_id,
        is_author_reply: true,
      },
      req.user,
    );

    return createdResponse(res, reply, "Reply created successfully");
  }

  if (type === "product") {
    const responderName =
      req.user?.name || req.user?.email || req.user?.user_id || "Admin";
    const responderId = req.user?.user_id || req.user?._id || "";

    const updated = await ProductReview.findOneAndUpdate(
      { id: rawId },
      {
        seller_response: {
          content: content.trim(),
          responded_at: new Date().toISOString(),
          responder_id: String(responderId),
          responder_name: responderName,
          responder_role: req.user?.role || "staff",
        },
        updated_at: new Date().toISOString(),
      },
      { new: true },
    ).lean();

    if (!updated) {
      throw ApiError.notFound("Comment not found");
    }

    return createdResponse(res, updated, "Reply created successfully");
  }

  throw ApiError.badRequest("Invalid comment id");
});
