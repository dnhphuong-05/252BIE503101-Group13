import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GuestAddress {
  province: string;
  ward: string;
  detail: string;
  district?: string;
}

export interface GuestCustomerPayload {
  full_name: string;
  phone: string;
  email: string;
  address: GuestAddress;
}

export interface GuestCustomerResponse {
  success: boolean;
  message: string;
  data: {
    guest_id: string;
    full_name: string;
    phone: string;
    email: string;
    address: GuestAddress;
    created_at: string;
    last_order_at?: string | null;
  };
}

@Injectable({
  providedIn: 'root',
})
export class GuestCustomerService {
  private apiUrl = `${environment.apiUrl}/guest-customers`;

  constructor(private http: HttpClient) {}

  createGuestCustomer(payload: GuestCustomerPayload): Observable<GuestCustomerResponse> {
    return this.http.post<GuestCustomerResponse>(this.apiUrl, payload);
  }
}
