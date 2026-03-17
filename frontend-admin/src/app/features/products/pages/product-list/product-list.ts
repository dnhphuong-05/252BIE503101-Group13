import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiResponse, BackendListResponse } from '../../../../models';
import { environment } from '../../../../../environments/environment';

type ProductStatus = 'draft' | 'active' | 'archived';
type ProductStatusFilter = ProductStatus | 'all';
type ProductApiStatus = 'draft' | 'active' | 'inactive' | 'archived';
type ProductBulkAction = '' | 'activate' | 'draft' | 'archive' | 'delete_permanent';

interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: string;
  rentPrice?: string;
  deposit?: string;
  stock: number;
  status: ProductStatus;
  updatedAt: string;
  image: string;
}

interface ProductApiItem {
  product_id: number;
  name: string;
  category_name: string;
  price_buy: number;
  price_rent?: number;
  price_sale?: number | null;
  stock_quantity: number;
  status: ProductApiStatus;
  thumbnail: string;
  updated_at: string;
  tailor_available?: boolean;
}

interface ProductFilterCategory {
  id: number;
  name: string;
  count: number;
}

interface ProductFiltersResponse {
  categories: ProductFilterCategory[];
  colors: string[];
  sizes: string[];
  genders: string[];
  minPrice: number;
  maxPrice: number;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductListComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;
  private readonly pageSize = 5;
  private readonly initialPageCount = 4;
  private searchTimer?: ReturnType<typeof setTimeout>;

  protected readonly statusMeta: Record<ProductStatus, { label: string; class: string }> = {
    draft: { label: 'Nháp', class: 'badge badge-warning' },
    active: { label: 'Đang bán', class: 'badge badge-success' },
    archived: { label: 'Lưu trữ', class: 'badge badge-neutral' },
  };

  protected readonly statusOptions: Array<{ value: ProductStatusFilter; label: string }> = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'active', label: 'Đang bán' },
    { value: 'draft', label: 'Nháp' },
    { value: 'archived', label: 'Lưu trữ' },
  ];

  protected readonly sortOptions: Array<{
    value: string;
    label: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }> = [
    { value: 'newest', label: 'Mới nhất', sortBy: 'created_at', sortOrder: 'desc' },
    { value: 'oldest', label: 'Cũ nhất', sortBy: 'created_at', sortOrder: 'asc' },
    { value: 'price_desc', label: 'Giá cao → thấp', sortBy: 'price_buy', sortOrder: 'desc' },
    { value: 'price_asc', label: 'Giá thấp → cao', sortBy: 'price_buy', sortOrder: 'asc' },
    { value: 'rating', label: 'Đánh giá cao', sortBy: 'rating_average', sortOrder: 'desc' },
    { value: 'best_selling', label: 'Bán chạy', sortBy: 'sold_count', sortOrder: 'desc' },
  ];

  protected products: ProductRow[] = [];
  protected isLoading = false;
  protected isLoadingMore = false;
  protected isBulkRunning = false;
  protected loadError = '';
  protected actionSuccess = '';
  protected total = 0;
  protected deletingIds = new Set<string>();
  protected statusUpdatingIds = new Set<string>();
  protected selectedIds = new Set<string>();
  protected categories: ProductFilterCategory[] = [];
  protected filtersLoading = false;
  protected filtersError = '';
  protected searchTerm = '';
  protected statusFilter: ProductStatusFilter = 'all';
  protected categoryFilter = '';
  protected sortFilter = 'newest';
  protected bulkAction: ProductBulkAction = '';
  protected currentPage = 0;
  protected readonly isSuperAdmin = computed(
    () => this.authService.currentUser()?.role === 'super_admin',
  );

  protected get bulkActionOptions(): Array<{ value: ProductBulkAction; label: string }> {
    const options: Array<{ value: ProductBulkAction; label: string; superAdminOnly?: boolean }> = [
      { value: 'activate', label: 'Đăng bán' },
      { value: 'draft', label: 'Chuyển nháp' },
      { value: 'archive', label: 'Lưu trữ' },
      { value: 'delete_permanent', label: 'Xóa vĩnh viễn', superAdminOnly: true },
    ];

    return options
      .filter((option) => !option.superAdminOnly || this.isSuperAdmin())
      .map(({ value, label }) => ({ value, label }));
  }

  protected get selectedCount(): number {
    return this.selectedIds.size;
  }

  protected get allVisibleSelected(): boolean {
    return this.products.length > 0 && this.products.every((product) => this.selectedIds.has(product.id));
  }

  protected get someVisibleSelected(): boolean {
    return this.products.some((product) => this.selectedIds.has(product.id)) && !this.allVisibleSelected;
  }

  ngOnInit(): void {
    this.loadFilters();
    this.loadInitialProducts();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  protected onSearchInput(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.actionSuccess = '';
      this.loadInitialProducts();
    }, 400);
  }

  protected applyFilters(): void {
    this.actionSuccess = '';
    this.loadInitialProducts();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.categoryFilter = '';
    this.sortFilter = 'newest';
    this.bulkAction = '';
    this.actionSuccess = '';
    this.loadInitialProducts();
  }

  protected loadMore(): void {
    if (this.isLoading || this.isLoadingMore || this.products.length >= this.total) return;
    this.loadNextPage();
  }

  protected onView(product: ProductRow): void {
    const baseUrl = this.resolveUserBaseUrl();
    window.open(`${baseUrl}/products/${product.id}`, '_blank', 'noopener');
  }

  protected onEdit(product: ProductRow): void {
    this.router.navigate(['/products/edit', product.id]);
  }

  protected onArchive(product: ProductRow): void {
    if (this.isBulkRunning || this.statusUpdatingIds.has(product.id)) return;
    this.actionSuccess = '';
    this.updateProductStatus(product, 'archived');
  }

  protected onRestore(product: ProductRow): void {
    if (this.isBulkRunning || this.statusUpdatingIds.has(product.id)) return;
    this.actionSuccess = '';
    this.updateProductStatus(product, 'active');
  }

  protected onDelete(product: ProductRow): void {
    if (!this.isSuperAdmin()) {
      this.loadError = 'Chỉ super admin mới được xóa vĩnh viễn.';
      return;
    }
    if (this.isBulkRunning || this.deletingIds.has(product.id)) return;

    const confirmed = window.confirm(`Xóa vĩnh viễn sản phẩm "${product.name}"?`);
    if (!confirmed) return;

    this.actionSuccess = '';
    this.deletingIds.add(product.id);
    this.http.delete(`${this.apiUrl}/products/${product.id}/permanent`).subscribe({
      next: () => {
        this.products = this.products.filter((item) => item.id !== product.id);
        this.selectedIds.delete(product.id);
        this.total = Math.max(0, this.total - 1);
        this.actionSuccess = 'Đã xóa vĩnh viễn sản phẩm.';
      },
      error: (error) => {
        console.error('Failed to delete product:', error);
        this.loadError = error?.error?.message || 'Không thể xóa sản phẩm';
      },
      complete: () => {
        this.deletingIds.delete(product.id);
      },
    });
  }

  protected isSelected(productId: string): boolean {
    return this.selectedIds.has(productId);
  }

  protected toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.products.forEach((product) => this.selectedIds.add(product.id));
      return;
    }
    this.clearSelection();
  }

  protected toggleSelection(productId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedIds.add(productId);
    } else {
      this.selectedIds.delete(productId);
    }
  }

  protected clearSelection(): void {
    this.selectedIds.clear();
    this.bulkAction = '';
  }

  protected async applyBulkAction(): Promise<void> {
    if (!this.bulkAction || !this.selectedCount || this.isBulkRunning) return;

    const action = this.bulkAction;
    const selectedProducts = this.products.filter((product) => this.selectedIds.has(product.id));
    if (!selectedProducts.length) {
      this.clearSelection();
      return;
    }

    if (action === 'delete_permanent' && !this.isSuperAdmin()) {
      this.loadError = 'Chỉ super admin mới được xóa vĩnh viễn.';
      return;
    }

    const confirmationMessage =
      action === 'delete_permanent'
        ? `Xóa vĩnh viễn ${selectedProducts.length} sản phẩm đã chọn?`
        : `Áp dụng "${this.getBulkActionLabel(action)}" cho ${selectedProducts.length} sản phẩm đã chọn?`;
    if (!window.confirm(confirmationMessage)) return;

    this.isBulkRunning = true;
    this.actionSuccess = '';
    this.loadError = '';

    let successCount = 0;
    let firstError = '';

    for (const product of selectedProducts) {
      try {
        await this.runBulkAction(product.id, action);
        successCount += 1;
      } catch (error: any) {
        console.error('Failed to run product bulk action:', error);
        if (!firstError) {
          firstError =
            error?.error?.message ||
            `Không thể ${this.getBulkActionLabel(action).toLowerCase()} sản phẩm "${product.name}".`;
        }
      }
    }

    if (successCount > 0) {
      await this.loadInitialProducts();
      this.actionSuccess = `Đã ${this.getBulkActionLabel(action).toLowerCase()} ${successCount} sản phẩm.`;
    }

    if (firstError) {
      const failedCount = selectedProducts.length - successCount;
      this.loadError =
        failedCount > 1 ? `${firstError} Còn ${failedCount - 1} sản phẩm xử lý thất bại.` : firstError;
    }

    if (!successCount) {
      this.bulkAction = '';
    }

    this.isBulkRunning = false;
  }

  private loadFilters(): void {
    this.filtersLoading = true;
    this.filtersError = '';

    this.http
      .get<ApiResponse<ProductFiltersResponse>>(`${this.apiUrl}/products/filters`)
      .subscribe({
        next: (response) => {
          this.categories = response.data?.categories ?? [];
          this.filtersLoading = false;
        },
        error: (error) => {
          console.error('Failed to load product filters:', error);
          this.filtersError = 'Không thể tải bộ lọc sản phẩm';
          this.filtersLoading = false;
        },
      });
  }

  private async loadInitialProducts(): Promise<void> {
    this.isLoading = true;
    this.isLoadingMore = false;
    this.loadError = '';
    this.products = [];
    this.total = 0;
    this.currentPage = 0;
    this.selectedIds.clear();
    this.bulkAction = '';

    try {
      for (let page = 1; page <= this.initialPageCount; page += 1) {
        const response = await this.fetchProducts(page);
        const data = response?.data;
        const items = data?.items ?? [];

        if (page === 1) {
          this.total = data?.pagination.total ?? items.length;
        }

        if (!items.length) break;

        this.products = [...this.products, ...this.mapProducts(items)];
        this.currentPage = page;

        if (data?.pagination.pages && page >= data.pagination.pages) {
          break;
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      this.loadError = 'Không thể tải danh sách sản phẩm';
      this.products = [];
      this.total = 0;
    } finally {
      this.isLoading = false;
    }
  }

  private async loadNextPage(): Promise<void> {
    this.isLoadingMore = true;
    this.loadError = '';

    try {
      const nextPage = this.currentPage + 1;
      const response = await this.fetchProducts(nextPage);
      const data = response?.data;
      const items = data?.items ?? [];

      if (items.length) {
        this.products = [...this.products, ...this.mapProducts(items)];
        this.currentPage = nextPage;
      }

      if (data?.pagination.total !== undefined) {
        this.total = data.pagination.total;
      }
    } catch (error) {
      console.error('Failed to load more products:', error);
      this.loadError = 'Không thể tải thêm sản phẩm';
    } finally {
      this.isLoadingMore = false;
    }
  }

  private formatCurrency(value: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private mapProducts(items: ProductApiItem[]): ProductRow[] {
    return items.map((product) => {
      const mainPrice = product.price_sale ?? product.price_buy;
      return {
        id: String(product.product_id),
        name: product.name,
        category: product.category_name || '—',
        price: this.formatCurrency(mainPrice),
        rentPrice: product.price_rent ? this.formatCurrency(product.price_rent) : undefined,
        deposit: undefined,
        stock: product.stock_quantity ?? 0,
        status: this.normalizeStatus(product.status),
        updatedAt: this.formatDate(product.updated_at),
        image: product.thumbnail,
      };
    });
  }

  private fetchProducts(
    page: number,
  ): Promise<ApiResponse<BackendListResponse<ProductApiItem>>> {
    const params = this.buildParams(page);
    return firstValueFrom(
      this.http.get<ApiResponse<BackendListResponse<ProductApiItem>>>(`${this.apiUrl}/products`, {
        params,
      }),
    );
  }

  private buildParams(page: number): HttpParams {
    const sort = this.sortOptions.find((option) => option.value === this.sortFilter);
    const statusParam = this.statusFilter === 'archived' ? 'inactive' : this.statusFilter;
    const base: Record<string, string> = {
      page: String(page),
      limit: String(this.pageSize),
      sortBy: sort?.sortBy ?? 'created_at',
      sortOrder: sort?.sortOrder ?? 'desc',
      status: statusParam,
    };

    let params = new HttpParams({ fromObject: base });
    if (this.searchTerm.trim()) {
      params = params.set('search', this.searchTerm.trim());
    }
    if (this.categoryFilter) {
      params = params.set('category_id', this.categoryFilter);
    }

    return params;
  }

  private resolveUserBaseUrl(): string {
    const configured = (environment as { userUrl?: string }).userUrl;
    if (configured && configured.trim()) {
      return configured.replace(/\/+$/, '');
    }
    return window.location.origin.replace(/\/+$/, '');
  }

  private updateProductStatus(product: ProductRow, status: ProductStatus): void {
    this.statusUpdatingIds.add(product.id);
    const apiStatus = status === 'archived' ? 'inactive' : status;
    this.http.put(`${this.apiUrl}/products/${product.id}`, { status: apiStatus }).subscribe({
      next: () => {
        const updatedAt = this.formatDate(new Date().toISOString());
        this.products = this.products.map((item) =>
          item.id === product.id ? { ...item, status, updatedAt } : item,
        );
        this.actionSuccess = 'Đã cập nhật trạng thái sản phẩm.';
      },
      error: (error) => {
        console.error('Failed to update status:', error);
        this.loadError = error?.error?.message || 'Không thể cập nhật trạng thái';
      },
      complete: () => {
        this.statusUpdatingIds.delete(product.id);
      },
    });
  }

  private async runBulkAction(productId: string, action: ProductBulkAction): Promise<void> {
    switch (action) {
      case 'activate':
        await firstValueFrom(this.http.put(`${this.apiUrl}/products/${productId}`, { status: 'active' }));
        return;
      case 'draft':
        await firstValueFrom(this.http.put(`${this.apiUrl}/products/${productId}`, { status: 'draft' }));
        return;
      case 'archive':
        await firstValueFrom(this.http.put(`${this.apiUrl}/products/${productId}`, { status: 'inactive' }));
        return;
      case 'delete_permanent':
        await firstValueFrom(this.http.delete(`${this.apiUrl}/products/${productId}/permanent`));
        return;
      default:
        return;
    }
  }

  private getBulkActionLabel(action: ProductBulkAction): string {
    switch (action) {
      case 'activate':
        return 'Đăng bán';
      case 'draft':
        return 'chuyển nháp';
      case 'archive':
        return 'lưu trữ';
      case 'delete_permanent':
        return 'xóa vĩnh viễn';
      default:
        return 'cập nhật';
    }
  }

  private normalizeStatus(status?: ProductApiStatus): ProductStatus {
    if (!status) return 'draft';
    if (status === 'inactive' || status === 'archived') return 'archived';
    if (status === 'active') return 'active';
    return 'draft';
  }
}
