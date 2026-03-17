import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminNotification,
  AdminNotificationCategory,
  getAdminNotificationMeta,
} from '../../../models';
import { AdminNotificationsService } from '../../../core/services/admin-notifications.service';
import { NotificationService } from '../../../core/services/notification.service';

type NotificationFilter = 'all' | 'unread' | AdminNotificationCategory;

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent implements OnInit {
  private readonly adminNotifications = inject(AdminNotificationsService);
  private readonly toast = inject(NotificationService);

  protected readonly notifications = signal<AdminNotification[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isMarkingAll = signal(false);
  protected readonly activeFilter = signal<NotificationFilter>('all');
  protected readonly searchTerm = signal('');

  protected readonly filterOptions: Array<{ value: NotificationFilter; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'unread', label: 'Chưa đọc' },
    { value: 'sales', label: 'Đơn mua' },
    { value: 'returns', label: 'Hoàn trả' },
    { value: 'rent', label: 'Đơn thuê' },
    { value: 'contact', label: 'Liên hệ' },
  ];

  protected readonly unreadCount = computed(
    () => this.notifications().filter((item) => !item.is_read).length,
  );

  protected readonly salesCount = computed(
    () =>
      this.notifications().filter((item) => getAdminNotificationMeta(item).category === 'sales')
        .length,
  );

  protected readonly returnsCount = computed(
    () =>
      this.notifications().filter((item) => getAdminNotificationMeta(item).category === 'returns')
        .length,
  );

  protected readonly rentCount = computed(
    () =>
      this.notifications().filter((item) => getAdminNotificationMeta(item).category === 'rent')
        .length,
  );

  protected readonly contactCount = computed(
    () =>
      this.notifications().filter((item) => getAdminNotificationMeta(item).category === 'contact')
        .length,
  );

  protected readonly filteredNotifications = computed(() => {
    const filter = this.activeFilter();
    const query = this.normalize(this.searchTerm());

    return this.notifications().filter((item) => {
      const meta = getAdminNotificationMeta(item);
      if (filter === 'unread' && item.is_read) {
        return false;
      }
      if (filter !== 'all' && filter !== 'unread' && meta.category !== filter) {
        return false;
      }
      if (!query) {
        return true;
      }

      const haystack = [item.title, item.message, item.entity_id, meta.badge]
        .map((value) => this.normalize(value))
        .join(' ');

      return haystack.includes(query);
    });
  });

  ngOnInit(): void {
    this.loadNotifications();
  }

  protected setFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
  }

  protected onSearch(term: string): void {
    this.searchTerm.set(term);
  }

  protected refresh(): void {
    this.loadNotifications();
  }

  protected openNotification(notification: AdminNotification): void {
    if (!notification.is_read) {
      this.notifications.update((items) =>
        items.map((item) =>
          item.notification_id === notification.notification_id ? { ...item, is_read: true } : item,
        ),
      );
    }
    this.adminNotifications.openNotification(notification);
  }

  protected markAsRead(notification: AdminNotification, event?: Event): void {
    event?.stopPropagation();
    if (notification.is_read) {
      return;
    }

    this.adminNotifications.markAsRead(notification.notification_id, notification.is_read).subscribe({
      next: () => {
        this.notifications.update((items) =>
          items.map((item) =>
            item.notification_id === notification.notification_id
              ? { ...item, is_read: true }
              : item,
          ),
        );
      },
      error: () => {
        this.toast.showError('Không thể đánh dấu đã đọc');
      },
    });
  }

  protected markAllAsRead(): void {
    if (!this.unreadCount() || this.isMarkingAll()) {
      return;
    }

    this.isMarkingAll.set(true);
    this.adminNotifications.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((items) => items.map((item) => ({ ...item, is_read: true })));
        this.isMarkingAll.set(false);
        this.toast.showSuccess('Tất cả thông báo đã được đánh dấu đã đọc');
      },
      error: () => {
        this.isMarkingAll.set(false);
        this.toast.showError('Không thể cập nhật thông báo');
      },
    });
  }

  protected notificationMeta(notification: AdminNotification) {
    return getAdminNotificationMeta(notification);
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  protected formatRelativeTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const diffMs = Date.now() - date.getTime();
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < hour) {
      const minutes = Math.max(1, Math.round(diffMs / minute));
      return `${minutes} phút trước`;
    }

    if (diffMs < day) {
      return `${Math.round(diffMs / hour)} giờ trước`;
    }

    return `${Math.round(diffMs / day)} ngày trước`;
  }

  protected trackByNotification(_: number, notification: AdminNotification): string {
    return notification.notification_id;
  }

  private loadNotifications(): void {
    this.isLoading.set(true);

    this.adminNotifications.fetchNotifications({ page: 1, limit: 60 }).subscribe({
      next: (response) => {
        this.notifications.set(response.items);
        this.isLoading.set(false);
        this.adminNotifications.loadPreview(true);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.showError('Không thể tải danh sách thông báo');
      },
    });
  }

  private normalize(value?: string | null): string {
    return (value || '').trim().toLowerCase();
  }
}
