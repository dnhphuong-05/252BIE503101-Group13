import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendListResponse, BackendPagination } from '../../../../models';
import { environment } from '../../../../../environments/environment';
import { NotificationService } from '../../../../core/services/notification.service';

type GuestStatus = 'new' | 'active' | 'inactive';

interface GuestApi {
  guest_id: string;
  full_name: string;
  phone?: string;
  email?: string;
  address?: {
    province?: string;
    district?: string;
    ward?: string;
    detail?: string;
  };
  order_count?: number;
  total_spent?: number;
  last_order_at?: string | null;
  created_at?: string;
  createdAt?: string;
  notes?: string;
}

interface GuestRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: GuestStatus;
  orderCount: number;
  createdAt: string;
}

interface GuestListResponse {
  success: boolean;
  data: GuestApi[];
  pagination: BackendPagination;
  message?: string;
}

interface OrderRow {
  code: string;
  status: string;
  total: number;
  createdAt: string;
}

type SelectedGuest = GuestApi & {
  status: GuestStatus;
  createdLabel?: string;
  addressLabel?: string;
};

@Component({
  selector: 'app-guest-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guest-list.html',
  styleUrl: './guest-list.css',
})
export class GuestListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly statusMeta: Record<GuestStatus, { label: string; class: string }> = {
    new: { label: 'Mới', class: 'badge badge-warning' },
    active: { label: 'Đang hoạt động', class: 'badge badge-success' },
    inactive: { label: 'Không hoạt động', class: 'badge badge-neutral' },
  };

  protected readonly statusFilters: Array<{ value: 'all' | GuestStatus; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'new', label: 'Mới' },
    { value: 'active', label: 'Đang hoạt động' },
    { value: 'inactive', label: 'Không hoạt động' },
  ];

  protected readonly sortOptions: Array<{ value: string; label: string }> = [
    { value: 'created_at', label: 'Ngày tạo' },
    { value: 'order_count', label: 'Tổng đơn' },
  ];

  protected readonly sortOrders: Array<{ value: 'asc' | 'desc'; label: string }> = [
    { value: 'desc', label: 'Giảm dần' },
    { value: 'asc', label: 'Tăng dần' },
  ];

  protected guests: GuestRow[] = [];
  protected total = 0;
  protected page = 1;
  protected pages = 1;
  protected limit = 20;
  protected isLoading = false;
  protected loadError = '';

  protected searchTerm = '';
  protected statusFilter: 'all' | GuestStatus = 'all';
  protected sortBy = 'created_at';
  protected sortOrder: 'asc' | 'desc' = 'desc';

  protected selectedGuest: SelectedGuest | null = null;
  protected detailLoading = false;
  protected ordersLoading = false;
  protected buyOrders: OrderRow[] = [];
  protected rentOrders: OrderRow[] = [];
  protected detailMode = false;
  protected isInviting = false;

  private searchTimer?: ReturnType<typeof setTimeout>;
  private pendingGuestId: string | null = null;

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.detailMode = Boolean(data['detail']);
      if (!this.detailMode) {
        this.selectedGuest = null;
        this.buyOrders = [];
        this.rentOrders = [];
      }
      this.loadGuests();
    });

    this.route.paramMap.subscribe((params) => {
      this.pendingGuestId = params.get('id');
      if (this.detailMode && this.pendingGuestId && this.guests.length > 0) {
        this.fetchGuestDetail(this.pendingGuestId);
      }
    });
  }

  protected applyFilters(): void {
    this.page = 1;
    this.loadGuests();
  }

  protected onSearchInput(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.applyFilters(), 350);
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.sortBy = 'created_at';
    this.sortOrder = 'desc';
    this.page = 1;
    this.loadGuests();
  }

  protected onPageChange(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.pages) return;
    this.page = nextPage;
    this.loadGuests();
  }

  protected onView(guest: GuestRow): void {
    if (!this.detailMode) {
      this.router.navigate(['/users/guests', guest.id]);
      return;
    }
    this.fetchGuestDetail(guest.id);
  }

  protected backToList(): void {
    this.router.navigate(['/users/guests']);
  }

  protected inviteToRegister(): void {
    if (!this.selectedGuest) {
      this.notification.showError('Không tìm thấy thông tin khách để gửi lời mời');
      return;
    }

    if (!this.selectedGuest.email) {
      this.notification.showError('Khách này chưa có email để gửi lời mời đăng ký');
      return;
    }

    if (this.isInviting) {
      return;
    }

    this.isInviting = true;
    this.http
      .post<{ success: boolean; message?: string }>(
        `${this.apiUrl}/guest-customers/${this.selectedGuest.guest_id}/invite-register`,
        {},
      )
      .subscribe({
        next: (response) => {
          this.notification.showSuccess(response.message || 'Đã gửi email mời đăng ký');
          this.isInviting = false;
        },
        error: (error) => {
          const message =
            error?.error?.message || 'Gửi email mời đăng ký thất bại. Vui lòng thử lại';
          this.notification.showError(message);
          this.isInviting = false;
        },
      });
  }

  protected formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  protected formatDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  protected orderProgressPercent(status: string | null | undefined): number {
    const normalized = this.normalizeStatus(status);
    if (
      normalized.includes('complete') ||
      normalized.includes('closed') ||
      normalized.includes('deliver') ||
      normalized.includes('done') ||
      normalized.includes('success') ||
      normalized.includes('hoàn') ||
      normalized.includes('hoan')
    ) {
      return 100;
    }
    if (
      normalized.includes('cancel') ||
      normalized.includes('fail') ||
      normalized.includes('refund') ||
      normalized.includes('hủy') ||
      normalized.includes('huy')
    ) {
      return 25;
    }
    if (
      normalized.includes('confirm') ||
      normalized.includes('process') ||
      normalized.includes('shipping') ||
      normalized.includes('pending') ||
      normalized.includes('active') ||
      normalized.includes('đang') ||
      normalized.includes('dang')
    ) {
      return 68;
    }
    return 45;
  }

  protected orderProgressColor(status: string | null | undefined): string {
    const normalized = this.normalizeStatus(status);
    if (
      normalized.includes('complete') ||
      normalized.includes('closed') ||
      normalized.includes('deliver') ||
      normalized.includes('done') ||
      normalized.includes('success') ||
      normalized.includes('hoàn') ||
      normalized.includes('hoan')
    ) {
      return '#15803d';
    }
    if (
      normalized.includes('cancel') ||
      normalized.includes('fail') ||
      normalized.includes('refund') ||
      normalized.includes('hủy') ||
      normalized.includes('huy')
    ) {
      return '#b91c1c';
    }
    return '#1d4ed8';
  }

  private loadGuests(): void {
    this.isLoading = true;
    this.loadError = '';

    let params = new HttpParams({
      fromObject: {
        page: this.page.toString(),
        limit: this.limit.toString(),
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
      },
    });

    if (this.searchTerm.trim()) {
      params = params.set('search', this.searchTerm.trim());
    }
    if (this.statusFilter !== 'all') {
      params = params.set('status', this.statusFilter);
    }

    this.http.get<GuestListResponse>(`${this.apiUrl}/guest-customers`, { params }).subscribe({
      next: (response) => {
        const items = response.data ?? [];
        this.guests = items.map((guest) => this.mapGuestRow(guest));
        this.total = response.pagination?.total ?? this.guests.length;
        this.pages = response.pagination?.pages ?? 1;
        if (this.detailMode && this.pendingGuestId) {
          this.fetchGuestDetail(this.pendingGuestId);
        } else if (!this.detailMode) {
          this.selectedGuest = null;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load guests:', error);
        this.loadError = 'Không thể tải danh sách khách vãng lai';
        this.guests = [];
        this.total = 0;
        this.pages = 1;
        this.isLoading = false;
      },
    });
  }

  private fetchGuestDetail(guestId: string): void {
    this.detailLoading = true;
    this.selectedGuest = null;
    this.buyOrders = [];
    this.rentOrders = [];

    this.http
      .get<{ success: boolean; data?: GuestApi }>(`${this.apiUrl}/guest-customers/${guestId}`)
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.detailLoading = false;
            return;
          }
          const status = this.resolveGuestStatus(response.data);
          const createdAt = response.data.created_at ?? response.data.createdAt ?? '';
          this.selectedGuest = {
            ...response.data,
            status,
            createdLabel: createdAt ? this.formatDateTime(createdAt) : '-',
            addressLabel: this.formatGuestAddress(response.data),
          };
          this.detailLoading = false;
          this.fetchOrders(guestId);
        },
        error: () => {
          this.detailLoading = false;
          this.notification.showError('Không thể tải chi tiết khách');
        },
      });
  }

  private fetchOrders(guestId: string): void {
    this.ordersLoading = true;
    const params = new HttpParams({ fromObject: { page: '1', limit: '5' } });
    let pending = 2;

    const done = () => {
      pending -= 1;
      if (pending <= 0) {
        this.ordersLoading = false;
      }
    };

    this.http
      .get<{ data?: BackendListResponse<any> }>(`${this.apiUrl}/buy-orders/guest/${guestId}`, {
        params,
      })
      .subscribe({
        next: (response) => {
          const items = response.data?.items ?? [];
          this.buyOrders = items.map((order) => ({
            code: order.order_code || order.order_id,
            status: order.order_status || '-',
            total: order.total_amount || 0,
            createdAt: this.formatDateTime(order.created_at),
          }));
          done();
        },
        error: () => {
          done();
        },
      });

    this.http
      .get<{ data?: BackendListResponse<any> }>(`${this.apiUrl}/rent-orders/guest/${guestId}`, {
        params,
      })
      .subscribe({
        next: (response) => {
          const items = response.data?.items ?? [];
          this.rentOrders = items.map((order) => ({
            code: order.rent_order_code || order.rent_order_id,
            status: order.rent_status || '-',
            total: order.pricing?.total_due_today || 0,
            createdAt: this.formatDateTime(order.created_at),
          }));
          done();
        },
        error: () => {
          done();
        },
      });
  }

  private resolveGuestStatus(guest: GuestApi): GuestStatus {
    if (!guest.order_count) return 'new';
    if (!guest.last_order_at) return 'inactive';
    const last = new Date(guest.last_order_at);
    if (Number.isNaN(last.getTime())) return 'inactive';
    const diffDays = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 ? 'active' : 'inactive';
  }

  private formatGuestAddress(guest: GuestApi): string {
    if (!guest.address) return '-';
    const parts = [
      guest.address.detail,
      guest.address.ward,
      guest.address.district,
      guest.address.province,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  }

  private mapGuestRow(guest: GuestApi): GuestRow {
    const status = this.resolveGuestStatus(guest);
    const createdAt = guest.created_at ?? guest.createdAt ?? '';
    return {
      id: guest.guest_id,
      name: guest.full_name,
      phone: guest.phone || '-',
      email: guest.email || '-',
      status,
      orderCount: guest.order_count ?? 0,
      createdAt: createdAt ? this.formatDate(createdAt) : '-',
    };
  }

  private normalizeStatus(value: string | null | undefined): string {
    return String(value || '').trim().toLowerCase();
  }
}
