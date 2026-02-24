import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from './user.service';

export interface AccountSummary {
  user?: {
    user_id?: string;
    email?: string;
    phone?: string;
    role?: string;
    status?: string;
  };
  profile?: {
    full_name?: string;
    avatar?: string;
    gender?: string | null;
    birthday?: string | null;
    height?: number | null;
    weight?: number | null;
  };
  loyalty?: {
    total_points?: number;
    tier_name?: string;
    tier_level?: number;
  };
  stats?: {
    orders?: number;
    favorites?: number;
    rent_orders?: number;
    points?: number;
  };
}

export interface Pagination {
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface LoyaltyTransaction {
  txn_id?: string;
  user_id?: string;
  type?: 'earn' | 'spend' | 'adjust';
  points?: number;
  reason?: string;
  ref_type?: 'order' | 'admin' | null;
  ref_id?: string | null;
  created_at?: string;
}

export interface LoyaltyTransactionResponse {
  success: boolean;
  message?: string;
  data: {
    items: LoyaltyTransaction[];
    pagination: Pagination;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getSummary(): Observable<ApiResponse<AccountSummary>> {
    return this.http.get<ApiResponse<AccountSummary>>(`${this.apiUrl}/me/summary`);
  }

  getLoyaltyTransactions(
    page: number = 1,
    limit: number = 20,
  ): Observable<LoyaltyTransactionResponse> {
    return this.http.get<LoyaltyTransactionResponse>(`${this.apiUrl}/me/loyalty-transactions`, {
      params: { page: page.toString(), limit: limit.toString() },
    });
  }
}
