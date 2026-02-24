import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, forkJoin, of, Observable } from 'rxjs';
import { catchError, mergeMap, takeUntil } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ReviewService,
  Review,
  ReviewsResponse,
} from '../../../services/review.service';
import {
  CommentService,
  BlogComment,
  CommentsResponse,
} from '../../../services/comment.service';
import { BlogService, BlogResponse } from '../../../services/blog.service';
import { ProductService, ProductResponse } from '../../../services/product.service';
import { AuthService, User } from '../../../services/auth.service';

type ReviewStatus = 'approved' | 'pending';
type CommentStatus = 'approved' | 'pending' | 'spam';
type CommentReplyFilter = 'all' | 'awaiting' | 'replied';

interface ReviewItem {
  id: string;
  productId: number;
  productName: string;
  productImage: string;
  rating: number;
  comment: string;
  date: string;
  status: ReviewStatus;
  helpful: number;
  photos: string[];
  reply?: {
    content: string;
    responder?: string;
    respondedAt?: string;
  } | null;
}

interface CommentItem {
  id: string;
  commentKey: string | null;
  blogId: number;
  blogSlug: string;
  postTitle: string;
  postImage: string;
  comment: string;
  date: string;
  status: CommentStatus;
  likes: number;
  replies: ThreadReply[];
  userName: string;
  hasAdminReply: boolean;
}

interface ThreadReply extends BlogComment {
  depth: number;
}

@Component({
  selector: 'app-profile-reviews-comments',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile-reviews-comments.html',
  styleUrl: './profile-reviews-comments.css',
})
export class ProfileReviewsCommentsComponent implements OnInit, OnDestroy {
  activeTab: 'reviews' | 'comments' = 'reviews';
  ratingFilter: number | 'all' = 'all';
  commentStatusFilter: CommentStatus | 'all' = 'all';
  commentReplyFilter: CommentReplyFilter = 'all';
  sortBy: 'recent' | 'helpful' | 'rating' = 'recent';
  stars = [1, 2, 3, 4, 5];
  searchTerm = '';
  isLoggedIn = false;

  ratingFilters = [
    { label: 'Tất cả', value: 'all' as const },
    { label: '5 sao', value: 5 },
    { label: '4 sao', value: 4 },
    { label: '3 sao', value: 3 },
    { label: '2 sao', value: 2 },
    { label: '1 sao', value: 1 },
  ];

  commentStatusOptions = [
    { label: 'Tất cả', value: 'all' as const },
    { label: 'Hiển thị', value: 'approved' as const },
    { label: 'Đang duyệt', value: 'pending' as const },
    { label: 'Spam', value: 'spam' as const },
  ];

  commentReplyOptions = [
    { label: 'Tất cả', value: 'all' as const },
    { label: 'Chưa phản hồi', value: 'awaiting' as const },
    { label: 'Đã phản hồi', value: 'replied' as const },
  ];

  reviewStats = {
    average: 0,
    total: 0,
    helpful: 0,
    photos: 0,
  };
  averageRounded = 0;

  commentStats = {
    total: 0,
    likes: 0,
    replies: 0,
  };

  highlight = {
    title: 'Chưa có đánh giá nổi bật',
    text: 'Hãy chia sẻ cảm nhận của bạn sau khi trải nghiệm sản phẩm hoặc bài viết.',
    author: '',
    date: '',
  };

  reviews: ReviewItem[] = [];
  filteredReviews: ReviewItem[] = [];
  comments: CommentItem[] = [];
  filteredComments: CommentItem[] = [];

  isLoadingReviews = false;
  isLoadingComments = false;
  loadErrorReviews = '';
  loadErrorComments = '';

  private destroy$ = new Subject<void>();
  private placeholderImage = 'assets/images/placeholder.jpg';
  private currentUserName = 'Bạn';

  constructor(
    private reviewService: ReviewService,
    private commentService: CommentService,
    private blogService: BlogService,
    private productService: ProductService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.loadReviews();
    this.loadComments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: 'reviews' | 'comments') {
    this.activeTab = tab;
  }

  setRatingFilter(value: number | 'all') {
    this.ratingFilter = value;
    this.applyFilters();
  }

  setCommentStatusFilter(value: CommentStatus | 'all') {
    this.commentStatusFilter = value;
    this.applyFilters();
  }

  setCommentReplyFilter(value: CommentReplyFilter) {
    this.commentReplyFilter = value;
    this.applyFilters();
  }

  onSortChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as
      | 'recent'
      | 'helpful'
      | 'rating';
    this.sortBy = value;
    this.applyFilters();
  }

  onSearchChange(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value || '';
    this.applyFilters();
  }

  loadReviews(): void {
    this.isLoadingReviews = true;
    this.loadErrorReviews = '';

    const currentUser = this.authService.currentUserValue as AuthUser | null;
    const userId = currentUser?.customerId || currentUser?.user_id || null;

    if (!userId) {
      this.reviews = [];
      this.filteredReviews = [];
      this.updateReviewStats();
      this.updateHighlight();
      this.isLoadingReviews = false;
      return;
    }

    this.reviewService
      .getUserReviews(userId, 1, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ReviewsResponse) => {
          const items = response?.data?.items || response?.data?.reviews || [];
          this.reviews = items.map((review: Review) => ({
            id: review.review_id || review.id || review._id || '',
            productId: Number(review.product_id || 0),
            productName: review.product_name || 'Sản phẩm',
            productImage: this.placeholderImage,
            rating: review.rating || 0,
            comment: review.comment || '',
            date: review.created_at || review.createdAt || new Date().toISOString(),
            status: 'approved',
            helpful: review.helpful_count || review.helpfulCount || 0,
            photos: this.normalizePhotos(review),
            reply: this.normalizeReply(review),
          }));

          this.updateReviewStats();
          this.updateHighlight();
          this.loadProductThumbnails();
          this.applyFilters();
          this.isLoadingReviews = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Load reviews failed:', error);
          this.loadErrorReviews = 'Không thể tải đánh giá. Vui lòng thử lại.';
          this.reviews = [];
          this.filteredReviews = [];
          this.updateReviewStats();
          this.updateHighlight();
          this.isLoadingReviews = false;
        },
      });
  }

  loadComments(): void {
    this.isLoadingComments = true;
    this.loadErrorComments = '';

    const currentUser = this.authService.currentUserValue as AuthUser | null;
    const userId = currentUser?.customerId || currentUser?.user_id || null;
    this.currentUserName =
      currentUser?.fullName || currentUser?.profile?.full_name || 'Bạn';

    if (!userId) {
      this.comments = [];
      this.filteredComments = [];
      this.updateCommentStats();
      this.updateHighlight();
      this.isLoadingComments = false;
      return;
    }

    this.fetchAllUserComments(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items: BlogComment[]) => {
          this.buildCommentThreads(items);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Load comments failed:', error);
          this.loadErrorComments = 'Không thể tải bình luận. Vui lòng thử lại.';
          this.comments = [];
          this.filteredComments = [];
          this.updateCommentStats();
          this.updateHighlight();
          this.isLoadingComments = false;
        },
      });
  }

  private fetchAllUserComments(
    userId: string,
    page: number = 1,
    acc: BlogComment[] = [],
  ): Observable<BlogComment[]> {
    return this.commentService.getUserComments(userId, page, 100).pipe(
      mergeMap((response: CommentsResponse) => {
        const items: BlogComment[] = response?.data?.items || [];
        const pagination = response?.data?.pagination;
        const merged = [...acc, ...items];
        const total = pagination?.total ?? merged.length;
        const limit = pagination?.limit ?? (merged.length || 1);
        const pages = pagination?.pages ?? Math.ceil(total / limit);

        if (merged.length < total && page < pages) {
          return this.fetchAllUserComments(userId, page + 1, merged);
        }
        return of(merged);
      }),
    );
  }

  private fetchAllBlogComments(
    blogId: number,
    page: number = 1,
    acc: BlogComment[] = [],
  ): Observable<BlogComment[]> {
    return this.commentService
      .getCommentsByBlogId(blogId, { page, limit: 100, includeReplies: true })
      .pipe(
        mergeMap((response: CommentsResponse) => {
          const items: BlogComment[] = response?.data?.items || [];
          const pagination = response?.data?.pagination;
          const merged = [...acc, ...items];
          const total = pagination?.total ?? merged.length;
          const limit = pagination?.limit ?? (merged.length || 1);
          const pages = pagination?.pages ?? Math.ceil(total / limit);

          if (merged.length < total && page < pages) {
            return this.fetchAllBlogComments(blogId, page + 1, merged);
          }
          return of(merged);
        }),
        catchError(() => of(acc)),
      );
  }

  private buildCommentThreads(userComments: BlogComment[]): void {
    if (!userComments.length) {
      this.comments = [];
      this.filteredComments = [];
      this.updateCommentStats();
      this.updateHighlight();
      this.isLoadingComments = false;
      return;
    }

    const blogIds = Array.from(
      new Set(
        userComments
          .map((comment) => Number(comment.blog_id || 0))
          .filter((id) => id > 0),
      ),
    );

    forkJoin(blogIds.map((id) => this.fetchAllBlogComments(id)))
      .pipe(takeUntil(this.destroy$))
      .subscribe((responses: BlogComment[][]) => {
        const blogMap = new Map<number, BlogComment[]>();
        responses.forEach((items, index) => {
          blogMap.set(blogIds[index], items || []);
        });

        this.comments = userComments.map((comment) =>
          this.buildCommentItem(comment, blogMap.get(Number(comment.blog_id || 0)) || []),
        );

        this.updateCommentStats();
        this.updateHighlight();
        this.loadBlogThumbnails();
        this.applyFilters();
        this.isLoadingComments = false;
      });
  }

  private buildCommentItem(comment: BlogComment, allComments: BlogComment[]): CommentItem {
    const commentKey = this.getCommentKey(comment);
    const replyMap = this.buildReplyMap(allComments);
    const threadReplies = commentKey ? this.collectReplies(commentKey, replyMap, 1) : [];
    const hasAdminReply = threadReplies.some((reply) => reply.is_author_reply);

    return {
      id: comment.comments_id || comment.id?.toString() || comment._id || '',
      commentKey,
      blogId: Number(comment.blog_id || 0),
      blogSlug: comment.blog_slug || '',
      postTitle: 'Bài viết',
      postImage: this.placeholderImage,
      comment: comment.comment || '',
      date: comment.created_at || new Date().toISOString(),
      status: (comment.status as CommentStatus) || 'pending',
      likes: comment.likes || 0,
      replies: threadReplies,
      userName: comment.user_name || this.currentUserName,
      hasAdminReply,
    };
  }

  private buildReplyMap(allComments: BlogComment[]): Map<string, BlogComment[]> {
    const map = new Map<string, BlogComment[]>();
    allComments.forEach((comment) => {
      const parentKey = this.getParentKey(comment);
      if (!parentKey) return;
      const list = map.get(parentKey) || [];
      list.push(comment);
      map.set(parentKey, list);
    });
    return map;
  }

  private collectReplies(
    rootKey: string,
    replyMap: Map<string, BlogComment[]>,
    depth: number,
  ): ThreadReply[] {
    const directReplies = replyMap.get(rootKey) || [];
    const sorted = [...directReplies].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const result: ThreadReply[] = [];
    sorted.forEach((reply) => {
      result.push({ ...reply, depth });
      const replyKey = this.getCommentKey(reply);
      if (replyKey) {
        result.push(...this.collectReplies(replyKey, replyMap, depth + 1));
      }
    });
    return result;
  }

  private loadProductThumbnails(): void {
    if (!this.reviews.length) return;
    const productIds = Array.from(new Set(this.reviews.map((r) => r.productId).filter((id) => id > 0)));
    if (!productIds.length) return;

    forkJoin(
      productIds.map((id) =>
        this.productService.getProductById(String(id)).pipe(catchError(() => of(null))),
      ),
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe((responses: Array<ProductResponse | null>) => {
        const productMap = new Map<number, string>();
        responses.forEach((res) => {
          const product = res?.data;
          if (product?.product_id) {
            productMap.set(
              Number(product.product_id),
              product.thumbnail || product.meta?.og_image || this.placeholderImage,
            );
          }
        });

        this.reviews = this.reviews.map((review) => ({
          ...review,
          productImage: productMap.get(review.productId) || review.productImage,
        }));

        this.applyFilters();
      });
  }

  private loadBlogThumbnails(): void {
    if (!this.comments.length) return;
    const blogIds = Array.from(new Set(this.comments.map((c) => c.blogId).filter((id) => id > 0)));
    if (!blogIds.length) return;

    forkJoin(
      blogIds.map((id) =>
        this.blogService.getPostById(id).pipe(catchError(() => of(null))),
      ),
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe((responses: Array<BlogResponse | null>) => {
        const blogMap = new Map<number, { title: string; image: string; slug: string }>();
        responses.forEach((res) => {
          const post = res?.data;
          if (post?.blog_id) {
            blogMap.set(Number(post.blog_id), {
              title: post.title || 'Bài viết',
              image: post.thumbnail || post.seo?.og_image || this.placeholderImage,
              slug: post.slug || '',
            });
          }
        });

        this.comments = this.comments.map((comment) => {
          const blog = blogMap.get(comment.blogId);
          return {
            ...comment,
            postTitle: blog?.title || comment.postTitle,
            postImage: blog?.image || comment.postImage,
            blogSlug: blog?.slug || comment.blogSlug,
          };
        });

        this.applyFilters();
      });
  }

  private normalizePhotos(review: Review): string[] {
    const raw = review?.images || review?.image_urls || review?.imageUrls || [];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((img: ReviewImage) => {
        if (typeof img === 'string') return img;
        return img?.url || img?.secure_url || img?.path || '';
      })
      .filter(Boolean);
  }

  private normalizeReply(review: Review): ReviewItem['reply'] {
    const adminReply = (review as {
      admin_reply?: {
        reply_text?: string;
        replied_by?: { full_name?: string };
        created_at?: string;
        updated_at?: string;
        is_deleted?: boolean;
      };
    }).admin_reply;

    if (adminReply?.reply_text && !adminReply.is_deleted) {
      return {
        content: adminReply.reply_text,
        responder: adminReply.replied_by?.full_name || 'Shop',
        respondedAt: adminReply.updated_at || adminReply.created_at,
      };
    }

    const sellerResponse = review.seller_response || review.sellerResponse;
    if (sellerResponse?.content) {
      return {
        content: sellerResponse.content,
        responder: sellerResponse.responder_name || 'Shop',
        respondedAt: sellerResponse.responded_at,
      };
    }

    return null;
  }

  private updateReviewStats(): void {
    const total = this.reviews.length;
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    const helpful = this.reviews.reduce((acc, review) => acc + review.helpful, 0);
    const photos = this.reviews.reduce((acc, review) => acc + review.photos.length, 0);
    const average = total > 0 ? sum / total : 0;

    this.reviewStats = {
      average,
      total,
      helpful,
      photos,
    };
    this.averageRounded = Math.round(average || 0);
  }

  private updateCommentStats(): void {
    const total = this.comments.length;
    const likes = this.comments.reduce((acc, comment) => acc + comment.likes, 0);
    const replies = this.comments.reduce((acc, comment) => acc + comment.replies.length, 0);

    this.commentStats = {
      total,
      likes,
      replies,
    };
  }

  private updateHighlight(): void {
    if (this.reviews.length > 0) {
      const top = [...this.reviews].sort((a, b) => b.helpful - a.helpful)[0];
      this.highlight = {
        title: top.productName || 'Đánh giá nổi bật',
        text: top.comment || 'Đánh giá của bạn đang được cộng đồng quan tâm.',
        author: '',
        date: this.formatDate(top.date),
      };
      return;
    }

    if (this.comments.length > 0) {
      const latest = [...this.comments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )[0];
      this.highlight = {
        title: latest.postTitle || 'Bình luận nổi bật',
        text: latest.comment || 'Bạn vừa bình luận về một bài viết thú vị.',
        author: latest.userName || '',
        date: this.formatDate(latest.date),
      };
      return;
    }

    this.highlight = {
      title: 'Chưa có đánh giá nổi bật',
      text: 'Hãy chia sẻ cảm nhận của bạn sau khi trải nghiệm sản phẩm hoặc bài viết.',
      author: '',
      date: '',
    };
  }

  private applyFilters(): void {
    this.filteredReviews = this.filterReviews();
    this.filteredComments = this.filterComments();
  }

  private filterReviews(): ReviewItem[] {
    let items = [...this.reviews];

    if (this.ratingFilter !== 'all') {
      items = items.filter((item) => item.rating === this.ratingFilter);
    }

    if (this.searchTerm.trim()) {
      const keyword = this.searchTerm.toLowerCase();
      items = items.filter(
        (item) =>
          item.productName.toLowerCase().includes(keyword) ||
          item.comment.toLowerCase().includes(keyword),
      );
    }

    return items.sort((a, b) => this.sortReviews(a, b));
  }

  private filterComments(): CommentItem[] {
    let items = [...this.comments];

    if (this.commentStatusFilter !== 'all') {
      items = items.filter((item) => item.status === this.commentStatusFilter);
    }

    if (this.commentReplyFilter === 'awaiting') {
      items = items.filter((item) => !item.hasAdminReply);
    }

    if (this.commentReplyFilter === 'replied') {
      items = items.filter((item) => item.hasAdminReply);
    }

    if (this.searchTerm.trim()) {
      const keyword = this.searchTerm.toLowerCase();
      items = items.filter((item) => {
        const inReplies = item.replies.some((reply) =>
          reply.comment?.toLowerCase().includes(keyword),
        );
        return (
          item.postTitle.toLowerCase().includes(keyword) ||
          item.comment.toLowerCase().includes(keyword) ||
          inReplies
        );
      });
    }

    return items.sort((a, b) => this.sortComments(a, b));
  }

  private sortReviews(a: ReviewItem, b: ReviewItem): number {
    switch (this.sortBy) {
      case 'helpful':
        return b.helpful - a.helpful;
      case 'rating':
        return b.rating - a.rating;
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  }

  private sortComments(a: CommentItem, b: CommentItem): number {
    switch (this.sortBy) {
      case 'helpful':
        return b.likes - a.likes;
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  }

  getReviewStatusLabel(status: ReviewStatus): string {
    return status === 'approved' ? 'Đã duyệt' : 'Đang duyệt';
  }

  getReviewReply = (
    review: ReviewItem,
  ): { content: string; responder?: string; respondedAt?: string } | null => {
    return review.reply ?? null;
  };

  getCommentStatusLabel(status: CommentStatus): string {
    switch (status) {
      case 'approved':
        return 'Hiển thị';
      case 'spam':
        return 'Spam';
      default:
        return 'Đang duyệt';
    }
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  }

  private getCommentKey(comment: BlogComment): string | null {
    if (comment.comments_id) return comment.comments_id;
    if (comment.blog_id && comment.id != null) {
      return `bc_${comment.blog_id}_${comment.id}`;
    }
    return null;
  }

  private getParentKey(comment: BlogComment): string | null {
    const parentId = comment.parent_id;
    if (parentId === null || parentId === undefined || parentId === '') {
      return null;
    }

    if (typeof parentId === 'string') {
      if (/^\d+$/.test(parentId) && comment.blog_id) {
        return `bc_${comment.blog_id}_${parentId}`;
      }
      return comment.blog_id ? `bc_${comment.blog_id}_${parentId}` : parentId;
    }

    if (typeof parentId === 'number') {
      return comment.blog_id ? `bc_${comment.blog_id}_${parentId}` : `${parentId}`;
    }

    return null;
  }
}

type AuthUser = User & { user_id?: string };
type ReviewImage = string | { url?: string; secure_url?: string; path?: string };
