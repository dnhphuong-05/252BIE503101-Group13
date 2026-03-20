import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../models';
import { environment } from '../../../environments/environment';

export interface AccountProfileResponse {
  id?: string;
  user_id?: string;
  email?: string;
  phone?: string;
  fullName?: string | null;
  role?: string;
  profile?: {
    full_name?: string;
    avatar?: string;
    job_title?: string;
    department?: string;
    bio?: string;
    timezone?: string;
    created_at?: string;
    updated_at?: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountProfileUpdatePayload {
  full_name?: string;
  phone?: string;
  job_title?: string;
  department?: string;
  bio?: string;
  timezone?: string;
}

export interface AccountSettingsResponse {
  email_notifications: boolean;
  order_notifications: boolean;
  return_notifications: boolean;
  contact_notifications: boolean;
  compact_table: boolean;
  reduce_motion: boolean;
  language: 'en' | 'vi';
  timezone: string;
  start_page: 'dashboard' | 'orders/list' | 'orders/rent' | 'notifications';
  auto_refresh_seconds: number;
  enable_two_factor: boolean;
  session_timeout: '15 minutes' | '30 minutes' | '60 minutes';
}

export type AccountSettingsUpdatePayload = Partial<AccountSettingsResponse>;

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private readonly profileUrl = `${environment.apiUrl}/me/profile`;
  private readonly settingsUrl = `${environment.apiUrl}/me/settings`;

  constructor(private readonly http: HttpClient) {}

  getProfile(): Observable<ApiResponse<AccountProfileResponse>> {
    return this.http.get<ApiResponse<AccountProfileResponse>>(this.profileUrl);
  }

  updateProfile(payload: AccountProfileUpdatePayload): Observable<ApiResponse<AccountProfileResponse>> {
    return this.http.put<ApiResponse<AccountProfileResponse>>(this.profileUrl, payload);
  }

  getSettings(): Observable<ApiResponse<AccountSettingsResponse>> {
    return this.http.get<ApiResponse<AccountSettingsResponse>>(this.settingsUrl);
  }

  updateSettings(payload: AccountSettingsUpdatePayload): Observable<ApiResponse<AccountSettingsResponse>> {
    return this.http.put<ApiResponse<AccountSettingsResponse>>(this.settingsUrl, payload);
  }
}
