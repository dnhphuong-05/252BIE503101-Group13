import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface Cart {
  cart_id: string;
  user_id: string;
  status: 'active' | 'checked_out';
  updated_at: string;
}

export interface CartItem {
  cart_item_id?: string;
  cart_id?: string;
  product_id: number;
  product_name_snapshot: string;
  thumbnail_snapshot?: string;
  price_snapshot: number;
  size?: string | null;
  color?: string | null;
  quantity: number;
  created_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly buyNowKey = 'checkout_buy_now_items';
  private apiUrl = `${environment.apiUrl}/carts`;
  private itemsSubject = new BehaviorSubject<CartItem[]>([]);
  private countSubject = new BehaviorSubject<number>(0);
  private cartSubject = new BehaviorSubject<Cart | null>(null);

  items$ = this.itemsSubject.asObservable();
  itemCount$ = this.countSubject.asObservable();
  cart$ = this.cartSubject.asObservable();

  constructor(
    private authService: AuthService,
    private http: HttpClient,
  ) {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.refreshCart();
      } else {
        this.resetState();
      }
    });
  }

  refreshCart(): void {
    if (!this.authService.isLoggedIn()) {
      this.resetState();
      return;
    }

    this.http
      .get<{ success: boolean; data: { cart: Cart; items: CartItem[] } }>(
        `${this.apiUrl}/me`,
      )
      .pipe(
        tap((res) => {
          this.applyCart(res.data.cart, res.data.items);
        }),
        catchError(() => {
          this.resetState();
          return of(null);
        }),
      )
      .subscribe();
  }

  loadCart(): Observable<{ cart: Cart; items: CartItem[] }> {
    if (!this.authService.isLoggedIn()) {
      this.resetState();
      return of({ cart: null as any, items: [] });
    }

    return this.http
      .get<{ success: boolean; data: { cart: Cart; items: CartItem[] } }>(
        `${this.apiUrl}/me`,
      )
      .pipe(
        tap((res) => this.applyCart(res.data.cart, res.data.items)),
        map((res) => res.data),
      );
  }

  addItem(
    product_id: number,
    quantity: number = 1,
    size?: string | null,
    color?: string | null,
  ): Observable<CartItem> {
    return this.http
      .post<{ success: boolean; data: CartItem }>(`${this.apiUrl}/items`, {
        product_id,
        quantity,
        size,
        color,
      })
      .pipe(
        tap(() => this.refreshCart()),
        map((res) => res.data),
      );
  }

  updateQuantity(cart_item_id: string, quantity: number): Observable<CartItem> {
    return this.http
      .patch<{ success: boolean; data: CartItem }>(
        `${this.apiUrl}/items/${cart_item_id}`,
        { quantity },
      )
      .pipe(
        tap(() => this.refreshCart()),
        map((res) => res.data),
      );
  }

  removeItem(cart_item_id: string): Observable<CartItem> {
    return this.http
      .delete<{ success: boolean; data: CartItem }>(
        `${this.apiUrl}/items/${cart_item_id}`,
      )
      .pipe(
        tap(() => this.refreshCart()),
        map((res) => res.data),
      );
  }

  clearCart(): Observable<{ removed: number }> {
    return this.http
      .delete<{ success: boolean; data: { removed: number } }>(
        `${this.apiUrl}/items`,
      )
      .pipe(
        tap(() => this.refreshCart()),
        map((res) => res.data),
      );
  }

  checkout(): Observable<Cart> {
    return this.http
      .post<{ success: boolean; data: Cart }>(`${this.apiUrl}/checkout`, {})
      .pipe(
        tap((res) => {
          this.applyCart(res.data, []);
        }),
        map((res) => res.data),
      );
  }

  getItemsSnapshot(): CartItem[] {
    return [...this.itemsSubject.value];
  }

  setBuyNowItems(items: CartItem[]): void {
    sessionStorage.setItem(this.buyNowKey, JSON.stringify(items));
  }

  getBuyNowItems(): CartItem[] | null {
    const raw = sessionStorage.getItem(this.buyNowKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  clearBuyNowItems(): void {
    sessionStorage.removeItem(this.buyNowKey);
  }

  private applyCart(cart: Cart, items: CartItem[]): void {
    this.cartSubject.next(cart);
    this.itemsSubject.next(items);
    this.countSubject.next(this.getItemCount(items));
  }

  private resetState(): void {
    this.cartSubject.next(null);
    this.itemsSubject.next([]);
    this.countSubject.next(0);
  }

  private getItemCount(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }
}
