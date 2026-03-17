import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

type BlogStatus = 'draft' | 'published' | 'archived';

interface BlogForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string;
  tags: string;
  readingTime: number | null;
  authorId: number | null;
  authorName: string;
  authorRole: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  status: BlogStatus;
  thumbnail: string;
  publishedAt: string;
  isFeatured: boolean;
}

interface BlogCategoryApi {
  id: number;
  category_id?: number;
  name: string;
}

interface BlogAuthorApi {
  author_id?: number | string;
  name?: string;
  role?: string;
  avatar?: string;
  bio?: string;
}

interface BlogSeoApi {
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string | string[];
  og_image?: string;
}

interface BlogPostApi {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  category_id?: number | string;
  categoryId?: number | string;
  tags?: string | string[];
  reading_time?: number | string;
  is_featured?: boolean;
  is_published?: boolean;
  is_archived?: boolean;
  published_at?: string;
  thumbnail?: string;
  author?: BlogAuthorApi;
  seo?: BlogSeoApi;
}

interface UploadResponse {
  success: boolean;
  data?: {
    urls: string[];
  };
  message?: string;
}

interface BlogResponse {
  success: boolean;
  data?: BlogPostApi;
  message?: string;
}

@Component({
  selector: 'app-blog-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blog-editor.html',
  styleUrl: './blog-editor.css',
})
export class BlogEditorComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  protected readonly statusMeta: Record<BlogStatus, { label: string; className: string }> = {
    draft: { label: 'Nháp', className: 'badge badge-warning' },
    published: { label: 'Đã đăng', className: 'badge badge-success' },
    archived: { label: 'Lưu trữ', className: 'badge badge-neutral' },
  };

  protected post: BlogForm = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    categoryId: '',
    tags: '',
    readingTime: null,
    authorId: null,
    authorName: '',
    authorRole: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    status: 'draft',
    thumbnail: '',
    publishedAt: '',
    isFeatured: false,
  };

  protected categories: BlogCategoryApi[] = [];
  protected isUploading = false;
  protected uploadError = '';
  protected isSaving = false;
  protected saveError = '';
  protected saveSuccess = '';
  protected dragActive = false;
  protected isEditMode = false;
  protected postId: string | null = null;
  protected isLoadingPost = false;
  protected loadError = '';
  protected isLoadingCategories = false;
  protected categoriesError = '';

  constructor() {
    this.post = this.createEmptyPost();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.postId = id;
      this.loadPost(id);
    }

    this.loadCategories();
  }

  protected onTitleInput(): void {
    if (!this.post.slug.trim()) {
      this.post.slug = this.slugify(this.post.title);
    }
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;

    this.uploadImages(files);
    input.value = '';
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;

    const files = Array.from(event.dataTransfer?.files || []);
    if (!files.length) return;

    this.uploadImages(files);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = true;
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;
  }

  protected saveCurrentStatus(): void {
    this.submitPost(this.post.status);
  }

  protected publishNow(): void {
    this.submitPost('published');
  }

  protected get previewImage(): string {
    return this.post.thumbnail || '';
  }

  protected get previewCategory(): string {
    const categoryId = Number(this.post.categoryId || 0);
    const category = this.categories.find((item) => item.id === categoryId);
    return category?.name || 'Chưa chọn danh mục';
  }

  protected get previewStatus(): { label: string; className: string } {
    return this.statusMeta[this.post.status];
  }

  protected get previewReadingTime(): number {
    return this.normalizePositiveNumber(this.post.readingTime) ?? this.estimateReadingTime(this.post.content);
  }

  protected get previewTags(): string[] {
    return this.splitCommaList(this.post.tags);
  }

  protected get previewPublishedAt(): string {
    if (!this.post.publishedAt) {
      return 'Chưa hẹn ngày đăng';
    }

    const date = new Date(this.post.publishedAt);
    if (Number.isNaN(date.getTime())) {
      return 'Chưa hẹn ngày đăng';
    }

    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private createEmptyPost(): BlogForm {
    const currentUser = this.authService.currentUser();

    return {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      categoryId: '',
      tags: '',
      readingTime: null,
      authorId: this.extractNumericId(currentUser?.id),
      authorName: currentUser?.name || 'Admin',
      authorRole: this.resolveDefaultAuthorRole(currentUser?.role),
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
      status: 'draft',
      thumbnail: '',
      publishedAt: '',
      isFeatured: false,
    };
  }

  private uploadImages(files: File[]): void {
    if (this.isUploading) return;

    this.isUploading = true;
    this.uploadError = '';

    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    this.http.post<UploadResponse>(`${this.apiUrl}/blog/posts/uploads`, formData).subscribe({
      next: (response) => {
        const urls = response.data?.urls ?? [];
        if (urls.length) {
          this.post.thumbnail = urls[0];
        }
      },
      error: (error) => {
        this.uploadError = error?.error?.message || 'Không thể tải ảnh.';
      },
      complete: () => {
        this.isUploading = false;
      },
    });
  }

  private submitPost(status: BlogStatus): void {
    if (this.isSaving) return;

    this.saveError = '';
    this.saveSuccess = '';

    if (!this.post.title.trim()) {
      this.saveError = 'Vui lòng nhập tiêu đề bài viết.';
      return;
    }
    if (!this.post.excerpt.trim()) {
      this.saveError = 'Vui lòng nhập mô tả ngắn.';
      return;
    }
    if (!this.post.content.trim()) {
      this.saveError = 'Vui lòng nhập nội dung bài viết.';
      return;
    }

    const categoryIdNumber = Number(this.post.categoryId);
    if (!Number.isFinite(categoryIdNumber) || categoryIdNumber <= 0) {
      this.saveError = 'Vui lòng chọn danh mục hợp lệ.';
      return;
    }

    if (!this.post.thumbnail) {
      this.saveError = 'Vui lòng tải ảnh bìa trước khi lưu bài viết.';
      return;
    }

    const hasReadingTimeInput =
      this.post.readingTime !== null &&
      this.post.readingTime !== undefined &&
      `${this.post.readingTime}`.trim() !== '';
    const manualReadingTime = this.normalizePositiveNumber(this.post.readingTime);

    if (hasReadingTimeInput && manualReadingTime === null) {
      this.saveError = 'Thời gian đọc phải là số lớn hơn 0.';
      return;
    }

    const publishedAt = this.normalizeDateForApi(this.post.publishedAt);
    if (this.post.publishedAt && !publishedAt) {
      this.saveError = 'Ngày đăng không đúng định dạng.';
      return;
    }

    this.isSaving = true;
    this.post.status = status;

    const tags = this.splitCommaList(this.post.tags);
    const metaKeywords = this.splitCommaList(this.post.metaKeywords);
    const currentUser = this.authService.currentUser();
    const authorId =
      this.extractNumericId(this.post.authorId) ?? this.extractNumericId(currentUser?.id);
    const authorName = this.post.authorName.trim() || currentUser?.name || 'Admin';
    const authorRole =
      this.post.authorRole.trim() || this.resolveDefaultAuthorRole(currentUser?.role);

    const payload = {
      title: this.post.title.trim(),
      slug: this.post.slug.trim() || this.slugify(this.post.title),
      excerpt: this.post.excerpt.trim(),
      content: this.post.content.trim(),
      category_id: categoryIdNumber,
      categoryId: String(categoryIdNumber),
      tags,
      thumbnail: this.post.thumbnail,
      reading_time: manualReadingTime ?? this.estimateReadingTime(this.post.content),
      is_featured: this.post.isFeatured,
      is_published: status === 'published',
      is_archived: status === 'archived',
      ...(publishedAt ? { published_at: publishedAt } : {}),
      seo: {
        meta_title: this.post.metaTitle.trim(),
        meta_description: this.post.metaDescription.trim(),
        meta_keywords: metaKeywords,
        og_image: this.post.thumbnail,
      },
      author: {
        ...(authorId !== null ? { author_id: authorId } : {}),
        name: authorName,
        ...(authorRole ? { role: authorRole } : {}),
        ...(currentUser?.avatar ? { avatar: currentUser.avatar } : {}),
      },
    };

    const request$ =
      this.isEditMode && this.postId
        ? this.http.put<BlogResponse>(`${this.apiUrl}/blog/posts/${this.postId}`, payload)
        : this.http.post<BlogResponse>(`${this.apiUrl}/blog/posts`, payload);

    request$.subscribe({
      next: (response) => {
        this.saveSuccess = response.message || 'Lưu bài viết thành công.';
        if (status === 'published') {
          this.router.navigate(['/blog/posts']);
        }
      },
      error: (error) => {
        this.saveError = error?.error?.message || 'Không thể lưu bài viết.';
      },
      complete: () => {
        this.isSaving = false;
      },
    });
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u0111\u0110]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private loadPost(id: string): void {
    this.isLoadingPost = true;
    this.loadError = '';

    this.http.get<BlogResponse>(`${this.apiUrl}/blog/posts/${id}`).subscribe({
      next: (response) => {
        const defaults = this.createEmptyPost();
        const data = response.data || {};

        this.post = {
          ...defaults,
          title: data.title || '',
          slug: data.slug || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
          categoryId: String(data.category_id ?? data.categoryId ?? ''),
          tags: this.normalizeCommaText(data.tags),
          readingTime: this.normalizePositiveNumber(data.reading_time),
          authorId: this.extractNumericId(data.author?.author_id) ?? defaults.authorId,
          authorName: data.author?.name || defaults.authorName,
          authorRole: data.author?.role || defaults.authorRole,
          metaTitle: data.seo?.meta_title || '',
          metaDescription: data.seo?.meta_description || '',
          metaKeywords: this.normalizeCommaText(data.seo?.meta_keywords),
          status: this.resolveStatus(data),
          thumbnail: data.thumbnail || '',
          publishedAt: this.formatDateTimeLocal(data.published_at),
          isFeatured: Boolean(data.is_featured),
        };
      },
      error: (error) => {
        this.loadError = error?.error?.message || 'Không thể tải bài viết.';
      },
      complete: () => {
        this.isLoadingPost = false;
      },
    });
  }

  private loadCategories(): void {
    this.isLoadingCategories = true;
    this.categoriesError = '';

    const params = new HttpParams({ fromObject: { page: '1', limit: '100' } });
    this.http
      .get<{ success: boolean; data?: { items: BlogCategoryApi[] } }>(
        `${this.apiUrl}/blog/categories`,
        { params },
      )
      .subscribe({
        next: (response) => {
          const items = response.data?.items ?? [];
          this.categories = items
            .map((item) => {
              const rawId = (item as BlogCategoryApi).id ?? item.category_id ?? (item as any)._id;
              const id = Number(rawId);
              return { ...item, id };
            })
            .filter((item) => Number.isFinite(item.id) && item.id > 0);
          this.isLoadingCategories = false;
        },
        error: (error) => {
          this.categoriesError = error?.error?.message || 'Không thể tải danh mục blog.';
          this.isLoadingCategories = false;
        },
      });
  }

  private resolveStatus(post: BlogPostApi): BlogStatus {
    if (post.is_archived) return 'archived';
    return post.is_published ? 'published' : 'draft';
  }

  private splitCommaList(value: string): string[] {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private normalizeCommaText(value: string | string[] | undefined): string {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean).join(', ');
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .join(', ');
    }
    return '';
  }

  private normalizePositiveNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const nextValue = Number(value);
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      return null;
    }

    return Math.round(nextValue);
  }

  private extractNumericId(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const nextValue = Number(value);
    if (!Number.isFinite(nextValue) || nextValue <= 0) {
      return null;
    }

    return Math.round(nextValue);
  }

  private normalizeDateForApi(value: string): string | null {
    if (!value.trim()) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }

  private formatDateTimeLocal(value: unknown): string {
    if (!value) return '';

    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return '';

    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private estimateReadingTime(content: string): number {
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 220));
  }

  private resolveDefaultAuthorRole(role: string | undefined): string {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Quan tri vien';
      case 'staff':
        return 'Nhan vien';
      default:
        return '';
    }
  }
}
