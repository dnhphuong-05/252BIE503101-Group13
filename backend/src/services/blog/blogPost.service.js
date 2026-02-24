import mongoose from "mongoose";
import BaseService from "../BaseService.js";
import BlogPost from "../../models/blog/BlogPost.js";
import ApiError from "../../utils/ApiError.js";

class BlogPostService extends BaseService {
  constructor() {
    super(BlogPost);
  }

  resolveIdFilter(id) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      return { _id: id };
    }
    if (!Number.isNaN(Number(id))) {
      return { blog_id: Number(id) };
    }
    return { slug: id };
  }

  async getById(id, options = {}) {
    const { select = "", populate = "" } = options;
    let query = this.model.findOne(this.resolveIdFilter(id));

    if (select) {
      query = query.select(select);
    }
    if (populate) {
      query = query.populate(populate);
    }

    const item = await query.lean();
    if (!item) {
      throw ApiError.notFound(`Post not found with id: ${id}`);
    }
    return item;
  }

  async update(id, data) {
    const item = await this.model
      .findOneAndUpdate(this.resolveIdFilter(id), { $set: data }, { new: true, runValidators: true })
      .lean();

    if (!item) {
      throw ApiError.notFound(`Post not found with id: ${id}`);
    }
    return item;
  }

  async delete(id) {
    const item = await this.model.findOneAndDelete(this.resolveIdFilter(id)).lean();
    if (!item) {
      throw ApiError.notFound(`Post not found with id: ${id}`);
    }
    return item;
  }

  /**
   * Get published posts
   */
  async getPublished(options = {}) {
    const { categoryId, ...rest } = options;
    const filters = { is_published: true, is_archived: { $ne: true } };

    if (categoryId) {
      filters.category_id = Number(categoryId);
    }

    return await this.getAll(filters, rest);
  }

  /**
   * Get featured posts
   */
  async getFeatured(limit = 5) {
    const items = await this.model
      .find({ is_published: true, is_featured: true, is_archived: { $ne: true } })
      .sort("-created_at")
      .limit(limit)
      .lean();

    return { items };
  }

  /**
   * Get posts by category
   */
  async getByCategory(categoryId, options = {}) {
    return await this.getAll(
      { category_id: categoryId, is_published: true, is_archived: { $ne: true } },
      options,
    );
  }

  /**
   * Get post by slug
   */
  async getBySlug(slug) {
    return await this.getOne({ slug, is_published: true, is_archived: { $ne: true } });
  }

  /**
   * Search posts
   */
  async search(keyword, options = {}) {
    const filters = {
      is_published: true,
      is_archived: { $ne: true },
      $text: { $search: keyword },
    };

    return await this.getAll(filters, {
      ...options,
      sort: { score: { $meta: "textScore" } },
    });
  }

  /**
   * Increment view count
   */
  async incrementViews(id) {
    // Try to find by MongoDB _id first, then by blog_id
    let post = await this.model.findById(id).catch(() => null);
    
    // If not found by _id, try to find by blog_id
    if (!post) {
      post = await this.model.findOne({ blog_id: parseInt(id) });
    }
    
    if (post) {
      await post.incrementViews();
    }
    return post;
  }

  /**
   * Get popular posts
   */
  async getPopular(limit = 10) {
    const items = await this.model
      .find({ is_published: true, is_archived: { $ne: true } })
      .sort("-views")
      .limit(limit)
      .lean();

    return { items };
  }

  /**
   * Get recent posts
   */
  async getRecent(limit = 10) {
    const items = await this.model
      .find({ is_published: true, is_archived: { $ne: true } })
      .sort("-created_at")
      .limit(limit)
      .lean();

    return { items };
  }
}

export default new BlogPostService();
