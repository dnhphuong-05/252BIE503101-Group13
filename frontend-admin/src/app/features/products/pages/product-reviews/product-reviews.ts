import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse, BackendListResponse } from '../../../../models';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

interface ProductOption {
  id: string;
  name: string;
  thumbnail?: string;
}

interface ProductApiItem {
  product_id: number;
  name: string;
  thumbnail?: string;
}

interface RatingStats {
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

interface ReviewApiItem {
  _id?: string;
  id?: string;
  review_id?: string;
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
  user_name?: string;
  rating?: number;
  comment?: string;
  created_at?: string;
  helpful_count?: number;
  verified_purchase?: boolean;
  images?: Array<string | { url?: string; secure_url?: string; path?: string }>;
  image_urls?: Array<string | { url?: string; secure_url?: string; path?: string }>;
  imageUrls?: Array<string | { url?: string; secure_url?: string; path?: string }>;
  seller_response?: {
    content?: string;
    responded_at?: string;
    responder_name?: string;
  };
}

interface ReviewItem {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful: number;
  verified: boolean;
  images: string[];
  reply?: {
    content: string;
    responder?: string;
    respondedAt?: string;
  } | null;
}

type RatingFilter = 'all' | number;
type SortKey = 'newest' | 'oldest' | 'helpful' | 'rating_desc' | 'rating_asc';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-reviews.html',
  styleUrl: './product-reviews.css',
})
export class ProductReviewsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly authService = inject(AuthService);

  products: ProductOption[] = [];
  productsLoading = false;
  productsError = '';
  productSearch = '';
  selectedProductId = '';

  ratingStats: RatingStats | null = null;
  ratingLoading = false;
  ratingError = '';

  reviews: ReviewItem[] = [];
  reviewsLoading = false;
  reviewsError = '';
  reviewPage = 1;
  reviewLimit = 8;
  reviewTotal = 0;
  reviewPages = 0;

  ratingFilter: RatingFilter = 'all';
  sortFilter: SortKey = 'newest';

  replyDrafts: Record<string, string> = {};
  replySaving: Record<string, boolean> = {};
  replyErrors: Record<string, string> = {};

  readonly stars = [1, 2, 3, 4, 5];
  readonly distributionStars = [5, 4, 3, 2, 1];
  readonly ratingFilters: Array<{ label: string; value: RatingFilter }> = [
    { label: 'Tất cả', value: 'all' as const },
    { label: '5 sao', value: 5 },
    { label: '4 sao', value: 4 },
    { label: '3 sao', value: 3 },
    { label: '2 sao', value: 2 },
    { label: '1 sao', value: 1 },
  ];

  readonly sortOptions: Array<{ label: string; value: SortKey; sortBy: string; sortOrder: 'asc' | 'desc' }> = [
    { label: 'Mới nhất', value: 'newest', sortBy: 'created_at', sortOrder: 'desc' },
    { label: 'Cũ nhất', value: 'oldest', sortBy: 'created_at', sortOrder: 'asc' },
    { label: 'Hữu ích nhất', value: 'helpful', sortBy: 'helpful_count', sortOrder: 'desc' },
    { label: 'Điểm cao đến thấp', value: 'rating_desc', sortBy: 'rating', sortOrder: 'desc' },
    { label: 'Điểm thấp đến cao', value: 'rating_asc', sortBy: 'rating', sortOrder: 'asc' },
  ];

  ngOnInit(): void {
    this.loadProducts();
  }

  get filteredProducts(): ProductOption[] {
    const keyword = this.productSearch.trim().toLowerCase();
    if (!keyword) return this.products;
    return this.products.filter((product) => product.name.toLowerCase().includes(keyword));
  }

  get selectedProduct(): ProductOption | null {
    return this.products.find((product) => product.id === this.selectedProductId) || null;
  }

  get verifiedCount(): number {
    return this.reviews.filter((review) => review.verified).length;
  }

  onProductChange(): void {
    if (!this.selectedProductId) {
      this.resetData();
      return;
    }
    this.reviewPage = 1;
    this.loadRatingStats();
    this.loadReviews(true);
  }

  onRatingFilterChange(value: RatingFilter): void {
    this.ratingFilter = value;
    this.reviewPage = 1;
    this.loadReviews(true);
  }

  onSortChange(value: SortKey): void {
    this.sortFilter = value;
    this.reviewPage = 1;
    this.loadReviews(true);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.reviewPages) return;
    this.reviewPage = page;
    this.loadReviews(false);
  }

  refresh(): void {
    if (!this.selectedProductId) return;
    this.loadRatingStats();
    this.loadReviews(true);
  }

  private resetData(): void {
    this.ratingStats = null;
    this.ratingError = '';
    this.reviews = [];
    this.reviewTotal = 0;
    this.reviewPages = 0;
    this.reviewsError = '';
  }

  private loadProducts(): void {
    this.productsLoading = true;
    this.productsError = '';

    const params = new HttpParams({ fromObject: { page: '1', limit: '100', status: 'all' } });
    this.http
      .get<ApiResponse<BackendListResponse<ProductApiItem>>>(`${this.apiUrl}/products`, { params })
      .subscribe({
        next: (response) => {
          const items = response.data?.items ?? [];
          this.products = items.map((item) => ({
            id: String(item.product_id),
            name: item.name,
            thumbnail: item.thumbnail,
          }));

          if (this.products.length > 0 && !this.selectedProductId) {
            this.selectedProductId = this.products[0].id;
            this.onProductChange();
          }
          this.productsLoading = false;
        },
        error: (error) => {
          console.error('Failed to load products:', error);
          this.productsError = 'Không thể tải danh sách sản phẩm.';
          this.productsLoading = false;
        },
      });
  }

  private loadRatingStats(): void {
    if (!this.selectedProductId) return;
    this.ratingLoading = true;
    this.ratingError = '';

    this.http
      .get<ApiResponse<RatingStats>>(
        `${this.apiUrl}/products/${this.selectedProductId}/ratings`,
      )
      .subscribe({
        next: (response) => {
          this.ratingStats = response.data || null;
          this.ratingLoading = false;
        },
        error: (error) => {
          console.error('Failed to load rating stats:', error);
          this.ratingError = 'Không thể tải thống kê đánh giá.';
          this.ratingStats = null;
          this.ratingLoading = false;
        },
      });
  }

  private loadReviews(resetPage: boolean): void {
    if (!this.selectedProductId) return;
    if (resetPage) {
      this.reviewPage = 1;
    }

    this.reviewsLoading = true;
    this.reviewsError = '';

    const sort = this.sortOptions.find((option) => option.value === this.sortFilter);
    let params = new HttpParams()
      .set('page', this.reviewPage.toString())
      .set('limit', this.reviewLimit.toString())
      .set('sortBy', sort?.sortBy || 'created_at')
      .set('sortOrder', sort?.sortOrder || 'desc');

    if (this.ratingFilter !== 'all') {
      params = params.set('rating', this.ratingFilter.toString());
    }

    this.http
      .get<ApiResponse<BackendListResponse<ReviewApiItem>>>(
        `${this.apiUrl}/products/${this.selectedProductId}/reviews`,
        { params },
      )
      .subscribe({
        next: (response) => {
          const items = response.data?.items ?? [];
          const pagination = response.data?.pagination;

          this.reviews = items.map((review) => this.mapReview(review));
          this.reviewTotal = pagination?.total ?? this.reviews.length;
          this.reviewPages = pagination?.pages ?? 1;
          this.reviewsLoading = false;
        },
        error: (error) => {
          console.error('Failed to load reviews:', error);
          this.reviewsError = 'Không thể tải danh sách đánh giá.';
          this.reviews = [];
          this.reviewTotal = 0;
          this.reviewPages = 0;
          this.reviewsLoading = false;
        },
      });
  }

  private mapReview(review: ReviewApiItem): ReviewItem {
    const adminReply =
      review.admin_reply && review.admin_reply.reply_text && !review.admin_reply.is_deleted
        ? {
            content: review.admin_reply.reply_text,
            responder: review.admin_reply.replied_by?.full_name || 'Cửa hàng',
            respondedAt: review.admin_reply.updated_at || review.admin_reply.created_at,
          }
        : null;

    return {
      id: review.review_id || review.id || review._id || '',
      userName: review.user_name || 'Khách',
      rating: review.rating || 0,
      comment: review.comment || '',
      createdAt: review.created_at || new Date().toISOString(),
      helpful: review.helpful_count || 0,
      verified: !!review.verified_purchase,
      images: this.normalizeImages(review),
      reply:
        adminReply ||
        (review.seller_response?.content
          ? {
              content: review.seller_response.content,
              responder: review.seller_response.responder_name || 'Cửa hàng',
              respondedAt: review.seller_response.responded_at,
            }
          : null),
    };
  }

  private normalizeImages(review: ReviewApiItem): string[] {
    const raw =
      review.images ||
      review.image_urls ||
      review.imageUrls ||
      [];

    if (!Array.isArray(raw)) return [];
    return raw
      .map((img) => {
        if (typeof img === 'string') return img;
        if (img && typeof img === 'object') {
          return img.secure_url || img.url || img.path || '';
        }
        return '';
      })
      .filter((url) => url && url.trim() !== '');
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  getRatingCount(star: number): number {
    const distribution = this.ratingStats?.rating_distribution;
    if (!distribution) return 0;
    return distribution[`${star}_star` as keyof typeof distribution] || 0;
  }

  getRatingPercent(star: number): number {
    const total = this.ratingStats?.rating_count || 0;
    if (!total) return 0;
    return Math.round((this.getRatingCount(star) / total) * 100);
  }

  getReplyDraft(review: ReviewItem): string {
    if (this.replyDrafts[review.id] === undefined) {
      this.replyDrafts[review.id] = review.reply?.content || '';
    }
    return this.replyDrafts[review.id];
  }

  setReplyDraft(reviewId: string, value: string): void {
    this.replyDrafts[reviewId] = value;
  }

  isReplySaving(reviewId: string): boolean {
    return !!this.replySaving[reviewId];
  }

  submitReply(review: ReviewItem): void {
    const draft = (this.replyDrafts[review.id] || '').trim();
    if (!draft) {
      this.replyErrors[review.id] = 'Vui lòng nhập nội dung trả lời.';
      return;
    }

    const user = this.authService.currentUser();
    const repliedBy = {
      admin_id: user?.id || 'USR000001',
      full_name: user?.name || 'Admin',
    };

    this.replySaving[review.id] = true;
    this.replyErrors[review.id] = '';

    this.http
      .post<ApiResponse<ReviewApiItem>>(`${this.apiUrl}/admin/reviews/${review.id}/reply`, {
        reply_text: draft,
        replied_by: repliedBy,
      })
      .subscribe({
        next: (response) => {
          const updated = response.data;
          const replyText = updated?.admin_reply?.reply_text || draft;
          review.reply = {
            content: replyText,
            responder: updated?.admin_reply?.replied_by?.full_name || repliedBy.full_name,
            respondedAt:
              updated?.admin_reply?.updated_at ||
              updated?.admin_reply?.created_at ||
              new Date().toISOString(),
          };
          this.replySaving[review.id] = false;
        },
        error: (error) => {
          console.error('Failed to submit reply:', error);
          this.replyErrors[review.id] = 'Không thể gửi phản hồi. Vui lòng thử lại.';
          this.replySaving[review.id] = false;
        },
      });
  }
}