import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../../models';
import { environment } from '../../../../environments/environment';

export interface Comment {
  id: string;
  type: 'product' | 'blog';
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  rating?: number;
  productId?: string;
  productName?: string;
  blogPostId?: string;
  blogTitle?: string;
  status: 'pending' | 'approved' | 'spam';
  createdAt: string;
  updatedAt: string;
  reply?: {
    content: string;
    respondedAt?: string | null;
    responderId?: string | null;
    responderName?: string | null;
    responderRole?: string | null;
  } | null;
}

export interface CommentFilters {
  type?: 'product' | 'blog';
  status?: 'pending' | 'approved' | 'spam';
  page?: number;
  limit?: number;
  search?: string;
}

export interface CommentResponse {
  success: boolean;
  data: {
    comments: Comment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface ProductRatingStats {
  product_id: number;
  product_name?: string;
  rating_average: number;
  rating_count: number;
  rating_distribution?: {
    '5_star': number;
    '4_star': number;
    '3_star': number;
    '2_star': number;
    '1_star': number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class CommentApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/comments`;

  getComments(filters: CommentFilters = {}): Observable<CommentResponse> {
    let params = new HttpParams();

    if (filters.type) params = params.set('type', filters.type);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);

    return this.http.get<CommentResponse>(this.apiUrl, { params });
  }

  approveComment(id: string): Observable<ApiResponse<Record<string, unknown>>> {
    return this.http.patch<ApiResponse<Record<string, unknown>>>(`${this.apiUrl}/${id}/approve`, {});
  }

  rejectComment(id: string): Observable<ApiResponse<Record<string, unknown>>> {
    return this.http.patch<ApiResponse<Record<string, unknown>>>(`${this.apiUrl}/${id}/reject`, {});
  }

  markAsSpam(id: string): Observable<ApiResponse<Record<string, unknown>>> {
    return this.http.patch<ApiResponse<Record<string, unknown>>>(`${this.apiUrl}/${id}/spam`, {});
  }

  deleteComment(id: string): Observable<ApiResponse<Record<string, unknown>>> {
    return this.http.delete<ApiResponse<Record<string, unknown>>>(`${this.apiUrl}/${id}`);
  }

  replyComment(id: string, content: string): Observable<ApiResponse<Record<string, unknown>>> {
    return this.http.post<ApiResponse<Record<string, unknown>>>(`${this.apiUrl}/${id}/reply`, { content });
  }

  getProductRatingStats(productId: string): Observable<ApiResponse<ProductRatingStats>> {
    return this.http.get<ApiResponse<ProductRatingStats>>(
      `${environment.apiUrl}/products/${productId}/ratings`,
    );
  }
}
