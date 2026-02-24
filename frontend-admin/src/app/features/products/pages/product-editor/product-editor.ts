import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';

type ProductStatus = 'draft' | 'published';

interface ProductForm {
  name: string;
  slug: string;
  description: string;
  features: string;
  salePrice: number;
  rentPrice: number;
  deposit: number;
  category: string;
  tags: string;
  size: string;
  color: string;
  material: string;
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

  protected product: ProductForm = {
    name: 'Áo dài Nhật Bình đỏ',
    slug: 'ao-dai-nhat-binh-do',
    description: 'Chất liệu lụa cao cấp, thêu tay thủ công.',
    features: `Lụa tơ tằm
Thêu tay truyền thống
Form chuẩn lễ phục`,
    salePrice: 1200000,
    rentPrice: 180000,
    deposit: 300000,
    category: 'Áo dài truyền thống',
    tags: 'lụa, thêu tay, truyền thống',
    size: 'M',
    color: 'Đỏ mận',
    material: 'Lụa tơ tằm',
    sku: 'VP-AD-2401',
    stock: 12,
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
    this.isSaving = true;
    this.saveError = '';
    this.saveSuccess = '';

    this.product.status = status;

    const payload = {
      name: this.product.name,
      slug: this.product.slug,
      description: this.product.description,
      features: this.product.features,
      salePrice: this.product.salePrice,
      rentPrice: this.product.rentPrice,
      deposit: this.product.deposit,
      category: this.product.category,
      tags: this.product.tags,
      size: this.product.size,
      color: this.product.color,
      material: this.product.material,
      sku: this.product.sku,
      stock: this.product.stock,
      status: status,
      images: this.product.images,
      thumbnail: this.product.thumbnail,
    };

    const request$ = this.isEditMode && this.productId
      ? this.http.put<CreateProductResponse>(`${this.apiUrl}/products/${this.productId}`, payload)
      : this.http.post<CreateProductResponse>(`${this.apiUrl}/products`, payload);

    request$.subscribe({
      next: (response) => {
        this.saveSuccess = response.message || 'Lưu sản phẩm thành công';
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

    this.http.get<{ success: boolean; data?: any }>(`${this.apiUrl}/products/${id}`).subscribe({
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
          : data.features || '';

        const images = Array.isArray(data.images)
          ? data.images
          : Array.isArray(data.gallery)
            ? data.gallery
            : [];

        this.product = {
          ...this.product,
          name: data.name || '',
          slug: data.slug || '',
          description: data.description || '',
          features: features,
          salePrice: data.price_buy ?? data.price_sale ?? 0,
          rentPrice: data.price_rent ?? 0,
          deposit: data.deposit_amount ?? 0,
          category: data.category_name || data.category || '',
          tags: tags,
          size: sizes,
          color: colors,
          material: data.material || '',
          sku: data.sku || '',
          stock: data.stock_quantity ?? 0,
          status: data.status === 'active' ? 'published' : 'draft',
          images: images,
          thumbnail: data.thumbnail || images[0] || '',
        };
      },
      error: (error) => {
        this.loadError = error?.error?.message || 'Không thể tải dữ liệu sản phẩm.';
      },
      complete: () => {
        this.isLoadingProduct = false;
      },
    });
  }
}
