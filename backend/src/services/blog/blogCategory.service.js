import BaseService from "../BaseService.js";
import BlogCategory from "../../models/blog/BlogCategory.js";

class BlogCategoryService extends BaseService {
  constructor() {
    super(BlogCategory);
  }

  /**
   * Get active categories
   */
  async getActive(options = {}) {
    return await this.getAll(
      { is_active: true },
      { ...options, sort: "display_order" },
    );
  }

  /**
   * Get category by slug
   */
  async getBySlug(slug) {
    return await this.getOne({ slug, is_active: true });
  }

  /**
   * Update post count
   */
  async updatePostCount(categoryId, increment = 1) {
    await this.model.findOneAndUpdate(
      { id: categoryId },
      { $inc: { post_count: increment } },
    );
  }
}

export default new BlogCategoryService();
