import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BlogAuthor {
  author_id?: number;
  name: string;
  role?: string;
  avatar?: string;
  bio?: string;
}

export interface BlogPost {
  _id: string;
  blog_id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category_id: number;
  author?: BlogAuthor;
  thumbnail: string;
  tags: string[];
  views: number;
  reading_time: number;
  is_featured: boolean;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
  seo?: {
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    og_image?: string;
  };
}

export interface BlogsResponse {
  success: boolean;
  message?: string;
  data: {
    items: BlogPost[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  post_count?: number;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface BlogCategoriesResponse {
  success: boolean;
  message?: string;
  data: {
    items: BlogCategory[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

export interface BlogResponse {
  success: boolean;
  message: string;
  data: BlogPost;
}

export interface BlogFilterOptions {
  page?: number;
  limit?: number;
  categoryId?: number;
}

export interface BlogCategoryFilterOptions {
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root',
})
export class BlogService {
  private apiUrl = `${environment.apiUrl}/blog/posts`;
  private categoryUrl = `${environment.apiUrl}/blog/categories`;

  constructor(private http: HttpClient) {}

  /**
   * Get all blog posts
   */
  getAllPosts(options: BlogFilterOptions = {}): Observable<BlogsResponse> {
    let params = new HttpParams();

    if (options.page) {
      params = params.set('page', options.page.toString());
    }
    if (options.limit) {
      params = params.set('limit', options.limit.toString());
    }
    if (options.categoryId) {
      params = params.set('categoryId', options.categoryId.toString());
    }

    return this.http.get<BlogsResponse>(this.apiUrl, { params });
  }

  /**
   * Get published posts
   */
  getPublishedPosts(options: BlogFilterOptions = {}): Observable<BlogsResponse> {
    let params = new HttpParams();

    if (options.page) {
      params = params.set('page', options.page.toString());
    }
    if (options.limit) {
      params = params.set('limit', options.limit.toString());
    }
    if (options.categoryId) {
      params = params.set('categoryId', options.categoryId.toString());
    }

    return this.http.get<BlogsResponse>(`${this.apiUrl}/published`, { params });
  }

  /**
   * Get featured posts
   */
  getFeaturedPosts(limit: number = 5): Observable<any> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get(`${this.apiUrl}/featured`, { params });
  }

  /**
   * Get active blog categories
   */
  getActiveCategories(
    options: BlogCategoryFilterOptions = {},
  ): Observable<BlogCategoriesResponse> {
    let params = new HttpParams();

    if (options.page) {
      params = params.set('page', options.page.toString());
    }
    if (options.limit) {
      params = params.set('limit', options.limit.toString());
    }

    return this.http.get<BlogCategoriesResponse>(`${this.categoryUrl}/active`, { params });
  }

  /**
   * Get blog post by ID
   */
  getPostById(id: number): Observable<BlogResponse> {
    return this.http.get<BlogResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get blog post by slug
   */
  getPostBySlug(slug: string): Observable<BlogResponse> {
    return this.http.get<BlogResponse>(`${this.apiUrl}/slug/${slug}`);
  }

  /**
   * Search posts
   */
  searchPosts(
    query: string,
    options: { page?: number; limit?: number } = {},
  ): Observable<BlogsResponse> {
    let params = new HttpParams().set('q', query);

    if (options.page) {
      params = params.set('page', options.page.toString());
    }
    if (options.limit) {
      params = params.set('limit', options.limit.toString());
    }

    return this.http.get<BlogsResponse>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Increment post views
   */
  incrementViews(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/views`, {});
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
