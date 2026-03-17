import { productService } from "../services/index.js";
import {
  ApiError,
  catchAsync,
  successResponse,
  successResponseWithPagination,
} from "../utils/index.js";

/**
 * Product Controller
 */

export const getAllProducts = catchAsync(async (req, res) => {
  const result = await productService.getProducts(req.query);

  successResponseWithPagination(
    res,
    result.products,
    result.pagination,
    "Lấy danh sách sản phẩm thành công",
  );
});

export const getProductFilters = catchAsync(async (req, res) => {
  const filters = await productService.getFilterData();
  successResponse(res, filters, "Lấy bộ lọc sản phẩm thành công");
});

export const getProductById = catchAsync(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  successResponse(res, product, "Lấy thông tin sản phẩm thành công");
});

export const createProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct(req.body);
  successResponse(res, product, "Tạo sản phẩm thành công", 201);
});

export const updateProduct = catchAsync(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  successResponse(res, product, "Cập nhật sản phẩm thành công");
});

export const deleteProduct = catchAsync(async (req, res) => {
  const product = await productService.deleteProduct(req.params.id);
  successResponse(res, product, "Xóa sản phẩm thành công");
});

export const permanentDeleteProduct = catchAsync(async (req, res) => {
  const product = await productService.permanentDeleteProduct(req.params.id);
  successResponse(res, product, "Xóa vĩnh viễn sản phẩm thành công");
});

export const getRelatedProducts = catchAsync(async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 8;

  const products = await productService.getRelatedProducts(id, limit);
  const result = {
    items: products,
    pagination: {
      total: products.length,
      page: 1,
      pages: 1,
      limit,
    },
  };

  successResponse(res, result, "Lấy sản phẩm liên quan thành công");
});

export const getFeaturedProducts = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 8;
  const products = await productService.getFeaturedProducts(limit);

  successResponse(
    res,
    {
      items: products,
      pagination: {
        total: products.length,
        page: 1,
        pages: 1,
        limit,
      },
    },
    "Lấy sản phẩm nổi bật thành công",
  );
});

export const getBestSellingProducts = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const products = await productService.getBestSellingProducts(limit);

  successResponse(res, products, "Lấy sản phẩm bán chạy thành công");
});

export const getNewestProducts = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const products = await productService.getNewestProducts(limit);

  successResponse(res, products, "Lấy sản phẩm mới nhất thành công");
});

export const updateProductStock = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  const product = await productService.updateStock(id, quantity);
  successResponse(res, product, "Cập nhật tồn kho thành công");
});

export const uploadProductImages = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest("Product images are required");
  }

  const files = req.files.map((file) => ({
    url: file.path || file.secure_url || file.location || "",
    public_id: file.filename || file.public_id || file.originalname,
    original_name: file.originalname,
  }));

  const urls = files.map((file) => file.url).filter(Boolean);

  if (!urls.length) {
    throw ApiError.badRequest("Product image upload failed");
  }

  successResponse(res, { urls, files }, "Upload images thành công");
});
