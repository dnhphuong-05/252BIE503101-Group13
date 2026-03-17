import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CheckoutCustomerInfo {
  full_name: string;
  phone: string;
  email?: string;
  address: {
    province: string;
    district?: string;
    ward: string;
    detail?: string;
    address_detail?: string;
  };
}

export interface CheckoutItem {
  product_id: number;
  quantity: number;
  size?: string | null;
  color?: string | null;
}

export interface CheckoutPayload {
  address_id?: string | null;
  customer_info?: CheckoutCustomerInfo;
  shipping_provider?: string | null;
  shipping_method?: string | null;
  shipping_fee?: number;
  discount_amount?: number;
  loyalty_voucher_id?: string | null;
  payment_method: string;
  note?: string;
  cart_item_ids?: string[];
  items?: CheckoutItem[];
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private apiUrl = `${environment.apiUrl}/checkout`;

  constructor(private http: HttpClient) {}

  createCheckout(payload: CheckoutPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/buy`, payload);
  }
}
