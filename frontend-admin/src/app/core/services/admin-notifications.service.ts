import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, map, Observable, tap } from 'rxjs';
import {
  AdminNotification,
  ApiResponse,
  BackendListResponse,
  resolveAdminNotificationLink,
} from '../../models';
import { environment } from '../../../environments/environment';

interface NotificationListParams {
  page?: number;
  limit?: number;
  unread?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AdminNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  private readonly previewItemsSignal = signal<AdminNotification[]>([]);
  private readonly unreadCountSignal = signal(0);
  private readonly previewLoadingSignal = signal(false);

  public readonly previewItems = this.previewItemsSignal.asReadonly();
  public readonly unreadCount = this.unreadCountSignal.asReadonly();
  public readonly isPreviewLoading = this.previewLoadingSignal.asReadonly();
  public readonly hasUnread = computed(() => this.unreadCountSignal() > 0);

  fetchNotifications(
    params: NotificationListParams = {},
  ): Observable<BackendListResponse<AdminNotification>> {
    let httpParams = new HttpParams()
      .set('page', `${params.page ?? 1}`)
      .set('limit', `${params.limit ?? 20}`);

    if (params.unread !== undefined) {
      httpParams = httpParams.set('unread', `${params.unread}`);
    }

    return this.http
      .get<ApiResponse<BackendListResponse<AdminNotification>>>(this.apiUrl, {
        params: httpParams,
      })
      .pipe(
        map((response) => {
          const items = (response.data?.items ?? []).map((item) => this.normalizeNotification(item));
          return {
            items,
            pagination: response.data?.pagination ?? {
              page: params.page ?? 1,
              limit: params.limit ?? 20,
              total: items.length,
              pages: 1,
            },
          };
        }),
      );
  }

  loadPreview(silent = false, limit = 6): void {
    if (!silent) {
      this.previewLoadingSignal.set(true);
    }

    forkJoin({
      recent: this.fetchNotifications({ page: 1, limit }),
      unread: this.fetchNotifications({ page: 1, limit: 1, unread: true }),
    }).subscribe({
      next: ({ recent, unread }) => {
        this.previewItemsSignal.set(recent.items);
        this.unreadCountSignal.set(unread.pagination.total ?? unread.items.length);
        this.previewLoadingSignal.set(false);
      },
      error: () => {
        this.previewLoadingSignal.set(false);
      },
    });
  }

  markAsRead(
    notificationId: string,
    currentReadState = false,
  ): Observable<AdminNotification | null> {
    return this.http
      .patch<ApiResponse<AdminNotification>>(`${this.apiUrl}/${notificationId}/read`, {})
      .pipe(
        map((response) =>
          response.data ? this.normalizeNotification(response.data) : null,
        ),
        tap((notification) => {
          if (!notification) return;
          this.syncReadState(notification.notification_id, true, currentReadState);
        }),
      );
  }

  markAllAsRead(): Observable<number> {
    return this.http
      .patch<ApiResponse<{ updated?: number }>>(`${this.apiUrl}/read-all`, {})
      .pipe(
        map((response) => response.data?.updated ?? 0),
        tap(() => {
          this.previewItemsSignal.update((items) =>
            items.map((item) => ({ ...item, is_read: true })),
          );
          this.unreadCountSignal.set(0);
        }),
      );
  }

  openNotification(notification: AdminNotification, markRead = true): void {
    const targetLink = resolveAdminNotificationLink(notification);
    const navigate = () => {
      if (targetLink) {
        this.router.navigateByUrl(targetLink);
        return;
      }
      this.router.navigate(['/notifications']);
    };

    if (markRead && !notification.is_read) {
      this.markAsRead(notification.notification_id, notification.is_read).subscribe({
        next: () => navigate(),
        error: () => navigate(),
      });
      return;
    }

    navigate();
  }

  private normalizeNotification(notification: AdminNotification): AdminNotification {
    return {
      ...notification,
      link: resolveAdminNotificationLink(notification),
    };
  }

  private syncReadState(
    notificationId: string,
    nextReadState: boolean,
    previousReadState: boolean,
  ): void {
    this.previewItemsSignal.update((items) =>
      items.map((item) =>
        item.notification_id === notificationId ? { ...item, is_read: nextReadState } : item,
      ),
    );

    if (!previousReadState && nextReadState) {
      this.unreadCountSignal.update((count) => Math.max(0, count - 1));
    }
  }
}
