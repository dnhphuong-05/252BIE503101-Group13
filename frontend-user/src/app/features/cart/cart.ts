import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartItem, CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart implements OnInit, OnDestroy {
  items: CartItem[] = [];
  isLoggedIn = false;
  selectedKeys = new Set<string>();
  private selectionInitialized = false;
  private knownKeys = new Set<string>();
  private subscriptions: Subscription[] = [];

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();

    this.subscriptions.push(
      this.authService.currentUser$.subscribe((user) => {
        this.isLoggedIn = !!user;
        if (this.isLoggedIn) {
          this.cartService.refreshCart();
        }
      }),
    );

    this.subscriptions.push(
      this.cartService.items$.subscribe((items) => {
        this.items = items;
        this.syncSelection(items);
      }),
    );

    if (this.isLoggedIn) {
      this.cartService.refreshCart();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  goToLogin(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
  }

  goToCheckout(): void {
    if (!this.items.length) return;
    const selectedItems = this.getSelectedItems();
    if (selectedItems.length === 0) {
      alert('Vui lòng chọn sản phẩm cần thanh toán.');
      return;
    }

    if (selectedItems.length === this.items.length) {
      this.cartService.clearBuyNowItems();
      this.router.navigate(['/check-out']);
      return;
    }

    this.cartService.setBuyNowItems(selectedItems);
    this.router.navigate(['/check-out']);
  }

  increase(item: CartItem): void {
    if (!item.cart_item_id) return;
    this.cartService.updateQuantity(item.cart_item_id, item.quantity + 1).subscribe();
  }

  decrease(item: CartItem): void {
    if (!item.cart_item_id) return;
    this.cartService
      .updateQuantity(item.cart_item_id, Math.max(1, item.quantity - 1))
      .subscribe();
  }

  removeItem(item: CartItem): void {
    if (!item.cart_item_id) return;
    this.cartService.removeItem(item.cart_item_id).subscribe();
  }

  clearCart(): void {
    this.cartService.clearCart().subscribe();
  }

  itemTotal(item: CartItem): number {
    return item.price_snapshot * item.quantity;
  }

  get subtotal(): number {
    return this.getSelectedItems().reduce((sum, item) => sum + this.itemTotal(item), 0);
  }

  get shippingFee(): number {
    return this.getSelectedItems().length ? 30000 : 0;
  }

  get total(): number {
    return this.subtotal + this.shippingFee;
  }

  itemKey(item: CartItem): string {
    return item.cart_item_id || `${item.product_id}`;
  }

  isSelected(item: CartItem): boolean {
    return this.selectedKeys.has(this.itemKey(item));
  }

  toggleItem(item: CartItem, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const key = this.itemKey(item);
    if (checked) {
      this.selectedKeys.add(key);
    } else {
      this.selectedKeys.delete(key);
    }
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedKeys = new Set(this.items.map((item) => this.itemKey(item)));
    } else {
      this.selectedKeys = new Set();
    }
  }

  get allSelected(): boolean {
    return this.items.length > 0 && this.items.every((item) => this.isSelected(item));
  }

  get selectedCount(): number {
    return this.getSelectedItems().length;
  }

  getSelectedItems(): CartItem[] {
    return this.items.filter((item) => this.isSelected(item));
  }

  private syncSelection(items: CartItem[]): void {
    const currentKeys = new Set(items.map((item) => this.itemKey(item)));

    if (!this.selectionInitialized) {
      this.selectedKeys = new Set(currentKeys);
      this.selectionInitialized = true;
      this.knownKeys = currentKeys;
      return;
    }

    const nextSelected = new Set<string>();
    items.forEach((item) => {
      const key = this.itemKey(item);
      if (this.selectedKeys.has(key)) {
        nextSelected.add(key);
      } else if (!this.knownKeys.has(key)) {
        nextSelected.add(key);
      }
    });

    this.selectedKeys = nextSelected;
    this.knownKeys = currentKeys;
  }

  getImageUrl(item: CartItem): string {
    return item.thumbnail_snapshot || 'assets/images/placeholder.jpg';
  }
}
