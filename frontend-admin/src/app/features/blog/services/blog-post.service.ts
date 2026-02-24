import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApiResponse,
  BackendListResponse,
  ListQueryParams,
  BlogPost,
  CreateBlogPostRequest,
  UpdateBlogPostRequest,
} from '../../../models';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BlogPostService {
  private readonly API_URL = `${environment.apiUrl}/blog/posts`;

  constructor(private readonly http: HttpClient) {}

  getAll(params?: ListQueryParams): Observable<ApiResponse<BackendListResponse<BlogPost>>> {
    return this.http.get<ApiResponse<BackendListResponse<BlogPost>>>(this.API_URL, {
      params: params as any,
    });
  }

  getById(id: string): Observable<ApiResponse<BlogPost>> {
    return this.http.get<ApiResponse<BlogPost>>(`${this.API_URL}/${id}`);
  }

  create(data: CreateBlogPostRequest): Observable<ApiResponse<BlogPost>> {
    return this.http.post<ApiResponse<BlogPost>>(this.API_URL, data);
  }

  update(data: UpdateBlogPostRequest): Observable<ApiResponse<BlogPost>> {
    return this.http.put<ApiResponse<BlogPost>>(`${this.API_URL}/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`);
  }

  publish(id: string): Observable<ApiResponse<BlogPost>> {
    return this.http.patch<ApiResponse<BlogPost>>(`${this.API_URL}/${id}/publish`, {});
  }

  archive(id: string): Observable<ApiResponse<BlogPost>> {
    return this.http.patch<ApiResponse<BlogPost>>(`${this.API_URL}/${id}/archive`, {});
  }
}
