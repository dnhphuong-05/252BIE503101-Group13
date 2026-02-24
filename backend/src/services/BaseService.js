import ApiError from "../utils/ApiError.js";

/**
 * Base Service Class
 * Provides common CRUD operations for all services
 * Follows DRY principle and consistent API patterns
 */
class BaseService {
  constructor(model) {
    this.model = model;
  }

  /**
   * Get all items with pagination, filtering, and sorting
   * @param {Object} filters - Query filters
   * @param {Object} options - Pagination and sorting options
   * @returns {Object} Paginated results
   */
  async getAll(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 10,
      sort = "-created_at",
      select = "",
      populate = "",
    } = options;

    const skip = (page - 1) * limit;

    // Build query
    let query = this.model.find(filters);

    // Apply select
    if (select) {
      query = query.select(select);
    }

    // Apply populate
    if (populate) {
      query = query.populate(populate);
    }

    // Apply sorting
    query = query.sort(sort);

    // Execute query with pagination
    const [items, total] = await Promise.all([
      query.skip(skip).limit(limit).lean(),
      this.model.countDocuments(filters),
    ]);

    return {
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single item by ID
   * @param {String} id - Item ID
   * @param {Object} options - Query options
   * @returns {Object} Item
   */
  async getById(id, options = {}) {
    const { select = "", populate = "" } = options;

    let query = this.model.findById(id);

    if (select) {
      query = query.select(select);
    }

    if (populate) {
      query = query.populate(populate);
    }

    const item = await query.lean();

    if (!item) {
      throw ApiError.notFound(`Item not found with id: ${id}`);
    }

    return item;
  }

  /**
   * Get single item by field
   * @param {Object} field - Field to search
   * @param {Object} options - Query options
   * @returns {Object} Item
   */
  async getOne(field, options = {}) {
    const { select = "", populate = "" } = options;

    let query = this.model.findOne(field);

    if (select) {
      query = query.select(select);
    }

    if (populate) {
      query = query.populate(populate);
    }

    const item = await query.lean();

    if (!item) {
      throw ApiError.notFound("Item not found");
    }

    return item;
  }

  /**
   * Create new item
   * @param {Object} data - Item data
   * @returns {Object} Created item
   */
  async create(data) {
    const item = await this.model.create(data);
    return item.toObject();
  }

  /**
   * Update item by ID
   * @param {String} id - Item ID
   * @param {Object} data - Update data
   * @returns {Object} Updated item
   */
  async update(id, data) {
    const item = await this.model
      .findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      .lean();

    if (!item) {
      throw ApiError.notFound(`Item not found with id: ${id}`);
    }

    return item;
  }

  /**
   * Delete item by ID
   * @param {String} id - Item ID
   * @returns {Object} Deleted item
   */
  async delete(id) {
    const item = await this.model.findByIdAndDelete(id).lean();

    if (!item) {
      throw ApiError.notFound(`Item not found with id: ${id}`);
    }

    return item;
  }

  /**
   * Count items
   * @param {Object} filters - Query filters
   * @returns {Number} Count
   */
  async count(filters = {}) {
    return await this.model.countDocuments(filters);
  }

  /**
   * Check if item exists
   * @param {Object} field - Field to check
   * @returns {Boolean} Exists
   */
  async exists(field) {
    const count = await this.model.countDocuments(field);
    return count > 0;
  }

  /**
   * Bulk create items
   * @param {Array} items - Array of items
   * @returns {Array} Created items
   */
  async bulkCreate(items) {
    return await this.model.insertMany(items);
  }

  /**
   * Bulk update items
   * @param {Array} updates - Array of updates {filter, update}
   * @returns {Object} Bulk write result
   */
  async bulkUpdate(updates) {
    const operations = updates.map((update) => ({
      updateOne: {
        filter: update.filter,
        update: { $set: update.update },
      },
    }));

    return await this.model.bulkWrite(operations);
  }
}

export default BaseService;
