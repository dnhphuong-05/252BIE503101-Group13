import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../services/product.service';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-modal.html',
  styleUrl: './product-modal.css',
})
export class ProductModal implements OnChanges, OnDestroy {
  @Input() show: boolean = false;
  @Input() product: Product | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() add = new EventEmitter<{
    product: Product;
    quantity: number;
    size?: string | null;
    color?: string | null;
  }>();

  quantity = 1;
  selectedSize: string | null = null;
  selectedColor: string | null = null;
  errorMessage = '';
  private previousBodyOverflow = '';
  private previousHtmlOverflow = '';
  private previousBodyPosition = '';
  private previousBodyTop = '';
  private previousBodyLeft = '';
  private previousBodyRight = '';
  private previousBodyWidth = '';
  private scrollOffsetY = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] || changes['show']) {
      this.resetSelections();
    }

    if (changes['show']) {
      this.updatePageScrollLock();
    }
  }

  ngOnDestroy(): void {
    this.unlockPageScroll();
  }

  resetSelections(): void {
    this.quantity = 1;
    this.errorMessage = '';
    this.selectedSize = null;
    this.selectedColor = null;

    const sizes = this.getSizes();
    const colors = this.getColors();
    if (sizes.length > 0) {
      this.selectedSize = sizes[0];
    }
    if (colors.length > 0) {
      this.selectedColor = colors[0];
    }
  }

  getSizes(): string[] {
    return this.product?.sizes || this.product?.attributes?.sizes || [];
  }

  getColors(): string[] {
    return this.product?.colors || this.product?.attributes?.colors || [];
  }

  getMainImage(): string {
    if (this.product?.images && this.product.images.length > 0) {
      const firstImage = this.product.images[0] as any;
      if (typeof firstImage === 'string') {
        return firstImage;
      }
      return (
        firstImage?.secure_url ||
        firstImage?.url ||
        firstImage?.path ||
        this.product.thumbnail ||
        'assets/images/placeholder.jpg'
      );
    }
    if (this.product?.thumbnail) {
      const thumb: any = this.product.thumbnail;
      return typeof thumb === 'string'
        ? thumb
        : thumb?.secure_url || thumb?.url || thumb?.path || 'assets/images/placeholder.jpg';
    }
    return 'assets/images/placeholder.jpg';
  }

  getFinalPrice(): number {
    if (!this.product) return 0;
    if (this.product.price_sale && this.product.price_sale > 0) {
      return this.product.price_sale;
    }
    return this.product.price_buy || 0;
  }

  hasSale(): boolean {
    if (!this.product) return false;
    if (!this.product.price_sale || this.product.price_sale <= 0) return false;
    return this.product.price_buy > this.product.price_sale;
  }

  getDiscountPercentage(): number {
    if (!this.product || !this.hasSale()) return 0;
    const finalPrice = this.getFinalPrice();
    return Math.round(((this.product.price_buy - finalPrice) / this.product.price_buy) * 100);
  }

  getCategoryLabel(): string {
    return this.product?.category_name || this.product?.category || 'Cổ phục Việt';
  }

  getStockLabel(): string {
    const stock = this.product?.stock_quantity || 0;
    if (stock <= 0) return 'Hết hàng';
    if (stock <= 5) return `Còn ${stock} sản phẩm`;
    return 'Sẵn sàng giao';
  }

  getSelectionSummary(): string {
    const parts = [this.selectedColor, this.selectedSize].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Biến thể mặc định';
  }

  getLineTotal(): number {
    return this.getFinalPrice() * this.quantity;
  }

  selectSize(size: string): void {
    this.selectedSize = size;
    this.errorMessage = '';
  }

  selectColor(color: string): void {
    this.selectedColor = color;
    this.errorMessage = '';
  }

  increase(): void {
    if (!this.product) return;
    const stock = this.product.stock_quantity || 0;
    if (stock > 0 && this.quantity >= stock) return;
    this.quantity += 1;
  }

  decrease(): void {
    this.quantity = Math.max(1, this.quantity - 1);
  }

  onClose(): void {
    this.close.emit();
  }

  onAdd(): void {
    if (!this.product) return;

    if (this.getSizes().length > 0 && !this.selectedSize) {
      this.errorMessage = 'Vui l\u00F2ng ch\u1ECDn k\u00EDch th\u01B0\u1EDBc';
      return;
    }

    if (this.getColors().length > 0 && !this.selectedColor) {
      this.errorMessage = 'Vui l\u00F2ng ch\u1ECDn m\u00E0u s\u1EAFc';
      return;
    }

    this.errorMessage = '';
    this.add.emit({
      product: this.product,
      quantity: this.quantity,
      size: this.selectedSize,
      color: this.selectedColor,
    });
  }

  private updatePageScrollLock(): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (this.show) {
      this.scrollOffsetY = window.scrollY || window.pageYOffset || 0;
      this.previousBodyOverflow = document.body.style.overflow;
      this.previousHtmlOverflow = document.documentElement.style.overflow;
      this.previousBodyPosition = document.body.style.position;
      this.previousBodyTop = document.body.style.top;
      this.previousBodyLeft = document.body.style.left;
      this.previousBodyRight = document.body.style.right;
      this.previousBodyWidth = document.body.style.width;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${this.scrollOffsetY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      return;
    }

    this.unlockPageScroll();
  }

  private unlockPageScroll(): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.style.overflow = this.previousBodyOverflow;
    document.documentElement.style.overflow = this.previousHtmlOverflow;
    document.body.style.position = this.previousBodyPosition;
    document.body.style.top = this.previousBodyTop;
    document.body.style.left = this.previousBodyLeft;
    document.body.style.right = this.previousBodyRight;
    document.body.style.width = this.previousBodyWidth;

    if (this.scrollOffsetY > 0) {
      window.scrollTo({ top: this.scrollOffsetY, left: 0, behavior: 'auto' });
    }
  }
}
