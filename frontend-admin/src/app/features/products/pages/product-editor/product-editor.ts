import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';

type ProductStatus = 'draft' | 'published';
type ProductGender = 'Nam' | 'Nữ' | 'Unisex';

interface ProductForm {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  features: string;
  priceBuy: number;
  discountPercent: number;
  priceSale: number;
  rentPrice: number;
  deposit: number;
  category: string;
  tags: string;
  size: string;
  color: string;
  material: string;
  era: string;
  craftsmanship: string;
  origin: string;
  gender: ProductGender;
  sku: string;
  stock: number;
  status: ProductStatus;
  images: string[];
  thumbnail: string;
}

interface UploadResponse {
  success: boolean;
  data?: {
    urls: string[];
  };
  message?: string;
}

interface CreateProductResponse {
  success: boolean;
  data?: unknown;
  message?: string;
}

interface ProductApiResponse {
  success: boolean;
  data?: {
    name?: string;
    slug?: string;
    description?: string;
    short_description?: string;
    features?: string | string[];
    price_buy?: number;
    price_sale?: number | null;
    price_rent?: number;
    deposit_amount?: number;
    category_name?: string;
    category?: string;
    tags?: string[] | string;
    size?: string;
    color?: string;
    material?: string;
    era?: string;
    craftsmanship?: string;
    origin?: string;
    gender?: string;
    sku?: string;
    stock_quantity?: number;
    status?: string;
    images?: string[];
    gallery?: string[];
    thumbnail?: string;
    attributes?: {
      sizes?: string[];
      colors?: string[];
      features?: string[];
    };
  };
}

@Component({
  selector: 'app-product-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-editor.html',
  styleUrl: './product-editor.css',
})
export class ProductEditorComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly apiUrl = environment.apiUrl;

  protected readonly categoryOptions = [
    'Áo dài truyền thống',
    'Trang phục cung đình',
    'Áo dài nam',
    'May đo',
  ];
  protected readonly genderOptions: ProductGender[] = ['Nam', 'Nữ', 'Unisex'];

  protected product: ProductForm = {
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    features: '',
    priceBuy: 0,
    discountPercent: 0,
    priceSale: 0,
    rentPrice: 0,
    deposit: 0,
    category: 'Áo dài truyền thống',
    tags: '',
    size: '',
    color: '',
    material: '',
    era: '',
    craftsmanship: '',
    origin: 'Việt Nam',
    gender: 'Unisex',
    sku: '',
    stock: 0,
    status: 'draft',
    images: [],
    thumbnail: '',
  };

  protected isUploading = false;
  protected uploadError = '';
  protected isSaving = false;
  protected saveError = '';
  protected saveSuccess = '';
  protected dragActive = false;
  protected isEditMode = false;
  protected productId: string | null = null;
  protected isLoadingProduct = false;
  protected loadError = '';

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.productId = id;
      this.loadProduct(id);
    }
  }

  protected onNameInput(): void {
    if (!this.product.slug) {
      this.product.slug = this.slugify(this.product.name);
    }
  }

  protected onPriceBuyChange(): void {
    this.product.priceBuy = this.normalizeCurrency(this.product.priceBuy);
    this.recalculateSalePriceFromDiscount();
  }

  protected onDiscountPercentChange(): void {
    this.product.discountPercent = this.normalizeDiscountPercent(this.product.discountPercent);
    this.recalculateSalePriceFromDiscount();
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    this.uploadImages(files);
    input.value = '';
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length === 0) return;
    this.uploadImages(files);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = true;
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;
  }

  protected saveDraft(): void {
    this.submitProduct('draft');
  }

  protected publishNow(): void {
    this.submitProduct('published');
  }

  protected get previewImage(): string {
    return this.product.thumbnail || this.product.images[0] || '';
  }

  protected get hasDiscount(): boolean {
    return this.product.discountPercent > 0 && this.product.priceSale >= 0;
  }

  protected get previewCurrentPrice(): number {
    return this.hasDiscount ? this.product.priceSale : this.product.priceBuy;
  }

  protected get savingsAmount(): number {
    return this.hasDiscount ? Math.max(this.product.priceBuy - this.product.priceSale, 0) : 0;
  }

  private uploadImages(files: File[]): void {
    if (this.isUploading) return;
    this.isUploading = true;
    this.uploadError = '';

    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    this.http.post<UploadResponse>(`${this.apiUrl}/products/uploads`, formData).subscribe({
      next: (response) => {
        const urls = response.data?.urls ?? [];
        if (urls.length) {
          this.product.images = [...this.product.images, ...urls];
          if (!this.product.thumbnail) {
            this.product.thumbnail = urls[0];
          }
        }
      },
      error: (error) => {
        this.uploadError = error?.error?.message || 'Không thể tải ảnh.';
      },
      complete: () => {
        this.isUploading = false;
      },
    });
  }

  private submitProduct(status: ProductStatus): void {
    if (this.isSaving) return;

    this.syncPricingState();
    this.product.status = status;
    this.isSaving = true;
    this.saveError = '';
    this.saveSuccess = '';

    const payload = {
      name: this.product.name,
      slug: this.product.slug,
      description: this.product.description,
      short_description: this.product.shortDescription,
      features: this.product.features,
      price_buy: this.product.priceBuy,
      price_sale: this.product.discountPercent > 0 ? this.product.priceSale : null,
      price_rent: this.product.rentPrice,
      deposit_amount: this.product.deposit,
      category: this.product.category,
      tags: this.product.tags,
      size: this.product.size,
      color: this.product.color,
      material: this.product.material,
      era: this.product.era,
      craftsmanship: this.product.craftsmanship,
      origin: this.product.origin,
      gender: this.product.gender,
      sku: this.product.sku,
      stock: this.product.stock,
      status,
      images: this.product.images,
      thumbnail: this.product.thumbnail,
    };

    const request$ =
      this.isEditMode && this.productId
        ? this.http.put<CreateProductResponse>(`${this.apiUrl}/products/${this.productId}`, payload)
        : this.http.post<CreateProductResponse>(`${this.apiUrl}/products`, payload);

    request$.subscribe({
      next: (response) => {
        this.saveSuccess = response.message || 'Lưu sản phẩm thành công.';
        if (status === 'published') {
          this.router.navigate(['/products']);
        }
      },
      error: (error) => {
        this.saveError = error?.error?.message || 'Không thể lưu sản phẩm.';
      },
      complete: () => {
        this.isSaving = false;
      },
    });
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private loadProduct(id: string): void {
    this.isLoadingProduct = true;
    this.loadError = '';

    this.http.get<ProductApiResponse>(`${this.apiUrl}/products/${id}`).subscribe({
      next: (response) => {
        const data = response.data || {};
        const attributes = data.attributes || {};
        const tags = Array.isArray(data.tags) ? data.tags.join(', ') : data.tags || '';
        const sizes = Array.isArray(attributes.sizes)
          ? attributes.sizes.join(', ')
          : data.size || '';
        const colors = Array.isArray(attributes.colors)
          ? attributes.colors.join(', ')
          : data.color || '';
        const features = Array.isArray(attributes.features)
          ? attributes.features.join('\n')
          : Array.isArray(data.features)
            ? data.features.join('\n')
            : data.features || '';
        const images = Array.isArray(data.images)
          ? data.images
          : Array.isArray(data.gallery)
            ? data.gallery
            : [];
        const priceBuy = this.normalizeCurrency(data.price_buy ?? 0);
        const priceSale = this.normalizeCurrency(data.price_sale ?? 0);
        const discountPercent = this.deriveDiscountPercent(priceBuy, data.price_sale);

        this.product = {
          ...this.product,
          name: data.name || '',
          slug: data.slug || '',
          description: data.description || '',
          shortDescription: data.short_description || '',
          features,
          priceBuy,
          discountPercent,
          priceSale: discountPercent > 0 ? priceSale : 0,
          rentPrice: this.normalizeCurrency(data.price_rent ?? 0),
          deposit: this.normalizeCurrency(data.deposit_amount ?? 0),
          category: data.category_name || data.category || this.product.category,
          tags,
          size: sizes,
          color: colors,
          material: data.material || '',
          era: data.era || '',
          craftsmanship: data.craftsmanship || '',
          origin: data.origin || 'Việt Nam',
          gender: this.normalizeGender(data.gender),
          sku: data.sku || '',
          stock: this.normalizeStock(data.stock_quantity ?? 0),
          status: data.status === 'active' ? 'published' : 'draft',
          images,
          thumbnail: data.thumbnail || images[0] || '',
        };

        this.recalculateSalePriceFromDiscount();
      },
      error: (error) => {
        this.loadError = error?.error?.message || 'Không thể tải dữ liệu sản phẩm.';
      },
      complete: () => {
        this.isLoadingProduct = false;
      },
    });
  }

  private syncPricingState(): void {
    this.product.priceBuy = this.normalizeCurrency(this.product.priceBuy);
    this.product.discountPercent = this.normalizeDiscountPercent(this.product.discountPercent);
    this.product.priceSale = this.calculateSalePrice(
      this.product.priceBuy,
      this.product.discountPercent,
    );
    this.product.rentPrice = this.normalizeCurrency(this.product.rentPrice);
    this.product.deposit = this.normalizeCurrency(this.product.deposit);
    this.product.stock = this.normalizeStock(this.product.stock);
  }

  private recalculateSalePriceFromDiscount(): void {
    this.product.priceSale = this.calculateSalePrice(
      this.product.priceBuy,
      this.product.discountPercent,
    );
  }

  private calculateSalePrice(priceBuy: number, discountPercent: number): number {
    const normalizedPriceBuy = this.normalizeCurrency(priceBuy);
    const normalizedDiscountPercent = this.normalizeDiscountPercent(discountPercent);

    if (normalizedPriceBuy <= 0 || normalizedDiscountPercent <= 0) {
      return 0;
    }

    return Math.max(
      0,
      Math.round(normalizedPriceBuy - (normalizedPriceBuy * normalizedDiscountPercent) / 100),
    );
  }

  private deriveDiscountPercent(priceBuy: number, priceSale: number | null | undefined): number {
    const normalizedPriceBuy = this.normalizeCurrency(priceBuy);
    const normalizedPriceSale = this.normalizeCurrency(priceSale ?? 0);

    if (
      normalizedPriceBuy <= 0 ||
      normalizedPriceSale <= 0 ||
      normalizedPriceSale >= normalizedPriceBuy
    ) {
      return 0;
    }

    return this.normalizeDiscountPercent(
      Math.round(((normalizedPriceBuy - normalizedPriceSale) / normalizedPriceBuy) * 100),
    );
  }

  private normalizeCurrency(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.round(parsed);
  }

  private normalizeDiscountPercent(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0;
    }
    return Math.min(100, Math.max(0, Math.round(parsed)));
  }

  private normalizeStock(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.floor(parsed);
  }

  private normalizeGender(value: unknown): ProductGender {
    if (value === 'Nam' || value === 'Nữ') return value;
    if (value === 'Male') return 'Nam';
    if (value === 'Female') return 'Nữ';
    return 'Unisex';
  }
}
