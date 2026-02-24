import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './user.service';

export interface CreateRentOrderPayload {
  user_id: string | null;
  guest_id: string | null;
  customer_info: {
    full_name: string;
    phone: string;
    email: string | null;
    delivery_method: 'ship' | 'pickup';
    address:
      | {
          province: string;
          district: string;
          ward: string;
          address_detail: string;
        }
      | null;
  };
  item: {
    product_id: string | number;
    sku: string;
    name_snapshot: string;
    thumbnail_snapshot: string;
    rent_price_per_day: number;
    deposit_amount: number;
    quantity: number;
  };
  rental_period: {
    start_date: string;
    end_date: string;
    days: number;
  };
  pricing: {
    rent_fee_expected: number;
    deposit_required: number;
    shipping_fee: number;
    discount_amount: number;
    total_due_today: number;
    refund_expected: number;
  };
  payment: {
    payment_method: 'cod' | 'bank' | 'momo' | 'vnpay';
    deposit_paid: number;
    payment_status: 'unpaid' | 'partial' | 'paid';
    paid_at: string | null;
  };
  rent_status?: RentStatus;
  note?: string;
}

export type RentStatus =
  | 'booked'
  | 'ongoing'
  | 'return_requested'
  | 'returning'
  | 'returned_received'
  | 'returned'
  | 'closed'
  | 'cancelled'
  | 'violated';

export interface RentOrderSettlement {
  rent_fee_actual?: number | null;
  late_fee?: number | null;
  damage_fee?: number | null;
  cleaning_fee?: number | null;
  penalty_fee?: number | null;
  penalty_total?: number | null;
  refund_amount?: number | null;
  extra_charge?: number | null;
  settled_at?: string | null;
  settlement_status?: 'pending' | 'refunded' | 'extra_paid' | 'no_refund' | null;
}

export interface RentOrderShipping {
  shipping_provider?: string | null;
  tracking_code?: string | null;
  shipping_status?: 'not_shipped' | 'shipping' | 'delivered' | null;
}

export interface Pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface RentOrderListItem {
  _id?: string;
  rent_order_id?: string;
  rent_order_code?: string;
  user_id?: string | null;
  guest_id?: string | null;
  customer_info?: CreateRentOrderPayload['customer_info'];
  item?: (CreateRentOrderPayload['item'] & {
    size?: string;
    color?: string;
    condition_in?: { note?: string | null };
  });
  rental_period?: CreateRentOrderPayload['rental_period'];
  pricing?: CreateRentOrderPayload['pricing'];
  payment?: CreateRentOrderPayload['payment'];
  rent_status?: RentStatus;
  settlement?: RentOrderSettlement | null;
  shipping?: RentOrderShipping | null;
  shipping_out?: {
    provider?: string | null;
    tracking_code?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
  } | null;
  shipping_back?: {
    provider?: string | null;
    tracking_code?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
  } | null;
  return_request?: { requested_at?: string | null; note?: string | null } | null;
  admin_note?: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface RentOrdersResponse {
  success: boolean;
  message?: string;
  data: {
    items: RentOrderListItem[];
    pagination: Pagination;
  };
}

@Injectable({
  providedIn: 'root',
})
export class RentOrderService {
  private apiUrl = `${environment.apiUrl}/rent-orders`;

  constructor(private http: HttpClient) {}

  createRentOrder(payload: CreateRentOrderPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(this.apiUrl, payload);
  }

  getUserRentOrders(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Observable<RentOrdersResponse> {
    return this.http.get<RentOrdersResponse>(`${this.apiUrl}/user/${userId}`, {
      params: { page: page.toString(), limit: limit.toString() },
    });
  }

  getGuestRentOrders(
    guestId: string,
    page: number = 1,
    limit: number = 20,
  ): Observable<RentOrdersResponse> {
    return this.http.get<RentOrdersResponse>(`${this.apiUrl}/guest/${guestId}`, {
      params: { page: page.toString(), limit: limit.toString() },
    });
  }

  requestReturn(orderId: string, payload: { note?: string } = {}): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${orderId}/return-request`, payload);
  }

  confirmReturnShipment(orderId: string, payload: { note?: string } = {}): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${orderId}/confirm-return`, payload);
  }

  cancelRentOrder(orderId: string, payload: { reason?: string } = {}): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${orderId}/cancel`, payload);
  }
}
