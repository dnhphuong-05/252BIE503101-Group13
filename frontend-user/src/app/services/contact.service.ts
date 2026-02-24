import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ContactMessage {
  full_name: string;
  phone: string;
  email: string;
  purpose: string;
  message: string;
}

export interface ContactMessageResponse {
  success: boolean;
  message: string;
  data: {
    contact_id: number;
    full_name: string;
    phone: string;
    email: string;
    purpose: string;
    message: string;
    status: string;
    admin_note?: string;
    replied_at?: string;
    replied_by?: string;
    created_at: string;
    updated_at: string;
  };
}

export interface ContactMessagesResponse {
  success: boolean;
  message: string;
  data: {
    items: Array<{
      contact_id: number;
      full_name: string;
      phone: string;
      email: string;
      purpose: string;
      message: string;
      status: string;
      admin_note?: string;
      replied_at?: string;
      replied_by?: string;
      created_at: string;
      updated_at: string;
    }>;
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  private apiUrl = `${environment.apiUrl}/contact`;

  constructor(private http: HttpClient) {}

  /**
   * Gửi form liên hệ
   * @param contactData - Dữ liệu form liên hệ
   * @returns Observable với response từ server
   */
  sendContactMessage(contactData: ContactMessage): Observable<ContactMessageResponse> {
    return this.http.post<ContactMessageResponse>(this.apiUrl, contactData);
  }

  /**
   * Lấy danh sách contact messages (dùng cho đơn may đo)
   */
  getContactMessages(params: {
    page?: number;
    limit?: number;
    purpose?: string;
    status?: string;
    search?: string;
    from?: string;
    to?: string;
  } = {}): Observable<ContactMessagesResponse> {
    let httpParams = new HttpParams();

    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.purpose) httpParams = httpParams.set('purpose', params.purpose);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.from) httpParams = httpParams.set('from', params.from);
    if (params.to) httpParams = httpParams.set('to', params.to);

    return this.http.get<ContactMessagesResponse>(this.apiUrl, { params: httpParams });
  }
}
