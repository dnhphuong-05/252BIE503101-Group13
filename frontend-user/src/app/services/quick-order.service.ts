import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface QuickOrderCustomer {
  full_name: string;
  phone: string;
  email?: string | null;
  address: {
    province: string;
    ward: string;
    detail: string;
    district?: string;
  };
}

export interface QuickOrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  attributes?: {
    size?: string;
    color?: string;
    [key: string]: any;
  };
}

export interface QuickOrderPayload {
  customer: QuickOrderCustomer;
  items: QuickOrderItem[];
  shippingFee?: number;
  note?: string;
}

export interface QuickOrderResponse {
  success: boolean;
  message: string;
  data: {
    orderCode: string;
    trackingToken: string;
    trackingUrl: string;
    customer: {
      full_name: string;
      phone: string;
      email: string;
      full_address: string;
    };
    items: QuickOrderItem[];
    subtotal: number;
    shippingFee: number;
    total: number;
    status: string;
    createdAt: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class QuickOrderService {
  private apiUrl = `${environment.apiUrl}/quick-orders`;

  constructor(private http: HttpClient) {}

  createQuickOrder(payload: QuickOrderPayload): Observable<QuickOrderResponse> {
    return this.http.post<QuickOrderResponse>(this.apiUrl, payload);
  }

  trackOrder(orderCode: string, token?: string): Observable<any> {
    const url = token
      ? `${this.apiUrl}/${orderCode}?token=${token}`
      : `${this.apiUrl}/${orderCode}`;
    return this.http.get<any>(url);
  }
}
