import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../services/product.service';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-modal.html',
  styleUrl: './product-modal.css',
})
export class ProductModal implements OnChanges {
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] || changes['show']) {
      this.resetSelections();
    }
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
}
