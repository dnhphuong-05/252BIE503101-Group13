import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BuyOrderItem {
  product_id: string;
  sku: string;
  name: string;
  thumbnail?: string;
  price: number;
  quantity: number;
  total_price?: number;
  size?: string;
  color?: string;
}

export interface BuyOrderCustomerInfo {
  full_name: string;
  phone: string;
  email: string;
  address: {
    province: string;
    ward: string;
    detail: string;
    district?: string;
  };
}

export interface CreateBuyOrderPayload {
  user_id?: string | null;
  guest_id?: string | null;
  customer_info: BuyOrderCustomerInfo;
  items: BuyOrderItem[];
  subtotal_amount?: number;
  shipping_fee?: number;
  discount_amount?: number;
  payment_method?: string;
  shipping_provider?: string;
  tracking_code?: string;
  note?: string;
}

export interface BuyOrderResponse {
  success: boolean;
  message: string;
  data: {
    order: {
      order_id: string;
      order_code: string;
      total_amount: number;
      order_status: string;
      payment_status: string;
      created_at: string;
    };
    orderItems: Array<{
      order_item_id: string;
      product_id: string;
      name: string;
      price: number;
      quantity: number;
      total_price: number;
    }>;
    emailSent?: boolean;
  };
}

export interface Pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface BuyOrderListItem {
  _id?: string;
  order_id?: string;
  order_code?: string;
  order_status?: string;
  payment_status?: string;
  total_amount?: number;
  created_at?: string;
  createdAt?: string;
  items?: BuyOrderItem[];
  customer_received_at?: string | null;
  return_request?: { status?: string | null };
}

export interface BuyOrdersResponse {
  success: boolean;
  message?: string;
  data: {
    items: BuyOrderListItem[];
    pagination: Pagination;
  };
}

@Injectable({
  providedIn: 'root',
})
export class BuyOrderService {
  private apiUrl = `${environment.apiUrl}/buy-orders`;

  constructor(private http: HttpClient) {}

  /**
   * Tạo đơn hàng mua ngay
   */
  createBuyOrder(payload: CreateBuyOrderPayload): Observable<BuyOrderResponse> {
    return this.http.post<BuyOrderResponse>(this.apiUrl, payload);
  }

  /**
   * Lấy đơn hàng theo order_id
   */
  getBuyOrderById(orderId: string): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/${orderId}`);
  }

  /**
   * Lấy đơn hàng của user
   */
  getUserBuyOrders(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Observable<BuyOrdersResponse> {
    return this.http.get<BuyOrdersResponse>(`${this.apiUrl}/user/${userId}`, {
      params: { page: page.toString(), limit: limit.toString() },
    });
  }

  /**
   * Lấy đơn hàng của guest
   */
  getGuestBuyOrders(
    guestId: string,
    page: number = 1,
    limit: number = 20,
  ): Observable<BuyOrdersResponse> {
    return this.http.get<BuyOrdersResponse>(`${this.apiUrl}/guest/${guestId}`, {
      params: { page: page.toString(), limit: limit.toString() },
    });
  }

  /**
   * Huỷ đơn hàng (chỉ khi chưa xác nhận)
   */
  cancelOrder(orderId: string, reason: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${orderId}/cancel`, { reason });
  }

  /**
   * Khách xác nhận đã nhận hàng
   */
  confirmReceived(orderId: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${orderId}/confirm-received`, {});
  }

  /**
   * Khách gửi yêu cầu hoàn trả
   */
  requestReturn(orderId: string, payload: { reason?: string; note?: string } = {}): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${orderId}/return-request`, payload);
  }
}
