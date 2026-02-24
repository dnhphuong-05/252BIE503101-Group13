import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BlogComment {
  _id: string;
  id?: number;
  comments_id?: string;
  blog_id: number;
  blog_slug: string;
  parent_id?: number | string | null;
  user_id?: string | null;
  guest_id?: string | null;
  user_name: string;
  comment: string;
  likes: number;
  images: string[];
  is_author_reply: boolean;
  status?: 'pending' | 'approved' | 'spam';
  created_at: string;
  updated_at?: string;
  replies?: BlogComment[];
}

export interface CommentsResponse {
  success: boolean;
  message?: string;
  data: {
    items: BlogComment[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

export interface CommentResponse {
  success: boolean;
  message: string;
  data: BlogComment;
}

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private apiUrl = `${environment.apiUrl}/blog/comments`;

  constructor(private http: HttpClient) {}

  /**
   * Get comments by blog ID
   * Returns all comments including replies
   */
  getCommentsByBlogId(
    blogId: number,
    options: { page?: number; limit?: number; includeReplies?: boolean } = {},
  ): Observable<CommentsResponse> {
    let params = new HttpParams();

    if (options.page) {
      params = params.set('page', options.page.toString());
    }
    if (options.limit) {
      params = params.set('limit', options.limit.toString());
    }
    if (options.includeReplies !== undefined) {
      params = params.set('includeReplies', options.includeReplies ? 'true' : 'false');
    }

    return this.http.get<CommentsResponse>(`${this.apiUrl}/post/${blogId}`, { params });
  }

  /**
   * Get all comments for a blog (including nested replies)
   */
  getAllCommentsWithReplies(blogId: number): Observable<CommentsResponse> {
    const params = new HttpParams().set('limit', '100').set('includeReplies', 'true');

    return this.http.get<CommentsResponse>(`${this.apiUrl}/post/${blogId}`, { params });
  }

  /**
   * Create a new comment
   * For authenticated users: user_name is optional (taken from logged-in user)
   * For guest users: user_name is required
   */
  createComment(commentData: {
    blog_id: number;
    blog_slug: string;
    user_name?: string;
    comment: string;
    parent_id?: number | string | null;
  }): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(this.apiUrl, commentData);
  }

  /**
   * Update a comment
   */
  updateComment(id: number, content: string): Observable<CommentResponse> {
    return this.http.put<CommentResponse>(`${this.apiUrl}/${id}`, { content });
  }

  /**
   * Delete a comment
   */
  deleteComment(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Like a comment
   */
  likeComment(id: number): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(`${this.apiUrl}/${id}/like`, {});
  }

  /**
   * Get comment count for a blog
   */
  getCommentCount(blogId: number): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/blog/${blogId}/count`);
  }

  /**
   * Get comments by user ID
   */
  getUserComments(userId: string, page: number = 1, limit: number = 20): Observable<CommentsResponse> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    return this.http.get<CommentsResponse>(`${this.apiUrl}/user/${userId}`, { params });
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

