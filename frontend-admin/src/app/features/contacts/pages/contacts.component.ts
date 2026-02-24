import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse, BackendListResponse } from '../../../models';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';

type ContactStatus = 'new' | 'processing' | 'replied' | 'closed';
type ContactPurpose = 'consult' | 'rent' | 'buy' | 'custom' | 'cooperation';

interface ContactMessageApi {
  contact_id: number;
  full_name?: string;
  fullName?: string;
  email: string;
  phone: string;
  purpose: ContactPurpose;
  status: ContactStatus | 'done' | 'cancelled';
  created_at?: string;
  createdAt?: string;
  message: string;
  admin_note?: string;
  replied_at?: string;
  replied_by?: string;
}

interface ContactMessage {
  contact_id: number;
  full_name: string;
  email: string;
  phone: string;
  purpose: ContactPurpose;
  purposeLabel: string;
  status: ContactStatus;
  message: string;
  admin_note: string;
  replied_at?: string;
  replied_by?: string;
  created_at: string;
  createdLabel: string;
}

interface ContactStatsResponse {
  statusStats: {
    total: number;
    new: number;
    processing: number;
    replied: number;
    closed: number;
  };
}

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.css',
})
export class ContactsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly notification = inject(NotificationService);

  protected readonly statusMeta: Record<ContactStatus, string> = {
    new: 'badge badge-warning',
    processing: 'badge badge-info',
    replied: 'badge badge-success',
    closed: 'badge badge-neutral',
  };

  protected readonly statusLabels: Record<ContactStatus, string> = {
    new: 'Mới',
    processing: 'Đang xử lý',
    replied: 'Đã xử lý',
    closed: 'Hoàn tất',
  };

  protected readonly statusFilters: Array<{ value: 'all' | ContactStatus; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'new', label: 'Mới' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'replied', label: 'Đã xử lý' },
    { value: 'closed', label: 'Hoàn tất' },
  ];

  protected messages: ContactMessage[] = [];
  protected total = 0;
  protected page = 1;
  protected pages = 1;
  protected limit = 20;
  protected isLoading = false;
  protected loadError = '';

  protected stats = {
    total: 0,
    new: 0,
    processing: 0,
    replied: 0,
    closed: 0,
  };

  protected searchTerm = '';
  protected statusFilter: 'all' | ContactStatus = 'all';
  protected dateFrom = '';
  protected dateTo = '';

  protected noteDraft = '';
  protected isUpdating = false;
  private searchTimer?: ReturnType<typeof setTimeout>;

  protected selectedMessage: ContactMessage | null = null;

  ngOnInit(): void {
    this.loadStats();
    this.loadContacts();
  }

  protected selectMessage(id: number): void {
    const normalizedId = Number(id);
    const message =
      this.messages.find((item) => item.contact_id === normalizedId) || null;
    this.selectedMessage = message;
    this.noteDraft = message?.admin_note || '';
  }

  protected onView(message: ContactMessage, event?: Event): void {
    event?.stopPropagation();
    this.selectedMessage = message;
    this.noteDraft = message.admin_note || '';
    this.fetchContactDetail(message.contact_id);
    if (message.status === 'new') {
      this.updateStatus(message.contact_id, 'processing', this.noteDraft, true);
    }
  }

  protected applyFilters(): void {
    this.page = 1;
    this.loadContacts();
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
    this.dateFrom = '';
    this.dateTo = '';
    this.page = 1;
    this.loadContacts();
  }

  protected onPageChange(nextPage: number): void {
    if (nextPage < 1 || nextPage > this.pages) return;
    this.page = nextPage;
    this.loadContacts();
  }

  protected saveNote(): void {
    const message = this.selectedMessage;
    if (!message) return;
    this.updateStatus(message.contact_id, message.status, this.noteDraft);
  }

  protected setStatus(status: ContactStatus, silent = false): void {
    const message = this.selectedMessage;
    if (!message) return;
    this.updateStatus(message.contact_id, status, this.noteDraft, silent);
  }

  private loadContacts(): void {
    this.isLoading = true;
    this.loadError = '';

    let params = new HttpParams({
      fromObject: {
        page: this.page.toString(),
        limit: this.limit.toString(),
        sort: '-created_at',
      },
    });

    if (this.statusFilter !== 'all') {
      params = params.set('status', this.statusFilter);
    }
    if (this.searchTerm.trim()) {
      params = params.set('search', this.searchTerm.trim());
    }
    if (this.dateFrom) {
      params = params.set('from', this.dateFrom);
    }
    if (this.dateTo) {
      params = params.set('to', this.dateTo);
    }

    this.http
      .get<ApiResponse<BackendListResponse<ContactMessageApi>>>(`${this.apiUrl}/contact`, {
        params,
      })
      .subscribe({
        next: (response) => {
          const items = response.data?.items ?? [];
          this.messages = items.map((item) => this.mapApiMessage(item));
          this.total = response.data?.pagination.total ?? this.messages.length;
          this.pages = response.data?.pagination.pages ?? 1;
          const currentId = this.selectedMessage?.contact_id ?? null;
          if (currentId) {
            const updated =
              this.messages.find((message) => message.contact_id === currentId) || null;
            this.selectedMessage = updated;
            this.noteDraft = updated?.admin_note || '';
          } else {
            this.selectedMessage = null;
            this.noteDraft = '';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load contacts:', error);
          this.loadError = 'Không thể tải danh sách liên hệ';
          this.messages = [];
          this.total = 0;
          this.pages = 1;
          this.isLoading = false;
        },
      });
  }

  private loadStats(): void {
    this.http
      .get<ApiResponse<ContactStatsResponse>>(`${this.apiUrl}/contact/statistics`)
      .subscribe({
        next: (response) => {
          const stats = response.data?.statusStats;
          if (stats) {
            this.stats = {
              total: stats.total ?? 0,
              new: stats.new ?? 0,
              processing: stats.processing ?? 0,
              replied: stats.replied ?? 0,
              closed: stats.closed ?? 0,
            };
          }
        },
        error: () => {
        },
      });
  }

  private updateStatus(
    contactId: number,
    status: ContactStatus,
    adminNote: string,
    silent = false,
  ): void {
    if (this.isUpdating) return;
    this.isUpdating = true;

    this.http
      .patch<ApiResponse<ContactMessageApi>>(`${this.apiUrl}/contact/${contactId}/status`, {
        status,
        admin_note: adminNote,
      })
      .subscribe({
        next: (response) => {
          const updated = response.data ? this.mapApiMessage(response.data) : null;
          if (updated) {
            this.messages = this.messages.map((item) =>
              item.contact_id === contactId ? updated : item,
            );
            if (this.selectedMessage?.contact_id === contactId) {
              this.selectedMessage = updated;
              this.noteDraft = updated.admin_note || '';
            }
          }
          if (!silent) {
            this.notification.showSuccess('Cập nhật trạng thái thành công');
          }
          this.isUpdating = false;
          this.loadStats();
        },
        error: () => {
          if (!silent) {
            this.notification.showError('Không thể cập nhật trạng thái');
          }
          this.isUpdating = false;
        },
      });
  }

  private fetchContactDetail(contactId: number): void {
    this.http
      .get<ApiResponse<ContactMessageApi>>(`${this.apiUrl}/contact/${contactId}`)
      .subscribe({
        next: (response) => {
          if (!response.data) return;
          const updated = this.mapApiMessage(response.data);
          this.messages = this.messages.map((item) =>
            item.contact_id === contactId ? updated : item,
          );
          if (this.selectedMessage?.contact_id === contactId) {
            this.selectedMessage = updated;
            this.noteDraft = updated.admin_note || '';
          }
        },
        error: () => {},
      });
  }

  private mapApiMessage(item: ContactMessageApi): ContactMessage {
    const contactId = Number(item.contact_id);
    const createdAt = item.created_at || item.createdAt || '';
    const status = this.normalizeStatus(item.status);
    const purposeLabel = this.purposeLabel(item.purpose);

    return {
      contact_id: Number.isNaN(contactId) ? 0 : contactId,
      full_name: item.full_name || item.fullName || 'Khách hàng',
      email: item.email,
      phone: item.phone,
      purpose: item.purpose,
      purposeLabel,
      status,
      message: item.message,
      admin_note: item.admin_note ?? '',
      replied_at: item.replied_at,
      replied_by: item.replied_by,
      created_at: createdAt,
      createdLabel: this.formatDateTime(createdAt),
    };
  }

  private normalizeStatus(status: ContactMessageApi['status']): ContactStatus {
    if (status === 'done' || status === 'cancelled') {
      return 'closed';
    }
    if (status === 'replied' || status === 'processing' || status === 'closed') {
      return status;
    }
    return 'new';
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

  protected formatPhoneLink(value: string): string {
    return value ? value.replace(/\s+/g, '') : '';
  }

  private purposeLabel(purpose: ContactPurpose): string {
    const map: Record<ContactPurpose, string> = {
      consult: 'Tư vấn mua cổ phục',
      rent: 'Thuê cổ phục chụp ảnh',
      buy: 'Mua cổ phục',
      custom: 'May đo theo yêu cầu',
      cooperation: 'Hợp tác / dự án',
    };
    return map[purpose] ?? purpose;
  }
}
