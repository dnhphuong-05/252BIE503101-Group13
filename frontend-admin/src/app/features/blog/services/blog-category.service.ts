import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApiResponse,
  BackendListResponse,
  ListQueryParams,
  BlogCategory,
  CreateBlogCategoryRequest,
  UpdateBlogCategoryRequest,
} from '../../../models';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BlogCategoryService {
  private readonly API_URL = `${environment.apiUrl}/blog/categories`;

  constructor(private readonly http: HttpClient) {}

  getAll(params?: ListQueryParams): Observable<ApiResponse<BackendListResponse<BlogCategory>>> {
    return this.http.get<ApiResponse<BackendListResponse<BlogCategory>>>(this.API_URL, {
      params: params as any,
    });
  }

  getById(id: string): Observable<ApiResponse<BlogCategory>> {
    return this.http.get<ApiResponse<BlogCategory>>(`${this.API_URL}/${id}`);
  }

  create(data: CreateBlogCategoryRequest): Observable<ApiResponse<BlogCategory>> {
    return this.http.post<ApiResponse<BlogCategory>>(this.API_URL, data);
  }

  update(data: UpdateBlogCategoryRequest): Observable<ApiResponse<BlogCategory>> {
    return this.http.put<ApiResponse<BlogCategory>>(`${this.API_URL}/${data.id}`, data);
  }

  delete(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`);
  }
}
