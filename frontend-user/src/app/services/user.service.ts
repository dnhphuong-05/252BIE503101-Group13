import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface Address {
  _id?: string;
  address_id?: string;
  label?: string;
  recipientName?: string;
  receiver_name?: string;
  phone?: string;
  address?: string;
  address_detail?: string;
  province?: string;
  district?: string;
  ward?: string;
  note?: string;
  isDefault?: boolean;
  is_default?: boolean;
}

export interface Measurements {
  height?: number;
  weight?: number;
  bust?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
  shoulderWidth?: number;
  armLength?: number;
  length?: number;
  neck?: number;
  chest?: number;
  hip?: number;
  sleeve?: number;
  arm?: number;
  back_length?: number;
  leg_length?: number;
  unit?: string;
  measured_at?: string | Date;
  updatedAt?: Date;
}

export interface ProfileUpdateData {
  fullName?: string;
  phone?: string;
  avatar?: string;
  gender?: string | null;
  birthday?: string | null;
  height?: number | null;
  weight?: number | null;
  full_name?: string;
}

export interface PasswordChangeData {
  oldPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  // Behavioral subjects for reactive data
  private addressesSubject = new BehaviorSubject<Address[]>([]);
  public addresses$ = this.addressesSubject.asObservable();

  private measurementsSubject = new BehaviorSubject<Measurements | null>(null);
  public measurements$ = this.measurementsSubject.asObservable();

  // ===== Profile Management =====

  getProfile(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/profile`);
  }

  updateProfile(data: ProfileUpdateData): Observable<ApiResponse> {
    const payload: ProfileUpdateData & { full_name?: string } = { ...data };
    if (data.fullName && !data.full_name) {
      payload.full_name = data.fullName;
    }
    return this.http.put<ApiResponse>(`${this.apiUrl}/profile`, payload);
  }

  changePassword(data: PasswordChangeData): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/profile/password`, data);
  }

  uploadAvatar(file: File): Observable<ApiResponse> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<ApiResponse>(`${this.apiUrl}/profile/avatar`, formData);
  }

  // ===== Address Management =====

  getAddresses(): Observable<ApiResponse> {
    return this.getProfile().pipe(
      tap((response: ApiResponse) => {
        if (response.success && response.data.addresses) {
          this.addressesSubject.next(response.data.addresses);
        }
      }),
    );
  }

  addAddress(address: Address): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/profile/addresses`, address).pipe(
      tap((response: ApiResponse) => {
        if (response.success && response.data) {
          this.addressesSubject.next(response.data);
        }
      }),
    );
  }

  updateAddress(addressId: string, address: Partial<Address>): Observable<ApiResponse> {
    return this.http
      .put<ApiResponse>(`${this.apiUrl}/profile/addresses/${addressId}`, address)
      .pipe(
        tap((response: ApiResponse) => {
          if (response.success && response.data) {
            this.addressesSubject.next(response.data);
          }
        }),
      );
  }

  deleteAddress(addressId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/profile/addresses/${addressId}`).pipe(
      tap((response: ApiResponse) => {
        if (response.success && response.data) {
          this.addressesSubject.next(response.data);
        }
      }),
    );
  }

  setDefaultAddress(addressId: string): Observable<ApiResponse> {
    return this.http
      .put<ApiResponse>(`${this.apiUrl}/profile/addresses/${addressId}/default`, {})
      .pipe(
        tap((response: ApiResponse) => {
          if (response.success && response.data) {
            this.addressesSubject.next(response.data);
          }
        }),
      );
  }

  // ===== Measurements Management =====

  getMeasurements(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/profile/measurements`).pipe(
      tap((response: ApiResponse) => {
        if (response.success && response.data) {
          this.measurementsSubject.next(response.data);
        }
      }),
    );
  }

  updateMeasurements(measurements: Measurements): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/profile/measurements`, measurements).pipe(
      tap((response: ApiResponse) => {
        if (response.success && response.data) {
          this.measurementsSubject.next(response.data);
        }
      }),
    );
  }

  // Helper methods
  getCurrentAddresses(): Address[] {
    return this.addressesSubject.value;
  }

  getCurrentMeasurements(): Measurements | null {
    return this.measurementsSubject.value;
  }
}
