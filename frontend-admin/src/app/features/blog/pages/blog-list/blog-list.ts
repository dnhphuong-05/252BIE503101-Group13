import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiResponse, BackendListResponse } from '../../../../models';
import { environment } from '../../../../../environments/environment';

type BlogStatus = 'draft' | 'published' | 'archived';
type BlogStatusFilter = BlogStatus | 'all';
type BlogBulkAction = '' | 'publish' | 'draft' | 'archive' | 'delete_permanent';

interface BlogRow {
  id: string;
  blogId: number;
  title: string;
  categoryId: number;
  category: string;
  thumbnail: string;
  status: BlogStatus;
  views: number;
  updatedAt: string;
  author: string;
  slug: string;
}

interface BlogPostApi {
  _id?: string;
  blog_id: number;
  title: string;
  slug: string;
  category_id: number;
  is_published: boolean;
  is_archived?: boolean;
  thumbnail?: string;
  views: number;
  updated_at: string;
  author?: { name?: string };
}

interface BlogCategoryApi {
  id: number;
  category_id?: number;
  name: string;
  post_count?: number;
}

interface BlogFilterCategory {
  id: number;
  name: string;
  count: number;
}

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './blog-list.html',
  styleUrl: './blog-list.css',
})
export class BlogListComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;
  private readonly pageSize = 5;
  private readonly initialPageCount = 4;
  private searchTimer?: ReturnType<typeof setTimeout>;

  protected readonly statusMeta: Record<BlogStatus, { label: string; class: string }> = {
    draft: { label: 'Nháp', class: 'badge badge-warning' },
    published: { label: 'Đã đăng', class: 'badge badge-success' },
    archived: { label: 'Lưu trữ', class: 'badge badge-neutral' },
  };

  protected readonly statusOptions: Array<{ value: BlogStatusFilter; label: string }> = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'published', label: 'Đã đăng' },
    { value: 'draft', label: 'Nháp' },
    { value: 'archived', label: 'Lưu trữ' },
  ];

  protected readonly sortOptions: Array<{
    value: string;
    label: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }> = [
    { value: 'newest', label: 'Mới nhất', sortBy: 'updated_at', sortOrder: 'desc' },
    { value: 'oldest', label: 'Cũ nhất', sortBy: 'updated_at', sortOrder: 'asc' },
    { value: 'views_desc', label: 'Xem nhiều nhất', sortBy: 'views', sortOrder: 'desc' },
    { value: 'views_asc', label: 'Xem ít nhất', sortBy: 'views', sortOrder: 'asc' },
  ];

  protected posts: BlogRow[] = [];
  protected total = 0;
  protected isLoading = false;
  protected isLoadingMore = false;
  protected isBulkRunning = false;
  protected loadError = '';
  protected actionSuccess = '';
  protected deletingIds = new Set<string>();
  protected statusUpdatingIds = new Set<string>();
  protected selectedIds = new Set<string>();
  protected categories: BlogFilterCategory[] = [];
  protected filtersLoading = false;
  protected filtersError = '';
  protected searchTerm = '';
  protected statusFilter: BlogStatusFilter = 'all';
  protected categoryFilter = '';
  protected sortFilter = 'newest';
  protected bulkAction: BlogBulkAction = '';
  protected currentPage = 0;
  protected readonly isSuperAdmin = computed(
    () => this.authService.currentUser()?.role === 'super_admin',
  );

  protected get bulkActionOptions(): Array<{ value: BlogBulkAction; label: string }> {
    const options: Array<{ value: BlogBulkAction; label: string; superAdminOnly?: boolean }> = [
      { value: 'publish', label: 'Đăng bài' },
      { value: 'draft', label: 'Chuyển nháp' },
      { value: 'archive', label: 'Lưu trữ' },
      { value: 'delete_permanent', label: 'Xóa vĩnh viễn', superAdminOnly: true },
    ];

    return options
      .filter((option) => !option.superAdminOnly || this.isSuperAdmin())
      .map(({ value, label }) => ({ value, label }));
  }

  protected get selectedCount(): number {
    return this.selectedIds.size;
  }

  protected get allVisibleSelected(): boolean {
    return this.posts.length > 0 && this.posts.every((post) => this.selectedIds.has(post.id));
  }

  protected get someVisibleSelected(): boolean {
    return this.posts.some((post) => this.selectedIds.has(post.id)) && !this.allVisibleSelected;
  }

  ngOnInit(): void {
    this.loadFilters();
    this.loadInitialPosts();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
  }

  protected onSearchInput(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.actionSuccess = '';
      this.loadInitialPosts();
    }, 400);
  }

  protected applyFilters(): void {
    this.actionSuccess = '';
    this.loadInitialPosts();
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.categoryFilter = '';
    this.sortFilter = 'newest';
    this.bulkAction = '';
    this.actionSuccess = '';
    this.loadInitialPosts();
  }

  protected loadMore(): void {
    if (this.isLoading || this.isLoadingMore || this.posts.length >= this.total) return;
    this.loadNextPage();
  }

  protected onView(post: BlogRow): void {
    const baseUrl = this.resolveUserBaseUrl();
    const target = post.slug ? `/blog/${post.slug}` : `/blog/${post.blogId}`;
    window.open(`${baseUrl}${target}`, '_blank', 'noopener');
  }

  protected onEdit(post: BlogRow): void {
    this.router.navigate(['/blog/posts', post.id, 'edit']);
  }

  protected onArchive(post: BlogRow): void {
    if (this.isBulkRunning || this.statusUpdatingIds.has(post.id)) return;
    this.actionSuccess = '';
    this.updatePostStatus(post, 'archive');
  }

  protected onRestore(post: BlogRow): void {
    if (this.isBulkRunning || this.statusUpdatingIds.has(post.id)) return;
    this.actionSuccess = '';
    this.updatePostStatus(post, 'publish');
  }

  protected onDelete(post: BlogRow): void {
    if (!this.isSuperAdmin()) {
      this.loadError = 'Chỉ super admin mới được xóa vĩnh viễn.';
      return;
    }
    if (this.isBulkRunning || this.deletingIds.has(post.id)) return;

    const confirmed = window.confirm(`Xóa vĩnh viễn bài viết "${post.title}"?`);
    if (!confirmed) return;

    this.actionSuccess = '';
    this.deletingIds.add(post.id);
    this.http.delete(`${this.apiUrl}/blog/posts/${post.id}`).subscribe({
      next: () => {
        this.posts = this.posts.filter((item) => item.id !== post.id);
        this.selectedIds.delete(post.id);
        this.total = Math.max(0, this.total - 1);
        this.actionSuccess = 'Đã xóa vĩnh viễn bài viết.';
      },
      error: (error) => {
        console.error('Failed to delete blog post:', error);
        this.loadError = error?.error?.message || 'Không thể xóa bài viết.';
      },
      complete: () => {
        this.deletingIds.delete(post.id);
      },
    });
  }

  protected isSelected(postId: string): boolean {
    return this.selectedIds.has(postId);
  }

  protected toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.posts.forEach((post) => this.selectedIds.add(post.id));
      return;
    }
    this.clearSelection();
  }

  protected toggleSelection(postId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedIds.add(postId);
    } else {
      this.selectedIds.delete(postId);
    }
  }

  protected clearSelection(): void {
    this.selectedIds.clear();
    this.bulkAction = '';
  }

  protected async applyBulkAction(): Promise<void> {
    if (!this.bulkAction || !this.selectedCount || this.isBulkRunning) return;

    const action = this.bulkAction;
    const selectedPosts = this.posts.filter((post) => this.selectedIds.has(post.id));
    if (!selectedPosts.length) {
      this.clearSelection();
      return;
    }

    if (action === 'delete_permanent' && !this.isSuperAdmin()) {
      this.loadError = 'Chỉ super admin mới được xóa vĩnh viễn.';
      return;
    }

    const confirmationMessage =
      action === 'delete_permanent'
        ? `Xóa vĩnh viễn ${selectedPosts.length} bài viết đã chọn?`
        : `Áp dụng "${this.getBulkActionLabel(action)}" cho ${selectedPosts.length} bài viết đã chọn?`;
    if (!window.confirm(confirmationMessage)) return;

    this.isBulkRunning = true;
    this.actionSuccess = '';
    this.loadError = '';

    let successCount = 0;
    let firstError = '';

    for (const post of selectedPosts) {
      try {
        await this.runBulkAction(post.id, action);
        successCount += 1;
      } catch (error: any) {
        console.error('Failed to run blog bulk action:', error);
        if (!firstError) {
          firstError =
            error?.error?.message ||
            `Không thể ${this.getBulkActionLabel(action).toLowerCase()} bài viết "${post.title}".`;
        }
      }
    }

    if (successCount > 0) {
      await this.loadInitialPosts();
      this.actionSuccess = `Đã ${this.getBulkActionLabel(action).toLowerCase()} ${successCount} bài viết.`;
    }

    if (firstError) {
      const failedCount = selectedPosts.length - successCount;
      this.loadError =
        failedCount > 1 ? `${firstError} Còn ${failedCount - 1} bài viết xử lý thất bại.` : firstError;
    }

    if (!successCount) {
      this.bulkAction = '';
    }

    this.isBulkRunning = false;
  }

  private loadFilters(): void {
    this.filtersLoading = true;
    this.filtersError = '';

    const params = new HttpParams({ fromObject: { page: '1', limit: '100' } });
    this.http
      .get<ApiResponse<BackendListResponse<BlogCategoryApi>>>(`${this.apiUrl}/blog/categories`, {
        params,
      })
      .subscribe({
        next: (response) => {
          const items = response.data?.items ?? [];
          this.categories = items
            .map((item) => {
              const rawId = item.id ?? item.category_id ?? (item as any)._id;
              const id = Number(rawId);
              return {
                id,
                name: item.name,
                count: item.post_count ?? 0,
              };
            })
            .filter((item) => Number.isFinite(item.id) && item.id > 0);
          if (this.posts.length) {
            const categoryMap = new Map(this.categories.map((item) => [item.id, item.name]));
            this.posts = this.posts.map((post) => ({
              ...post,
              category: categoryMap.get(post.categoryId) ?? post.category,
            }));
          }
          this.filtersLoading = false;
        },
        error: (error) => {
          console.error('Failed to load blog categories:', error);
          this.filtersError = 'Không thể tải bộ lọc bài viết.';
          this.filtersLoading = false;
        },
      });
  }

  private async loadInitialPosts(): Promise<void> {
    this.isLoading = true;
    this.isLoadingMore = false;
    this.loadError = '';
    this.posts = [];
    this.total = 0;
    this.currentPage = 0;
    this.selectedIds.clear();
    this.bulkAction = '';

    try {
      for (let page = 1; page <= this.initialPageCount; page += 1) {
        const response = await this.fetchPosts(page);
        const data = response?.data;
        const items = data?.items ?? [];

        if (page === 1) {
          this.total = data?.pagination.total ?? items.length;
        }

        if (!items.length) break;

        this.posts = [...this.posts, ...this.mapPosts(items)];
        this.currentPage = page;

        if (data?.pagination.pages && page >= data.pagination.pages) {
          break;
        }
      }
    } catch (error) {
      console.error('Failed to load blog posts:', error);
      this.loadError = 'Không thể tải danh sách bài viết.';
      this.posts = [];
      this.total = 0;
    } finally {
      this.isLoading = false;
    }
  }

  private async loadNextPage(): Promise<void> {
    this.isLoadingMore = true;
    this.loadError = '';

    try {
      const nextPage = this.currentPage + 1;
      const response = await this.fetchPosts(nextPage);
      const data = response?.data;
      const items = data?.items ?? [];

      if (items.length) {
        this.posts = [...this.posts, ...this.mapPosts(items)];
        this.currentPage = nextPage;
      }

      if (data?.pagination.total !== undefined) {
        this.total = data.pagination.total;
      }
    } catch (error) {
      console.error('Failed to load more blog posts:', error);
      this.loadError = 'Không thể tải thêm bài viết.';
    } finally {
      this.isLoadingMore = false;
    }
  }

  private fetchPosts(page: number): Promise<ApiResponse<BackendListResponse<BlogPostApi>>> {
    const params = this.buildParams(page);
    return firstValueFrom(
      this.http.get<ApiResponse<BackendListResponse<BlogPostApi>>>(`${this.apiUrl}/blog/posts`, {
        params,
      }),
    );
  }

  private buildParams(page: number): HttpParams {
    const sort = this.sortOptions.find((option) => option.value === this.sortFilter);
    const base: Record<string, string> = {
      page: String(page),
      limit: String(this.pageSize),
      sortBy: sort?.sortBy ?? 'updated_at',
      sortOrder: sort?.sortOrder ?? 'desc',
      status: this.statusFilter,
    };

    let params = new HttpParams({ fromObject: base });
    if (this.searchTerm.trim()) {
      params = params.set('search', this.searchTerm.trim());
    }
    if (this.categoryFilter) {
      params = params.set('categoryId', this.categoryFilter);
    }

    return params;
  }

  private mapPosts(items: BlogPostApi[]): BlogRow[] {
    const categoryMap = new Map(this.categories.map((item) => [item.id, item.name]));
    return items.map((post) => ({
      id: String(post.blog_id ?? post._id ?? ''),
      blogId: post.blog_id,
      categoryId: post.category_id,
      title: post.title,
      category: categoryMap.get(post.category_id) ?? `#${post.category_id}`,
      thumbnail: post.thumbnail || 'assets/images/pos1.jpg',
      status: this.resolveStatus(post),
      views: post.views ?? 0,
      updatedAt: this.formatDate(post.updated_at),
      author: post.author?.name ?? '-',
      slug: post.slug ?? '',
    }));
  }

  private resolveStatus(post: BlogPostApi): BlogStatus {
    if (post.is_archived) return 'archived';
    return post.is_published ? 'published' : 'draft';
  }

  private updatePostStatus(post: BlogRow, action: Extract<BlogBulkAction, 'publish' | 'archive'>): void {
    this.statusUpdatingIds.add(post.id);
    const payload =
      action === 'archive'
        ? { is_archived: true }
        : { is_archived: false, is_published: true };

    this.http.put(`${this.apiUrl}/blog/posts/${post.id}`, payload).subscribe({
      next: () => {
        const updatedAt = this.formatDate(new Date().toISOString());
        const nextStatus: BlogStatus = action === 'archive' ? 'archived' : 'published';
        this.posts = this.posts.map((item) =>
          item.id === post.id
            ? {
                ...item,
                status: nextStatus,
                updatedAt,
              }
            : item,
        );
        this.actionSuccess = 'Đã cập nhật trạng thái bài viết.';
      },
      error: (error) => {
        console.error('Failed to update status:', error);
        this.loadError = error?.error?.message || 'Không thể cập nhật trạng thái.';
      },
      complete: () => {
        this.statusUpdatingIds.delete(post.id);
      },
    });
  }

  private async runBulkAction(postId: string, action: BlogBulkAction): Promise<void> {
    switch (action) {
      case 'publish':
        await firstValueFrom(
          this.http.put(`${this.apiUrl}/blog/posts/${postId}`, {
            is_archived: false,
            is_published: true,
          }),
        );
        return;
      case 'draft':
        await firstValueFrom(
          this.http.put(`${this.apiUrl}/blog/posts/${postId}`, {
            is_archived: false,
            is_published: false,
          }),
        );
        return;
      case 'archive':
        await firstValueFrom(
          this.http.put(`${this.apiUrl}/blog/posts/${postId}`, {
            is_archived: true,
          }),
        );
        return;
      case 'delete_permanent':
        await firstValueFrom(this.http.delete(`${this.apiUrl}/blog/posts/${postId}`));
        return;
      default:
        return;
    }
  }

  private getBulkActionLabel(action: BlogBulkAction): string {
    switch (action) {
      case 'publish':
        return 'đăng bài';
      case 'draft':
        return 'chuyển nháp';
      case 'archive':
        return 'lưu trữ';
      case 'delete_permanent':
        return 'xóa vĩnh viễn';
      default:
        return 'cập nhật';
    }
  }

  private resolveUserBaseUrl(): string {
    const configured = (environment as { userUrl?: string }).userUrl;
    if (configured && configured.trim()) {
      return configured.replace(/\/+$/, '');
    }
    return window.location.origin.replace(/\/+$/, '');
  }

  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }
}
