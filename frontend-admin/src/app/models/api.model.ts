export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ApiError[];
}

export interface ApiError {
  field?: string;
  message: string;
  code?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ListQueryParams extends Partial<PaginationParams> {
  search?: string;
  filters?: Record<string, unknown>;
}

export interface BackendPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface BackendListResponse<T> {
  items: T[];
  pagination: BackendPagination;
}
