import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ContactService,
  ContactMessagesResponse,
} from '../../../services/contact.service';
import { AuthService, User } from '../../../services/auth.service';

interface CustomOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  message: string;
  status: 'new' | 'processing' | 'replied' | 'closed';
  createdDate: string;
  note?: string;
}

@Component({
  selector: 'app-profile-custom-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile-custom-orders.html',
  styleUrl: './profile-custom-orders.css',
})
export class ProfileCustomOrdersComponent implements OnInit, OnDestroy {
  customOrders: CustomOrder[] = [];
  filteredOrders: CustomOrder[] = [];
  activeTab: string = 'all';
  isLoading = false;
  loadError = '';
  totalCount = 0;
  processingCount = 0;
  closedCount = 0;
  private destroy$ = new Subject<void>();

  tabs = [
    { id: 'all', label: 'Tất cả', count: 0 },
    { id: 'new', label: 'Mới gửi', count: 0 },
    { id: 'processing', label: 'Đang xử lý', count: 0 },
    { id: 'replied', label: 'Đã trả lời', count: 0 },
    { id: 'closed', label: 'Đã đóng', count: 0 },
  ];

  constructor(
    private contactService: ContactService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.loadCustomOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCustomOrders() {
    this.isLoading = true;
    this.loadError = '';

    const currentUser = this.authService.currentUserValue as AuthUser | null;
    const search = currentUser?.email || currentUser?.phone || null;

    if (!search) {
      this.customOrders = [];
      this.filteredOrders = [];
      this.updateTabCounts();
      this.isLoading = false;
      return;
    }

    this.contactService
      .getContactMessages({ purpose: 'custom', search, limit: 50 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ContactMessagesResponse) => {
          const items = response?.data?.items || [];
          this.customOrders = items.map((item: ContactMessageItem) => ({
            id: item.contact_id?.toString() || '',
            orderNumber: `CT-${item.contact_id}`,
            customerName: item.full_name,
            email: item.email,
            phone: item.phone,
            message: item.message,
            status: this.normalizeStatus(item.status),
            createdDate: item.created_at || new Date().toISOString(),
            note: '',
          }));

          this.updateTabCounts();
          this.applyFilter();
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Load custom orders failed:', error);
          this.loadError = 'Không thể tải đơn may đo. Vui lòng thử lại.';
          this.customOrders = [];
          this.filteredOrders = [];
          this.updateTabCounts();
          this.isLoading = false;
        },
      });
  }

  switchTab(tabId: string) {
    this.activeTab = tabId;
    this.applyFilter();
  }

  updateTabCounts() {
    this.tabs.forEach((tab) => {
      if (tab.id === 'all') {
        tab.count = this.customOrders.length;
      } else {
        tab.count = this.customOrders.filter((order) => order.status === tab.id).length;
      }
    });

    this.totalCount = this.customOrders.length;
    this.processingCount = this.customOrders.filter((order) => order.status === 'processing').length;
    this.closedCount = this.customOrders.filter((order) => order.status === 'closed').length;
  }

  applyFilter() {
    if (this.activeTab === 'all') {
      this.filteredOrders = [...this.customOrders];
    } else {
      this.filteredOrders = this.customOrders.filter((order) => order.status === this.activeTab);
    }
  }

  getFilteredOrders(): CustomOrder[] {
    return this.filteredOrders;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      new: 'Mới gửi',
      processing: 'Đang xử lý',
      replied: 'Đã trả lời',
      closed: 'Đã đóng',
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      new: '#F59E0B',
      processing: '#2563EB',
      replied: '#10B981',
      closed: '#6B7280',
    };
    return colors[status] || '#6B7280';
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  }

  requestModification(orderId: string) {
    console.log('Request modification:', orderId);
  }

  private normalizeStatus(value?: string): CustomOrder['status'] {
    if (value === 'done' || value === 'cancelled') {
      return 'closed';
    }
    const valid: Array<CustomOrder['status']> = ['new', 'processing', 'replied', 'closed'];
    if (value && valid.includes(value as CustomOrder['status'])) {
      return value as CustomOrder['status'];
    }
    return 'new';
  }
}

type AuthUser = User & { user_id?: string };
type ContactMessageItem = ContactMessagesResponse['data']['items'][number];


