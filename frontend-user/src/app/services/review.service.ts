import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Review {
  _id: string;
  id: string;
  review_id?: string;
  product_id: number;
  product_name: string;
  user_name: string;
  rating: number;
  comment: string;
  title?: string;
  created_at: string;
  createdAt?: string; // Alias
  helpful_count: number;
  helpfulCount?: number; // Alias
  verified_purchase: boolean;
  verifiedPurchase?: boolean; // Alias
  seller_response?: {
    content?: string;
    responded_at?: string;
    responder_id?: string;
    responder_name?: string;
    responder_role?: string;
  };
  admin_reply?: {
    reply_text?: string;
    replied_by?: {
      admin_id?: string;
      full_name?: string;
    };
    created_at?: string;
    updated_at?: string;
    is_deleted?: boolean;
  };
  sellerResponse?: {
    content?: string;
    responded_at?: string;
    responder_name?: string;
  };
  images?: Array<string | { url?: string; secure_url?: string; path?: string }>;
  videos?: Array<string | { url?: string; secure_url?: string; path?: string }>;
  image_urls?: Array<string | { url?: string; secure_url?: string; path?: string }>;
  imageUrls?: Array<string | { url?: string; secure_url?: string; path?: string }>;
  user?: {
    fullName: string;
    name?: string;
  };
}

export interface ReviewsResponse {
  success: boolean;
  message?: string;
  data: {
    reviews?: Review[];
    items?: Review[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

export interface ReviewStatsResponse {
  success: boolean;
  message?: string;
  data: {
    product_id: number;
    product_name: string;
    rating_average: number;
    rating_count: number;
    rating_distribution: {
      '5_star': number;
      '4_star': number;
      '3_star': number;
      '2_star': number;
      '1_star': number;
    };
  };
}

export interface CreateReviewData {
  rating: number;
  comment: string;
  title?: string;
  user_name?: string;
  images?: string[];
  videos?: string[];
}

export interface ReviewMediaUploadItem {
  url: string;
  type: 'image' | 'video';
  original_name?: string;
  public_id?: string;
}

export interface ReviewMediaUploadResponse {
  success: boolean;
  message?: string;
  data: {
    images: string[];
    videos: string[];
    media: ReviewMediaUploadItem[];
  };
}

export interface MyReviewEligibilityData {
  review: Review | null;
  can_review: boolean;
  has_completed_purchase: boolean;
  completed_order_code?: string | null;
}

export interface MyReviewEligibilityResponse {
  success: boolean;
  message?: string;
  data: MyReviewEligibilityData;
}

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private apiUrl = `${environment.apiUrl}/products`;
  private rootApiUrl = environment.apiUrl;
  private userReviewsUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  /**
   * Lấy reviews cho một sản phẩm
   */
  getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    rating?: number,
    hasMedia: boolean = false,
  ): Observable<ReviewsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);

    if (rating) {
      params = params.set('rating', rating.toString());
    }

    if (hasMedia) {
      params = params.set('hasMedia', 'true');
    }

    return this.http.get<ReviewsResponse>(`${this.apiUrl}/${productId}/reviews`, { params });
  }

  /**
   * Lấy thống kê reviews cho một sản phẩm
   */
  getReviewStats(productId: string): Observable<ReviewStatsResponse> {
    return this.http.get<ReviewStatsResponse>(`${this.apiUrl}/${productId}/ratings`);
  }

  /**
   * Lấy reviews của user
   */
  getUserReviews(userId: string, page: number = 1, limit: number = 20): Observable<ReviewsResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ReviewsResponse>(`${this.userReviewsUrl}/${userId}/reviews`, { params });
  }

  getMyReviewEligibility(productId: string): Observable<MyReviewEligibilityResponse> {
    return this.http.get<MyReviewEligibilityResponse>(`${this.apiUrl}/${productId}/reviews/my-review`);
  }

  /**
   * Tạo review mới (yêu cầu authentication)
   */
  createReview(productId: string, reviewData: CreateReviewData): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/${productId}/reviews`, reviewData);
  }

  uploadReviewMedia(files: File[]): Observable<ReviewMediaUploadResponse> {
    const formData = new FormData();
    files.forEach((file) => formData.append('media', file));
    return this.http.post<ReviewMediaUploadResponse>(`${this.rootApiUrl}/reviews/media`, formData);
  }

  /**
   * Cập nhật review (yêu cầu authentication)
   */
  updateReview(reviewId: string, updateData: Partial<CreateReviewData>): Observable<unknown> {
    return this.http.put(`${this.rootApiUrl}/reviews/${reviewId}`, updateData);
  }

  /**
   * Xóa review (yêu cầu authentication)
   */
  deleteReview(reviewId: string): Observable<unknown> {
    return this.http.delete(`${this.rootApiUrl}/reviews/${reviewId}`);
  }

  /**
   * Đánh dấu review hữu ích
   */
  markHelpful(reviewId: string): Observable<unknown> {
    return this.http.post(`${this.rootApiUrl}/reviews/${reviewId}/helpful`, {});
  }

  /**
   * Đánh dấu review là hữu ích (alias for markHelpful)
   */
  markReviewHelpful(reviewId: string): Observable<unknown> {
    return this.markHelpful(reviewId);
  }

  /**
   * Format ngày tạo review thành "X ngày trước"
   */
  getTimeAgo(date: string): string {
    const now = new Date();
    const reviewDate = new Date(date);
    const diffMs = now.getTime() - reviewDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Hôm nay';
    } else if (diffDays === 1) {
      return 'Hôm qua';
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} tuần trước`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} tháng trước`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} năm trước`;
    }
  }

  /**
   * Lấy tên viết tắt từ tên đầy đủ (cho avatar)
   */
  getInitials(fullName: string): string {
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }
}
