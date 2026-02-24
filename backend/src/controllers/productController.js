import Product from '../models/Product.js';

// @desc    Get all products with pagination and filters
// @route   GET /api/products
// @access  Public
export const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search = '',
      category = '',
      category_id = '',
      minPrice = 0,
      maxPrice = 999999999,
      status = 'active',
      colors = '',
      sizes = '',
      gender = '',
    } = req.query;

    // Build filter query
    const filter = { status };

    // Category filter
    if (category) {
      filter.category_name = new RegExp(category, 'i');
    }
    if (category_id) {
      filter.category_id = parseInt(category_id);
    }

    // Price range filter
    filter.price_buy = { $gte: Number(minPrice), $lte: Number(maxPrice) };

    // Search filter
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') },
      ];
    }

    // Color filter
    if (colors) {
      const colorArray = colors.split(',').map((c) => c.trim());
      filter['attributes.colors'] = { $in: colorArray };
    }

    // Size filter
    if (sizes) {
      const sizeArray = sizes.split(',').map((s) => s.trim());
      filter['attributes.sizes'] = { $in: sizeArray };
    }

    // Gender filter
    if (gender) {
      filter.gender = gender;
    }

    // Sorting
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get total count
    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error in getAllProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách sản phẩm',
      error: error.message,
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ID is product_id (number) or slug (string)
    const filter = isNaN(id)
      ? { slug: id }
      : { product_id: parseInt(id) };

    const product = await Product.findOne(filter).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    // Increment view count
    await Product.updateOne(filter, { $inc: { view_count: 1 } });

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('❌ Error in getProductById:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin sản phẩm',
      error: error.message,
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Get the highest product_id and increment
    const lastProduct = await Product.findOne()
      .sort({ product_id: -1 })
      .lean();
    const newProductId = lastProduct ? lastProduct.product_id + 1 : 1;

    // Create slug from name
    const slug =
      productData.slug ||
      productData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

    const product = await Product.create({
      ...productData,
      product_id: newProductId,
      slug,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'Tạo sản phẩm thành công',
      data: product,
    });
  } catch (error) {
    console.error('❌ Error in createProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo sản phẩm',
      error: error.message,
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    const filter = isNaN(id)
      ? { slug: id }
      : { product_id: parseInt(id) };

    const product = await Product.findOneAndUpdate(
      filter,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data: product,
    });
  } catch (error) {
    console.error('❌ Error in updateProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật sản phẩm',
      error: error.message,
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const filter = isNaN(id)
      ? { slug: id }
      : { product_id: parseInt(id) };

    const product = await Product.findOneAndDelete(filter);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Xóa sản phẩm thành công',
      data: product,
    });
  } catch (error) {
    console.error('❌ Error in deleteProduct:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa sản phẩm',
      error: error.message,
    });
  }
};

// @desc    Get featured/popular products
// @route   GET /api/products/featured
// @access  Public
export const getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const products = await Product.find({ status: 'active' })
      .sort({ rating_average: -1, view_count: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('❌ Error in getFeaturedProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy sản phẩm nổi bật',
      error: error.message,
    });
  }
};
