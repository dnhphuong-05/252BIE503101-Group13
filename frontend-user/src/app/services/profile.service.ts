import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, PasswordChangeData, ProfileUpdateData } from './user.service';
import { User } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/me/profile`);
  }

  updateProfile(data: ProfileUpdateData): Observable<ApiResponse<User>> {
    const payload: ProfileUpdateData & { full_name?: string } = { ...data };
    if (data.fullName && !data.full_name) {
      payload.full_name = data.fullName;
    }
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/me/profile`, payload);
  }

  changePassword(data: PasswordChangeData): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/me/profile/password`, data);
  }

  uploadAvatar(file: File): Observable<ApiResponse<{ avatar: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<ApiResponse<{ avatar: string }>>(`${this.apiUrl}/me/profile/avatar`, formData);
  }
}
