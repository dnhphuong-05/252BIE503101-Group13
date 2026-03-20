import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiResponse, BackendListResponse } from '../../../../models';
import { environment } from '../../../../../environments/environment';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserRole } from '../../../../models/auth.model';

type UserStatus = 'active' | 'blocked';
type UserRoleLabel = 'customer' | 'staff' | 'admin' | 'super_admin';

interface UserRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRoleLabel;
  status: UserStatus;
  createdAt: string;
  avatar?: string;
  buyOrderCount: number;
  rentOrderCount: number;
}

interface UserApi {
  _id: string;
  user_id: string;
  email: string;
  phone: string;
  role: UserRoleLabel;
  status: UserStatus;
  created_at: string;
  buy_order_count?: number;
  rent_order_count?: number;
  profile?: {
    full_name?: string;
    avatar?: string;
    gender?: string | null;
    birthday?: string | null;
    size_standard?: string | null;
    height?: number | null;
    weight?: number | null;
  } | null;
}

interface Address {
  address_id: string;
  receiver_name: string;
  phone: string;
  province: string;
  district?: string;
  ward: string;
  address_detail?: string;
  detail?: string;
  note?: string | null;
  is_default?: boolean;
}

interface Measurement {
  measurement_id: string;
  measured_at?: string;
  unit?: string;
  neck?: number | null;
  shoulder?: number | null;
  chest?: number | null;
  waist?: number | null;
  hip?: number | null;
  sleeve?: number | null;
  arm?: number | null;
  back_length?: number | null;
  leg_length?: number | null;
}

interface LoyaltyInfo {
  total_points?: number;
  tier?: string;
}

interface UserDetailApi extends UserApi {
  addresses?: Address[];
  latest_measurement?: Measurement | null;
  measurements?: Measurement[];
  loyalty?: LoyaltyInfo | null;
}

interface LoyaltyTransaction {
  txn_id: string;
  type: 'earn' | 'spend' | 'adjust';
  points: number;
  reason?: string;
  ref_type?: string | null;
  ref_id?: string | null;
  created_at: string;
}

interface OrderRow {
  code: string;
  status: string;
  total: number;
  createdAt: string;
}

type SelectedUser = UserDetailApi & { id: string; createdLabel?: string };

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
})
export class UserListComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly roleMeta: Record<UserRoleLabel, { label: string; class: string }> = {
    super_admin: { label: 'Quản trị cấp cao', class: 'chip chip-accent' },
    admin: { label: 'Quản trị viên', class: 'chip chip-info' },
    staff: { label: 'Nhân viên', class: 'chip chip-neutral' },
    customer: { label: 'Khách hàng', class: 'chip chip-soft' },
  };

  protected readonly statusMeta: Record<UserStatus, { label: string; class: string }> = {
    active: { label: 'Hoạt động', class: 'badge badge-success' },
    blocked: { label: 'Đã khóa', class: 'badge badge-error' },
  };

  protected readonly roleFilters: Array<{ value: 'all' | UserRoleLabel; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'customer', label: 'Khách hàng' },
    { value: 'staff', label: 'Nhân viên' },
    { value: 'admin', label: 'Quản trị viên' },
    { value: 'super_admin', label: 'Quản trị cấp cao' },
  ];

  protected readonly statusFilters: Array<{ value: 'all' | UserStatus; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'active', label: 'Hoạt động' },
    { value: 'blocked', label: 'Đã khóa' },
  ];

  protected users: UserRow[] = [];
  protected total = 0;
  protected page = 1;
  protected pages = 1;
  protected limit = 20;
  protected isLoading = false;
  protected loadError = '';

  protected searchTerm = '';
  protected roleFilter: 'all' | UserRoleLabel = 'all';
  protected statusFilter: 'all' | UserStatus = 'all';

  protected selectedUser: SelectedUser | null = null;
  protected detailLoading = false;
  protected ordersLoading = false;
  protected loyaltyLoading = false;
  protected isUpdating = false;
  protected passwordUpdating = false;
  protected buyOrders: OrderRow[] = [];
  protected rentOrders: OrderRow[] = [];
  protected loyaltyTransactions: LoyaltyTransaction[] = [];
  protected detailMode = false;
  protected readonly avatarErrorIds = new Set<string>();
  protected detailAvatarFailed = false;
  protected roleConfirmOpen = false;
  protected pendingRoleChange: UserRoleLabel | null = null;
  protected currentRoleLabelForConfirm = '';
  protected nextRoleLabelForConfirm = '';

  private searchTimer?: ReturnType<typeof setTimeout>;
  private pendingUserId: string | null = null;

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.detailMode = Boolean(data['detail']);
      if (!this.detailMode) {
        this.selectedUser = null;
        this.buyOrders = [];
        this.rentOrders = [];
        this.loyaltyTransactions = [];
      }
      this.loadUsers();
    });

    this.route.paramMap.subscribe((params) => {
      this.pendingUserId = params.get('id');
      if (this.detailMode && this.pendingUserId && this.users.length > 0) {
        this.fetchUserDetail(this.pendingUserId);
      }
    });
  }

  protected applyFilters(): void {
    this.page = 1;
    this.loadUsers();
  }

  protected onSearchInput(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.applyFilters(), 350);
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.roleFilter = 'all';
    this.statusFilter = 'all';
    this.page = 1;
    this.loadUsers();
  }

  protected onPageChange(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.pages) return;
    this.page = nextPage;
    this.loadUsers();
  }

  protected onView(user: UserRow): void {
    if (!this.detailMode) {
      this.router.navigate(['/users', user.id]);
      return;
    }
    this.fetchUserDetail(user.id);
  }

  protected onListAvatarError(userId: string): void {
    this.avatarErrorIds.add(userId);
  }

  protected onDetailAvatarError(): void {
    this.detailAvatarFailed = true;
  }

  protected backToList(): void {
    this.router.navigate(['/users']);
  }

  protected toggleStatus(): void {
    if (!this.selectedUser || this.isUpdating) return;
    const nextStatus: UserStatus = this.selectedUser.status === 'active' ? 'blocked' : 'active';
    this.updateStatus(this.selectedUser.id, nextStatus);
  }

  protected requestRoleChange(event: Event): void {
    if (!this.selectedUser || !this.canManageRoles() || this.isUpdating) return;
    const selectEl = event.target as HTMLSelectElement | null;
    const currentRole = this.selectedUser.role;
    const nextRole = (selectEl?.value || currentRole) as UserRoleLabel;
    if (selectEl) {
      // Keep visual value at current role until user explicitly confirms.
      selectEl.value = currentRole;
    }
    if (currentRole === nextRole) return;
    this.pendingRoleChange = nextRole;
    this.currentRoleLabelForConfirm = this.roleMeta[currentRole].label;
    this.nextRoleLabelForConfirm = this.roleMeta[nextRole].label;
    this.roleConfirmOpen = true;
  }

  protected cancelRoleChange(): void {
    this.roleConfirmOpen = false;
    this.pendingRoleChange = null;
    this.currentRoleLabelForConfirm = '';
    this.nextRoleLabelForConfirm = '';
  }

  protected confirmRoleChange(): void {
    if (!this.selectedUser || !this.pendingRoleChange) {
      this.cancelRoleChange();
      return;
    }
    const nextRole = this.pendingRoleChange;
    this.roleConfirmOpen = false;
    this.pendingRoleChange = null;
    this.currentRoleLabelForConfirm = '';
    this.nextRoleLabelForConfirm = '';
    this.updateRole(nextRole);
  }

  protected updateRole(nextRole: UserRoleLabel): void {
    if (!this.selectedUser || !this.canManageRoles() || this.isUpdating) return;
    if (this.selectedUser.role === nextRole) return;
    const previousDetail = this.selectedUser;
    const previousRole = this.selectedUser.role;
    const selectedUserId = this.selectedUser.id;
    this.isUpdating = true;

    // Optimistic UI: reflect the selected role immediately.
    this.selectedUser = { ...this.selectedUser, role: nextRole };
    this.users = this.users.map((item) =>
      item.id === selectedUserId ? { ...item, role: nextRole } : item,
    );

    this.http
      .patch<ApiResponse<UserDetailApi>>(`${this.apiUrl}/admin/users/${selectedUserId}/role`, {
        role: nextRole,
      })
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.isUpdating = false;
            return;
          }
          const normalized = { ...response.data, role: nextRole };
          this.selectedUser = this.mergeDetail(normalized, previousDetail);
          this.users = this.users.map((item) =>
            item.id === normalized._id ? this.mapUserRow(normalized) : item,
          );
          this.notification.showSuccess('Cập nhật role thành công');
          this.isUpdating = false;
        },
        error: () => {
          this.selectedUser = { ...previousDetail, role: previousRole };
          this.users = this.users.map((item) =>
            item.id === selectedUserId ? { ...item, role: previousRole } : item,
          );
          this.isUpdating = false;
          this.notification.showError('Không thể cập nhật role');
        },
      });
  }

  protected resetPassword(): void {
    if (!this.selectedUser || this.passwordUpdating) return;
    const password = window.prompt('Nhập mật khẩu tạm (>=8 ký tự)');
    if (!password) return;
    if (password.length < 8) {
      this.notification.showWarning('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    this.passwordUpdating = true;
    this.http
      .post<ApiResponse<{ message: string }>>(
        `${this.apiUrl}/admin/users/${this.selectedUser.id}/reset-password`,
        { password },
      )
      .subscribe({
        next: () => {
          this.notification.showSuccess('Đã reset mật khẩu');
          this.passwordUpdating = false;
        },
        error: () => {
          this.notification.showError('Không thể reset mật khẩu');
          this.passwordUpdating = false;
        },
      });
  }

  protected canManageRoles(): boolean {
    const current = this.authService.currentUser();
    return current?.role === UserRole.SUPER_ADMIN;
  }

  protected initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  protected formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected formatDate(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  protected formatDateTime(value: string): string {
    if (!value) return '';
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

  protected formatAddress(address: Address): string {
    const parts = [
      address.address_detail || address.detail,
      address.ward,
      address.district,
      address.province,
    ].filter(Boolean);
    return parts.join(', ');
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

  protected measurementCompleteness(measurement?: Measurement | null): number {
    if (!measurement) return 0;
    const values = [
      measurement.neck,
      measurement.shoulder,
      measurement.chest,
      measurement.waist,
      measurement.hip,
      measurement.sleeve,
      measurement.arm,
      measurement.back_length,
      measurement.leg_length,
    ];
    const filled = values.filter((value) => value !== null && value !== undefined).length;
    return Math.round((filled / values.length) * 100);
  }

  protected loyaltyProgressPercent(): number {
    const points = this.currentLoyaltyPoints();
    if (points < 100) return Math.round((points / 100) * 100);
    if (points < 300) return Math.round(((points - 100) / 200) * 100);
    if (points < 700) return Math.round(((points - 300) / 400) * 100);
    return 100;
  }

  protected loyaltyNextTierLabel(): string {
    const points = this.currentLoyaltyPoints();
    if (points < 100) return 'Bạc';
    if (points < 300) return 'Vàng';
    if (points < 700) return 'Bạch kim';
    return 'Kim cương';
  }

  protected loyaltyPointsToNextTier(): number {
    const points = this.currentLoyaltyPoints();
    if (points < 100) return 100 - points;
    if (points < 300) return 300 - points;
    if (points < 700) return 700 - points;
    return 0;
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.loadError = '';

    let params = new HttpParams({
      fromObject: {
        page: this.page.toString(),
        limit: this.limit.toString(),
      },
    });

    if (this.searchTerm.trim()) {
      params = params.set('search', this.searchTerm.trim());
    }
    if (this.roleFilter !== 'all') {
      params = params.set('role', this.roleFilter);
    }
    if (this.statusFilter !== 'all') {
      params = params.set('status', this.statusFilter);
    }

    this.http
      .get<ApiResponse<BackendListResponse<UserApi>>>(`${this.apiUrl}/admin/users`, {
        params,
      })
      .subscribe({
        next: (response) => {
          const items = response.data?.items ?? [];
          this.users = items.map((user) => this.mapUserRow(user));
          this.avatarErrorIds.clear();
          this.total = response.data?.pagination.total ?? this.users.length;
          this.pages = response.data?.pagination.pages ?? 1;
          if (this.detailMode && this.pendingUserId) {
            this.fetchUserDetail(this.pendingUserId);
          } else if (!this.detailMode) {
            this.selectedUser = null;
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load users:', error);
          this.loadError = 'Không thể tải danh sách người dùng';
          this.users = [];
          this.total = 0;
          this.pages = 1;
          this.isLoading = false;
        },
      });
  }

  private fetchUserDetail(id: string): void {
    this.detailLoading = true;
    this.detailAvatarFailed = false;
    this.selectedUser = null;
    this.buyOrders = [];
    this.rentOrders = [];
    this.loyaltyTransactions = [];

    this.http.get<ApiResponse<UserDetailApi>>(`${this.apiUrl}/admin/users/${id}`).subscribe({
      next: (response) => {
        if (!response.data) {
          this.detailLoading = false;
          return;
        }
        this.selectedUser = {
          ...response.data,
          id: response.data._id,
          createdLabel: this.formatDateTime(response.data.created_at),
        };
        this.detailLoading = false;
        if (response.data.user_id) {
          this.fetchOrders(response.data.user_id);
        }
        this.fetchLoyaltyTransactions(id);
      },
      error: () => {
        this.detailLoading = false;
        this.notification.showError('Không thể tải chi tiết user');
      },
    });
  }

  private fetchOrders(userId: string): void {
    this.ordersLoading = true;
    const params = new HttpParams({ fromObject: { page: '1', limit: '5' } });

    this.http
      .get<ApiResponse<BackendListResponse<any>>>(`${this.apiUrl}/buy-orders/user/${userId}`, {
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
          this.ordersLoading = false;
        },
        error: () => {
          this.ordersLoading = false;
        },
      });

    this.http
      .get<ApiResponse<BackendListResponse<any>>>(`${this.apiUrl}/rent-orders/user/${userId}`, {
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
        },
        error: () => {},
      });
  }

  private fetchLoyaltyTransactions(userId: string): void {
    this.loyaltyLoading = true;
    const params = new HttpParams({ fromObject: { page: '1', limit: '5' } });

    this.http
      .get<ApiResponse<BackendListResponse<LoyaltyTransaction>>>(
        `${this.apiUrl}/admin/users/${userId}/loyalty-transactions`,
        { params },
      )
      .subscribe({
        next: (response) => {
          this.loyaltyTransactions = response.data?.items ?? [];
          this.loyaltyLoading = false;
        },
        error: () => {
          this.loyaltyLoading = false;
        },
      });
  }

  private updateStatus(userId: string, status: UserStatus): void {
    this.isUpdating = true;
    const previousDetail = this.selectedUser;
    this.http
      .patch<ApiResponse<UserDetailApi>>(`${this.apiUrl}/admin/users/${userId}/status`, {
        status,
      })
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.isUpdating = false;
            return;
          }
          this.selectedUser = this.mergeDetail(response.data, previousDetail);
          this.users = this.users.map((item) =>
            item.id === response.data!._id ? this.mapUserRow(response.data!) : item,
          );
          this.notification.showSuccess('Cập nhật trạng thái thành công');
          this.isUpdating = false;
        },
        error: () => {
          this.isUpdating = false;
          this.notification.showError('Không thể cập nhật trạng thái');
        },
      });
  }

  private mapUserRow(user: UserApi): UserRow {
    return {
      id: user._id,
      user_id: user.user_id,
      name: user.profile?.full_name || user.email || user.user_id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      createdAt: this.formatDate(user.created_at),
      avatar: user.profile?.avatar || '',
      buyOrderCount: user.buy_order_count ?? 0,
      rentOrderCount: user.rent_order_count ?? 0,
    };
  }

  private mergeDetail(user: UserDetailApi, previousDetail: SelectedUser | null): SelectedUser {
    return {
      ...user,
      id: user._id,
      createdLabel: this.formatDateTime(user.created_at),
      addresses: user.addresses ?? previousDetail?.addresses ?? [],
      latest_measurement:
        user.latest_measurement ?? previousDetail?.latest_measurement ?? null,
      measurements: user.measurements ?? previousDetail?.measurements ?? [],
      loyalty: user.loyalty ?? previousDetail?.loyalty ?? null,
    };
  }

  private currentLoyaltyPoints(): number {
    return Math.max(0, Number(this.selectedUser?.loyalty?.total_points ?? 0));
  }

  private normalizeStatus(value: string | null | undefined): string {
    return String(value || '').trim().toLowerCase();
  }
}
