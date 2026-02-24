import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificationItem {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: 'sales_order' | 'rent_order' | 'contact';
  entity_id: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  pagination: NotificationPagination;
}

const ORDER_CODE_REGEX = /[A-Z]{2,}-[A-Z]{2,}-\d{6,}/;

const extractOrderCode = (text?: string): string | null => {
  if (!text) return null;
  const match = text.match(ORDER_CODE_REGEX);
  return match ? match[0] : null;
};

const legacyRules = [
  {
    match: (title: string, message: string) =>
      /Rental order created/i.test(title) ||
      /Your rental order .* has been created\./i.test(message),
    title: 'Tạo đơn thuê thành công',
    message: (code: string | null) =>
      code ? `Đơn thuê ${code} đã được tạo thành công.` : 'Đơn thuê đã được tạo thành công.',
  },
  {
    match: (title: string, message: string) =>
      /Order placed successfully/i.test(title) ||
      /has been created successfully\./i.test(message),
    title: 'Đặt hàng thành công',
    message: (code: string | null) =>
      code ? `Đơn mua ${code} đã được tạo thành công.` : 'Đơn mua đã được tạo thành công.',
  },
  {
    match: (title: string, message: string) =>
      /Order confirmed/i.test(title) || /has been confirmed by admin\./i.test(message),
    title: 'Đơn mua đã xác nhận',
    message: (code: string | null) =>
      code
        ? `Đơn mua ${code} đã được admin xác nhận.`
        : 'Đơn mua đã được admin xác nhận.',
  },
  {
    match: (title: string, message: string) =>
      /Order shipped/i.test(title) || /is on the way\./i.test(message),
    title: 'Đơn mua đang giao',
    message: (code: string | null) =>
      code ? `Đơn mua ${code} đang được giao.` : 'Đơn mua đang được giao.',
  },
  {
    match: (title: string, message: string) =>
      /Order delivered|Order completed/i.test(title) ||
      /has been delivered\./i.test(message) ||
      /has been completed\./i.test(message),
    title: 'Đơn mua hoàn thành',
    message: (code: string | null) =>
      code
        ? `Đơn mua ${code} đã được giao thành công.`
        : 'Đơn mua đã được giao thành công.',
  },
  {
    match: (title: string, message: string) =>
      /Order cancelled|Order canceled/i.test(title) ||
      /has been cancelled\./i.test(message) ||
      /has been canceled\./i.test(message),
    title: 'Đơn mua đã hủy',
    message: (code: string | null) =>
      code ? `Đơn mua ${code} đã bị hủy.` : 'Đơn mua đã bị hủy.',
  },
  {
    match: (title: string, message: string) =>
      /Rental order cancelled|Rental order canceled/i.test(title) ||
      /Your rental order .* has been cancelled\./i.test(message) ||
      /Your rental order .* has been canceled\./i.test(message),
    title: 'Đơn thuê đã hủy',
    message: (code: string | null) =>
      code ? `Đơn thuê ${code} đã bị hủy.` : 'Đơn thuê đã bị hủy.',
  },
];

const translateLegacyNotification = (item: NotificationItem): NotificationItem => {
  const title = item?.title || '';
  const message = item?.message || '';
  const code = extractOrderCode(message) || extractOrderCode(title);

  for (const rule of legacyRules) {
    if (rule.match(title, message)) {
      const nextTitle = rule.title;
      const nextMessage = rule.message(code);
      if (nextTitle === item.title && nextMessage === item.message) {
        return item;
      }
      return { ...item, title: nextTitle, message: nextMessage };
    }
  }

  return item;
};

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getMyNotifications(
    page: number = 1,
    limit: number = 8,
    unread?: boolean,
  ): Observable<NotificationListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (typeof unread === 'boolean') {
      params = params.set('unread', unread.toString());
    }

    return this.http
      .get<{ success: boolean; data: NotificationListResponse }>(this.apiUrl, {
        params,
      })
      .pipe(
        map((res) => ({
          ...res.data,
          items: (res.data?.items || []).map(translateLegacyNotification),
        })),
      );
  }

  markAsRead(notification_id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${notification_id}/read`, {});
  }

  markAllRead(): Observable<any> {
    return this.http.patch(`${this.apiUrl}/read-all`, {});
  }
}
