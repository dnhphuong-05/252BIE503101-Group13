import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { NotificationService } from '../../../../core/services/notification.service';
import { ApiResponse, BackendListResponse } from '../../../../models';

type TailorOrderStatus =
  | 'created'
  | 'consulted'
  | 'sample_confirmed'
  | 'tailoring'
  | 'fitting_adjustment'
  | 'completed'
  | 'delivered'
  | 'cancelled';

interface TailorOrderApi {
  _id?: string;
  id?: string;
  tailor_order_code?: string;
  tailor_order_id: string;
  status: TailorOrderStatus;
  created_at: string;
  updated_at?: string;
  customer: {
    full_name?: string;
    phone?: string;
  };
  product?: {
    title?: string;
    reference_product_name?: string;
  };
  pricing?: {
    total_amount?: number;
  };
}

interface TailorOrderRow {
  id: string;
  customer: string;
  phone: string;
  title: string;
  status: TailorOrderStatus;
  totalAmount: number;
  updatedAt: string;
  createdAt: string;
}

@Component({
  selector: 'app-tailor-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tailor-orders.html',
  styleUrl: './tailor-orders.css',
})
export class TailorOrdersComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = environment.apiUrl;
  private searchTimer?: ReturnType<typeof setTimeout>;

  protected readonly statusMeta: Record<TailorOrderStatus, { label: string; class: string }> = {
    created: { label: 'M\u1edbi t\u1ea1o', class: 'badge badge-warning' },
    consulted: { label: '\u0110\u00e3 t\u01b0 v\u1ea5n', class: 'badge badge-info' },
    sample_confirmed: { label: '\u0110\u00e3 ch\u1ed1t m\u1eabu', class: 'badge badge-info' },
    tailoring: { label: '\u0110ang may', class: 'badge badge-info' },
    fitting_adjustment: { label: 'Ch\u1edd th\u1eed/ch\u1ec9nh s\u1eeda', class: 'badge badge-info' },
    completed: { label: 'Ho\u00e0n th\u00e0nh', class: 'badge badge-success' },
    delivered: { label: '\u0110\u00e3 giao', class: 'badge badge-success' },
    cancelled: { label: '\u0110\u00e3 h\u1ee7y', class: 'badge badge-neutral' },
  };

  protected readonly statusFilters: Array<{ value: TailorOrderStatus | 'all'; label: string }> = [
    { value: 'all', label: 'T\u1ea5t c\u1ea3 tr\u1ea1ng th\u00e1i' },
    { value: 'created', label: 'M\u1edbi t\u1ea1o' },
    { value: 'consulted', label: '\u0110\u00e3 t\u01b0 v\u1ea5n' },
    { value: 'sample_confirmed', label: '\u0110\u00e3 ch\u1ed1t m\u1eabu' },
    { value: 'tailoring', label: '\u0110ang may' },
    { value: 'fitting_adjustment', label: 'Ch\u1edd th\u1eed/ch\u1ec9nh s\u1eeda' },
    { value: 'completed', label: 'Ho\u00e0n th\u00e0nh' },
    { value: 'delivered', label: '\u0110\u00e3 giao' },
    { value: 'cancelled', label: '\u0110\u00e3 h\u1ee7y' },
  ];

  protected orders: TailorOrderRow[] = [];
  protected total = 0;
  protected page = 1;
  protected pages = 1;
  protected limit = 20;
  protected searchTerm = '';
  protected statusFilter: TailorOrderStatus | 'all' = 'all';
  protected isLoading = false;
  protected loadError = '';

  ngOnInit(): void {
    this.loadOrders();
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
      this.page = 1;
      this.loadOrders();
    }, 300);
  }

  protected applyFilters(): void {
    this.page = 1;
    this.loadOrders();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.page = 1;
    this.loadOrders();
  }

  protected onPageChange(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.pages) {
      return;
    }
    this.page = nextPage;
    this.loadOrders();
  }

  protected refresh(): void {
    this.loadOrders();
  }

  protected openDetail(order: TailorOrderRow): void {
    const id = String(order.id || '').trim();
    if (!id) {
      this.notification.showError('Không tìm thấy mã đơn để xem chi tiết.');
      return;
    }
    this.router.navigate(['/orders/tailor', id]);
  }

  protected formatCurrency(value?: number | null): string {
    const amount = Number(value || 0);
    return `${new Intl.NumberFormat('vi-VN').format(amount)} VND`;
  }

  protected formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private loadOrders(): void {
    this.isLoading = true;
    this.loadError = '';

    let params = new HttpParams({
      fromObject: {
        page: String(this.page),
        limit: String(this.limit),
        sort: '-created_at',
      },
    });

    if (this.statusFilter !== 'all') {
      params = params.set('status', this.statusFilter);
    }

    if (this.searchTerm.trim()) {
      params = params.set('search', this.searchTerm.trim());
    }

    this.http
      .get<ApiResponse<BackendListResponse<TailorOrderApi>>>(`${this.apiUrl}/tailor-orders`, {
        params,
      })
      .subscribe({
        next: (response) => {
          const items = response.data?.items ?? [];
          this.orders = items.map((item) => this.mapOrderRow(item));
          this.total = response.data?.pagination.total ?? this.orders.length;
          this.pages = response.data?.pagination.pages ?? 1;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load tailor orders:', error);
          this.loadError = error?.error?.message || 'Kh\u00f4ng th\u1ec3 t\u1ea3i danh s\u00e1ch \u0111\u01a1n may \u0111o.';
          this.orders = [];
          this.total = 0;
          this.pages = 1;
          this.isLoading = false;
        },
      });
  }

  private mapOrderRow(order: TailorOrderApi): TailorOrderRow {
    const resolvedId = [
      order.tailor_order_id,
      order.tailor_order_code,
      order.id,
      order._id,
    ]
      .map((value) => String(value || '').trim())
      .find((value) => value.length > 0);

    return {
      id: resolvedId || '',
      customer: order.customer?.full_name || 'Kh\u00e1ch h\u00e0ng',
      phone: order.customer?.phone || '-',
      title: order.product?.title || order.product?.reference_product_name || '\u0110\u01a1n may \u0111o',
      status: this.normalizeStatus(order.status),
      totalAmount: Number(order.pricing?.total_amount || 0),
      updatedAt: this.formatDate(order.updated_at || order.created_at),
      createdAt: this.formatDate(order.created_at),
    };
  }

  private normalizeStatus(status: string | null | undefined): TailorOrderStatus {
    switch (String(status || '').trim()) {
      case 'created':
      case 'consulted':
      case 'sample_confirmed':
      case 'tailoring':
      case 'fitting_adjustment':
      case 'completed':
      case 'delivered':
      case 'cancelled':
        return status as TailorOrderStatus;
      case 'confirmed_request':
        return 'created';
      case 'quoted':
        return 'consulted';
      case 'order_confirmed':
        return 'sample_confirmed';
      case 'shipping':
        return 'completed';
      default:
        return 'created';
    }
  }
}
