import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Address, ApiResponse } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getAddresses(): Observable<ApiResponse<Address[] | { addresses: Address[] }>> {
    return this.http.get<ApiResponse<Address[] | { addresses: Address[] }>>(`${this.apiUrl}/me/addresses`);
  }

  addAddress(address: Address): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/me/addresses`, address);
  }

  updateAddress(addressId: string, address: Partial<Address>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/me/addresses/${addressId}`, address);
  }

  deleteAddress(addressId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/me/addresses/${addressId}`);
  }

  setDefaultAddress(addressId: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/me/addresses/${addressId}/default`, {});
  }
}
