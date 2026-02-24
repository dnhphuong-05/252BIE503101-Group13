import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Product {
  _id: string;
  product_id: number;
  productId?: string; // Alias for product_id
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description: string;
  category_id: number;
  category_name: string;
  category?: string; // Alias
  era?: string;
  material?: string;
  origin: string;
  craftsmanship?: string;
  gender: string;
  price_buy: number;
  price_sale?: number | null;
  price_rent: number;
  price?: number; // Alias for price_buy
  salePrice?: number; // Alias for price_rent
  deposit_amount: number;
  thumbnail: string;
  images: string[];
  gallery: string[];
  attributes: {
    colors: string[];
    sizes: string[];
    features: string[];
  };
  // Convenience properties for direct access
  colors?: string[];
  sizes?: string[];
  categories: string[];
  tags: string[];
  stock_status: string;
  stock_quantity: number;
  stock?: number; // Alias for stock_quantity
  tailor_available: boolean;
  status: string;
  view_count: number;
  views?: number; // Alias
  rating_average: number;
  rating_count: number;
  // Nested rating object
  rating?: {
    average: number;
    count: number;
  };
  soldCount?: number;
  sold_count?: number;
  created_at: string;
  updated_at: string;
  createdAt?: Date;
  updatedAt?: Date;
  meta?: {
    og_image?: string;
    og_description?: string;
  };
}

export interface ProductsResponse {
  success: boolean;
  message?: string;
  data: {
    items: Product[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

export interface ProductResponse {
  success: boolean;
  message: string;
  data: Product;
}

export interface ProductFilterOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  category?: string;
  category_id?: number;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  colors?: string[];
  sizes?: string[];
  gender?: string;
}

export interface ProductFilterData {
  categories: {
    id: number;
    name: string;
    count: number;
  }[];
  colors: string[];
  sizes: string[];
  genders: string[];
  minPrice: number;
  maxPrice: number;
}

export interface ProductFiltersResponse {
  success: boolean;
  message?: string;
  data: ProductFilterData;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  /**
   * Lấy tất cả sản phẩm với filter và pagination
   */
  getAllProducts(options: ProductFilterOptions = {}): Observable<ProductsResponse> {
    let params = new HttpParams();

    if (options.page) params = params.set('page', options.page.toString());
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.sortOrder) params = params.set('sortOrder', options.sortOrder);
    if (options.search) params = params.set('search', options.search);
    if (options.category) params = params.set('category', options.category);
    if (options.category_id) params = params.set('category_id', options.category_id.toString());
    if (options.status) params = params.set('status', options.status);
    if (options.minPrice !== undefined) params = params.set('minPrice', options.minPrice.toString());
    if (options.maxPrice !== undefined) params = params.set('maxPrice', options.maxPrice.toString());
    if (options.colors && options.colors.length > 0) {
      params = params.set('colors', options.colors.join(','));
    }
    if (options.sizes && options.sizes.length > 0) {
      params = params.set('sizes', options.sizes.join(','));
    }
    if (options.gender) {
      params = params.set('gender', options.gender);
    }

    return this.http.get<ProductsResponse>(this.apiUrl, { params });
  }

  /**
   * Lấy dữ liệu bộ lọc sản phẩm
   */
  getProductFilters(): Observable<ProductFiltersResponse> {
    return this.http.get<ProductFiltersResponse>(`${this.apiUrl}/filters`);
  }

  /**
   * Lấy chi tiết một sản phẩm
   */
  getProductById(id: string): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Lấy sản phẩm nổi bật
   */
  getFeaturedProducts(limit: number = 8): Observable<ProductsResponse> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ProductsResponse>(`${this.apiUrl}/featured`, { params });
  }

  /**
   * Lấy sản phẩm liên quan
   */
  getRelatedProducts(productId: string, limit: number = 20): Observable<ProductsResponse> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ProductsResponse>(`${this.apiUrl}/${productId}/related`, { params });
  }

  /**
   * Lấy sản phẩm theo danh mục
   */
  getProductsByCategory(
    category: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
    } = {},
  ): Observable<ProductsResponse> {
    let params = new HttpParams().set('category', category);

    if (options.page) params = params.set('page', options.page.toString());
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.sortOrder) params = params.set('sortOrder', options.sortOrder);

    return this.http.get<ProductsResponse>(this.apiUrl, { params });
  }

  /**
   * Tính giá sau giảm giá
   */
  getFinalPrice(product: Product): number {
    if (product.price_sale !== null && product.price_sale !== undefined && product.price_sale > 0) {
      return product.price_sale;
    }
    return product.price_buy || product.price || 0;
  }

  /**
   * Tính phần trăm giảm giá
   */
  getDiscountPercentage(product: Product): number {
    if (
      product.price_sale === null ||
      product.price_sale === undefined ||
      product.price_sale <= 0
    ) {
      return 0;
    }
    if (!product.price_buy || product.price_sale >= product.price_buy) {
      return 0;
    }
    return Math.round(((product.price_buy - product.price_sale) / product.price_buy) * 100);
  }

  /**
   * Kiểm tra sản phẩm còn hàng
   */
  isInStock(product: Product): boolean {
    return (
      product.status === 'active' &&
      product.stock_status === 'in_stock' &&
      product.stock_quantity > 0
    );
  }

  /**
   * Format tên danh mục
   */
  getCategoryDisplayName(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'ao-dai': 'Áo Dài',
      'ao-tu-than': 'Áo Tứ Thân',
      'ao-ngu-than': 'Áo Ngũ Thân',
      'phu-kien': 'Phụ Kiện',
      khac: 'Khác',
    };
    return categoryMap[category] || category;
  }
}
