import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';

type BlogStatus = 'draft' | 'published';

interface BlogForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: string;
  tags: string;
  metaTitle: string;
  metaDescription: string;
  status: BlogStatus;
  thumbnail: string;
}

interface BlogCategoryApi {
  id: number;
  category_id?: number;
  name: string;
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
  data?: any;
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

  protected post: BlogForm = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    categoryId: '',
    tags: '',
    metaTitle: '',
    metaDescription: '',
    status: 'draft',
    thumbnail: '',
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
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.postId = id;
      this.loadPost(id);
    }
    this.loadCategories();
  }

  protected onTitleInput(): void {
    if (!this.post.slug) {
      this.post.slug = this.slugify(this.post.title);
    }
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length === 0) return;
    this.uploadImages(files);
    input.value = '';
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive = false;
    const files = Array.from(event.dataTransfer?.files || []);
    if (files.length === 0) return;
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

  protected saveDraft(): void {
    this.submitPost('draft');
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
    return category?.name || 'Uncategorized';
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
      this.saveError = 'Vui lòng nhập đoạn trích.';
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
      this.saveError = 'Vui lòng tải ảnh cover trước khi đăng.';
      return;
    }

    this.isSaving = true;

    this.post.status = status;

    const tags = this.post.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const currentUser = this.authService.currentUser();

    const payload = {
      title: this.post.title,
      slug: this.post.slug,
      excerpt: this.post.excerpt,
      content: this.post.content,
      category_id: categoryIdNumber,
      categoryId: String(categoryIdNumber),
      tags,
      thumbnail: this.post.thumbnail,
      is_published: status === 'published',
      seo: {
        meta_title: this.post.metaTitle,
        meta_description: this.post.metaDescription,
        meta_keywords: tags,
      },
      author: {
        name: currentUser?.name || 'Admin',
        avatar: currentUser?.avatar,
      },
    };

    const request$ =
      this.isEditMode && this.postId
        ? this.http.put<BlogResponse>(`${this.apiUrl}/blog/posts/${this.postId}`, payload)
        : this.http.post<BlogResponse>(`${this.apiUrl}/blog/posts`, payload);

    request$.subscribe({
      next: (response) => {
        this.saveSuccess = response.message || 'Lưu bài viết thành công';
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
      .replace(/[đĐ]/g, 'd')
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
        const data = response.data || {};
        const tags = Array.isArray(data.tags) ? data.tags.join(', ') : data.tags || '';
        this.post = {
          ...this.post,
          title: data.title || '',
          slug: data.slug || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
          categoryId: String(data.category_id || ''),
          tags,
          metaTitle: data.seo?.meta_title || '',
          metaDescription: data.seo?.meta_description || '',
          status: data.is_published ? 'published' : 'draft',
          thumbnail: data.thumbnail || '',
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
}
