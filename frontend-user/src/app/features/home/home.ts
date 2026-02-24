import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService, Product } from '../../services/product.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit {
  featuredProducts: Product[] = [];
  isLoading = false;
  loadError: string | null = null;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadFeaturedProducts();
  }

  loadFeaturedProducts(): void {
    this.isLoading = true;
    this.loadError = null;

    this.productService
      .getAllProducts({
        page: 1,
        limit: 8,
        sortBy: 'created_at',
        sortOrder: 'desc',
        status: 'active',
      })
      .subscribe({
        next: (response) => {
          const anyResponse = response as any;
          const items = anyResponse?.data?.items || anyResponse?.data?.products || [];
          this.featuredProducts = items;
          this.isLoading = false;
        },
        error: (error) => {
          if (error.status === 0) {
            this.loadError =
              'Khong the ket noi may chu. Vui long kiem tra backend da chay chua.';
          } else if (error.status >= 500) {
            this.loadError = 'May chu dang gap loi. Vui long thu lai sau.';
          } else {
            this.loadError =
              error.error?.message || 'Khong the tai danh sach san pham. Vui long thu lai.';
          }
          this.featuredProducts = [];
          this.isLoading = false;
        },
      });
  }

  getFinalPrice(product: Product): number {
    return this.productService.getFinalPrice(product);
  }

  getDiscountPercentage(product: Product): number {
    return this.productService.getDiscountPercentage(product);
  }

  getImageUrl(product: Product): string {
    if (product.thumbnail) {
      return product.thumbnail;
    }

    const candidates = product.images?.length ? product.images : product.gallery;
    if (candidates && candidates.length > 0) {
      const firstImage = candidates[0] as any;
      return typeof firstImage === 'string'
        ? firstImage
        : firstImage?.url || 'assets/images/placeholder.jpg';
    }

    return 'assets/images/placeholder.jpg';
  }

  trackByProduct(index: number, product: Product): string | number {
    return product.product_id || product._id || index;
  }
}
