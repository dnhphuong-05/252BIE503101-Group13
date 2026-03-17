import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminNotificationsService } from '../../services/admin-notifications.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { AdminNotification, getAdminNotificationMeta } from '../../../models';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class TopbarComponent implements OnInit {
  public readonly toggleSidebar = output<void>();

  public searchQuery = '';

  protected readonly createMenuOpen = signal(false);
  protected readonly notificationMenuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly adminNotifications = inject(AdminNotificationsService);
  private readonly toast = inject(NotificationService);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly previewNotifications = this.adminNotifications.previewItems;
  protected readonly unreadCount = this.adminNotifications.unreadCount;
  protected readonly isPreviewLoading = this.adminNotifications.isPreviewLoading;
  protected readonly hasUnread = this.adminNotifications.hasUnread;

  ngOnInit(): void {
    this.adminNotifications.loadPreview();
  }

  protected handleSearch(): void {
    const query = this.searchQuery.trim();
    if (!query) {
      return;
    }

    this.router.navigate(['/products'], {
      queryParams: { q: query },
    });
    this.closeMenus();
  }

  protected toggleCreateMenu(): void {
    this.createMenuOpen.update((open) => !open);
    this.notificationMenuOpen.set(false);
    this.userMenuOpen.set(false);
  }

  protected toggleNotificationMenu(): void {
    this.notificationMenuOpen.update((open) => !open);
    this.createMenuOpen.set(false);
    this.userMenuOpen.set(false);

    if (this.notificationMenuOpen()) {
      this.adminNotifications.loadPreview(true);
    }
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
    this.createMenuOpen.set(false);
    this.notificationMenuOpen.set(false);
  }

  protected closeMenus(): void {
    this.createMenuOpen.set(false);
    this.notificationMenuOpen.set(false);
    this.userMenuOpen.set(false);
  }

  protected markAllNotificationsRead(event?: Event): void {
    event?.stopPropagation();
    if (!this.unreadCount()) {
      return;
    }

    this.adminNotifications.markAllAsRead().subscribe({
      next: () => {
        this.toast.showSuccess('Đã đánh dấu tất cả thông báo là đã đọc');
      },
      error: () => {
        this.toast.showError('Không thể cập nhật trạng thái thông báo');
      },
    });
  }

  protected openNotification(notification: AdminNotification): void {
    this.closeMenus();
    this.adminNotifications.openNotification(notification);
  }

  protected openNotificationsPage(): void {
    this.closeMenus();
    this.router.navigate(['/notifications']);
  }

  protected notificationMeta(notification: AdminNotification) {
    return getAdminNotificationMeta(notification);
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

  protected userInitials(): string {
    const name = this.currentUser()?.name?.trim();
    if (!name) {
      return 'AD';
    }

    const words = name.split(/\s+/).filter(Boolean);
    const initials = words
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

    return initials || 'AD';
  }

  protected handleLogout(): void {
    this.authService.logout();
  }
}