import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductService, Product } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { ProductModal } from '../../shared/components/product-modal/product-modal';

interface Category {
  id: number;
  name: string;
  count?: number;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProductModal],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  categories: Category[] = [];

  // Filter states
  selectedCategory: number | null = null;
  selectedColors: string[] = [];
  selectedPrice = 0;
  minPrice = 0;
  maxPrice = 10000000;
  sortBy = 'newest';
  searchQuery = '';
  itemsPerPage = 20;
  currentPage = 1;
  totalPages = 1;
  totalProducts = 0;

  // Loading state
  isLoading = false;
  loadError: string | null = null;

  // Available filters
  availableColors: string[] = [];
  availableSizes: string[] = [];
  availableGenders: string[] = [];
  selectedSizes: string[] = [];
  selectedGender: string = '';
  sortOptions = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'price-asc', label: 'Giá thấp đến cao' },
    { value: 'price-desc', label: 'Giá cao đến thấp' },
    { value: 'name-asc', label: 'Tên A-Z' },
    { value: 'name-desc', label: 'Tên Z-A' },
    { value: 'popular', label: 'Phổ biến nhất' },
  ];

  showProductModal = false;
  selectedProduct: Product | null = null;

  constructor(
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private cartService: CartService,
  ) {}

  ngOnInit() {
    this.loadFilters();
    this.route.queryParams.subscribe((params) => {
      this.searchQuery = (params['search'] || '').toString().trim();
      this.currentPage = 1;
      this.loadProducts();
    });
  }

  loadFilters() {
    this.productService.getProductFilters().subscribe({
      next: (response) => {
        const data = response.data;
        this.categories = data.categories || [];
        this.availableColors = data.colors || [];
        this.availableSizes = data.sizes || [];
        this.availableGenders = data.genders || [];
        this.minPrice = data.minPrice ?? 0;
        this.maxPrice = data.maxPrice ?? 0;
        this.selectedPrice = this.maxPrice;
      },
      error: (error) => {
        console.error('Error loading product filters:', error);
      },
    });
  }

  loadProducts() {
    this.isLoading = true;
    this.loadError = null;

    const options: any = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      sortBy: this.getSortField(),
      sortOrder: this.getSortOrder(),
      search: this.searchQuery,
      status: 'active',
    };

    // Add category filter
    if (this.selectedCategory) {
      options.category_id = this.selectedCategory;
    }

    // Add price filter
    if (this.selectedPrice && this.selectedPrice < this.maxPrice) {
      options.maxPrice = this.selectedPrice;
    }

    // Add color filter
    if (this.selectedColors.length > 0) {
      options.colors = this.selectedColors;
    }
    if (this.selectedSizes.length > 0) {
      options.sizes = this.selectedSizes;
    }
    if (this.selectedGender) {
      options.gender = this.selectedGender;
    }

    this.productService.getAllProducts(options).subscribe({
      next: (response) => {
        this.products = response.data.items;
        this.totalProducts = response.data.pagination.total;
        this.totalPages = response.data.pagination.pages;
        this.currentPage = response.data.pagination.page;

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);

        // Provide more specific error messages
        if (error.status === 0) {
          this.loadError =
            'Không thể kết nối đến máy chủ. Vui lòng kiểm tra xem backend đã được khởi động chưa.';
        } else if (error.status === 404) {
          this.loadError = 'Không tìm thấy API endpoint. Vui lòng kiểm tra cấu hình.';
        } else if (error.status >= 500) {
          this.loadError = 'Lỗi máy chủ. Vui lòng thử lại sau.';
        } else {
          this.loadError =
            error.error?.message || 'Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.';
        }

        this.isLoading = false;
      },
    });
  }

  // Filter metadata now comes from database (via /products/filters)

  getSortField(): string {
    switch (this.sortBy) {
      case 'price-asc':
      case 'price-desc':
        return 'price_buy';
      case 'name-asc':
      case 'name-desc':
        return 'name';
      case 'popular':
        return 'sold_count';
      case 'newest':
      default:
        return 'created_at';
    }
  }

  getSortOrder(): 'asc' | 'desc' {
    switch (this.sortBy) {
      case 'price-asc':
      case 'name-asc':
        return 'asc';
      case 'price-desc':
      case 'name-desc':
      case 'popular':
      case 'newest':
      default:
        return 'desc';
    }
  }

  // Filter methods
  toggleColor(color: string) {
    const index = this.selectedColors.indexOf(color);
    if (index > -1) {
      this.selectedColors.splice(index, 1);
    } else {
      this.selectedColors.push(color);
    }
    this.currentPage = 1;
    this.loadProducts();
  }

  toggleSize(size: string) {
    const index = this.selectedSizes.indexOf(size);
    if (index > -1) {
      this.selectedSizes.splice(index, 1);
    } else {
      this.selectedSizes.push(size);
    }
    this.currentPage = 1;
    this.loadProducts();
  }

  selectGender(gender: string) {
    if (this.selectedGender === gender) {
      this.selectedGender = '';
    } else {
      this.selectedGender = gender;
    }
    this.currentPage = 1;
    this.loadProducts();
  }

  selectCategory(categoryId: number) {
    if (this.selectedCategory === categoryId) {
      this.selectedCategory = null;
    } else {
      this.selectedCategory = categoryId;
    }
    this.currentPage = 1;
    this.loadProducts();
  }

  onPriceChange() {
    this.currentPage = 1;
    this.loadProducts();
  }

  onSortChange() {
    this.currentPage = 1;
    this.loadProducts();
  }

  resetFilters() {
    this.selectedCategory = null;
    this.selectedColors = [];
    this.selectedSizes = [];
    this.selectedGender = '';
    this.selectedPrice = this.maxPrice;
    this.searchQuery = '';
    this.sortBy = 'newest';
    this.currentPage = 1;
    this.loadProducts();
  }

  // Utility methods
  getFinalPrice(product: Product): number {
    return this.productService.getFinalPrice(product);
  }

  getDiscountPercentage(product: Product): number {
    return this.productService.getDiscountPercentage(product);
  }

  isInStock(product: Product): boolean {
    return this.productService.isInStock(product);
  }

  getImageUrl(product: Product): string {
    if (product.images && product.images.length > 0) {
      const firstImage = product.images[0];
      return typeof firstImage === 'string'
        ? firstImage
        : (firstImage as any).url || 'assets/images/placeholder.jpg';
    }
    return 'assets/images/placeholder.jpg';
  }

  getCategoryName(category: string): string {
    return this.productService.getCategoryDisplayName(category);
  }

  // Pagination
  getStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalProducts);
  }

  getTotalPages(): number {
    return this.totalPages;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  getPageNumbers(): number[] {
    const total = this.getTotalPages();
    const pages: number[] = [];
    const maxVisible = 5;

    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      } else if (this.currentPage >= total - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 3; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(total);
      }
    }
    return pages;
  }

  // Navigate to product detail
  viewProductDetail(productId: string | number) {
    this.router.navigate(['/products', productId.toString()]);
  }

  openProductModal(product: Product, event?: Event) {
    event?.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    this.selectedProduct = product;
    this.showProductModal = true;
  }

  closeProductModal() {
    this.showProductModal = false;
    this.selectedProduct = null;
  }

  handleModalAdd(payload: {
    product: Product;
    quantity: number;
    size?: string | null;
    color?: string | null;
  }) {
    this.cartService
      .addItem(payload.product.product_id, payload.quantity, payload.size, payload.color)
      .subscribe({
        next: () => {
          this.showProductModal = false;
          this.selectedProduct = null;
          alert('Đã thêm vào giỏ hàng.');
        },
        error: (err) => {
          console.error('Add to cart failed:', err);
          alert('Không thể thêm vào giỏ hàng. Vui lòng thử lại.');
        },
      });
  }
}
