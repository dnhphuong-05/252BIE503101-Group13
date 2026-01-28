# Blog Component - Hướng dẫn

## Tổng quan

Component trang blog được thiết kế với bảng màu chủ đạo:

- **Champagne Beige**: #F2E5C6
- **Sand Gold**: #F2D9A0
- **Burgundy**: #75162D
- **Dark Maroon**: #560B18
- **Deep Wine**: #3B010B

## Tính năng hiện tại

✅ Hiển thị danh sách blog cards với dữ liệu mẫu
✅ Bài viết nổi bật (featured blog)
✅ Lọc theo danh mục (Lịch sử, Hướng dẫn, Kiến thức, Nghệ thuật)
✅ Tìm kiếm bài viết
✅ Hiển thị thông tin tác giả, ngày đăng, lượt xem, lượt thích
✅ Tags cho mỗi bài viết
✅ Newsletter subscription form
✅ Responsive design

## Cấu trúc dữ liệu Blog

```typescript
interface Blog {
  id: string; // ID duy nhất
  title: string; // Tiêu đề bài viết
  category: string; // Danh mục (Lịch sử, Hướng dẫn, Kiến thức, Nghệ thuật)
  author: string; // Tên tác giả
  authorAvatar: string; // Đường dẫn ảnh đại diện tác giả
  date: string; // Ngày đăng (format: YYYY-MM-DD)
  thumbnail: string; // Đường dẫn ảnh thumbnail
  excerpt: string; // Đoạn trích ngắn
  content: string; // Nội dung đầy đủ (HTML)
  views: number; // Số lượt xem
  likes: number; // Số lượt thích
  tags: string[]; // Mảng các tags
}
```

## Kết nối với API Server

### Bước 1: Tạo Blog Service

Tạo file `blog.service.ts` trong thư mục `core/services/`:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Blog {
  id: string;
  title: string;
  category: string;
  author: string;
  authorAvatar: string;
  date: string;
  thumbnail: string;
  excerpt: string;
  content: string;
  views: number;
  likes: number;
  tags: string[];
}

@Injectable({
  providedIn: 'root',
})
export class BlogService {
  private apiUrl = `${environment.apiUrl}/blogs`;

  constructor(private http: HttpClient) {}

  // Lấy tất cả bài viết
  getAllBlogs(): Observable<Blog[]> {
    return this.http.get<Blog[]>(this.apiUrl);
  }

  // Lấy bài viết theo ID
  getBlogById(id: string): Observable<Blog> {
    return this.http.get<Blog>(`${this.apiUrl}/${id}`);
  }

  // Lấy bài viết theo danh mục
  getBlogsByCategory(category: string): Observable<Blog[]> {
    return this.http.get<Blog[]>(`${this.apiUrl}/category/${category}`);
  }

  // Tìm kiếm bài viết
  searchBlogs(query: string): Observable<Blog[]> {
    return this.http.get<Blog[]>(`${this.apiUrl}/search?q=${query}`);
  }

  // Tăng lượt xem
  incrementViews(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/view`, {});
  }

  // Thích bài viết
  likeBlog(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/like`, {});
  }
}
```

### Bước 2: Cập nhật Environment

Trong file `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api', // Thay đổi theo URL API của bạn
};
```

Trong file `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-production-api.com/api',
};
```

### Bước 3: Cập nhật Blog Component

Trong file `blog.ts`, thay thế method `loadBlogs()`:

```typescript
import { BlogService } from '../../core/services/blog.service';

export class BlogComponent implements OnInit {
  constructor(private blogService: BlogService) {}

  ngOnInit() {
    this.loadBlogsFromAPI();
  }

  loadBlogsFromAPI() {
    this.blogService.getAllBlogs().subscribe({
      next: (data) => {
        this.blogs = data;
        this.filteredBlogs = data;

        // Lấy bài viết nổi bật
        if (this.blogs.length > 0) {
          this.featuredBlog = this.blogs.reduce((prev, current) =>
            prev.views > current.views ? prev : current,
          );
        }
      },
      error: (error) => {
        console.error('Error loading blogs:', error);
        // Có thể hiển thị thông báo lỗi cho user
      },
    });
  }
}
```

### Bước 4: API Endpoints cần thiết

Backend server cần cung cấp các endpoints sau:

```
GET    /api/blogs                    - Lấy tất cả bài viết
GET    /api/blogs/:id                - Lấy chi tiết bài viết theo ID
GET    /api/blogs/category/:category - Lấy bài viết theo danh mục
GET    /api/blogs/search?q=query     - Tìm kiếm bài viết
POST   /api/blogs/:id/view           - Tăng lượt xem
POST   /api/blogs/:id/like           - Thích bài viết
POST   /api/newsletter/subscribe     - Đăng ký newsletter
```

### Bước 5: Xử lý Loading & Error States

Thêm vào component:

```typescript
export class BlogComponent implements OnInit {
  isLoading = false;
  errorMessage = '';

  loadBlogsFromAPI() {
    this.isLoading = true;
    this.errorMessage = '';

    this.blogService.getAllBlogs().subscribe({
      next: (data) => {
        this.blogs = data;
        this.filteredBlogs = data;
        this.isLoading = false;

        if (this.blogs.length > 0) {
          this.featuredBlog = this.blogs.reduce((prev, current) =>
            prev.views > current.views ? prev : current,
          );
        }
      },
      error: (error) => {
        console.error('Error loading blogs:', error);
        this.errorMessage = 'Không thể tải dữ liệu. Vui lòng thử lại sau.';
        this.isLoading = false;
      },
    });
  }
}
```

Thêm vào HTML:

```html
<!-- Loading Spinner -->
<div class="loading-spinner" *ngIf="isLoading">
  <i class="fas fa-spinner fa-spin"></i>
  <p>Đang tải...</p>
</div>

<!-- Error Message -->
<div class="error-message" *ngIf="errorMessage">
  <i class="fas fa-exclamation-circle"></i>
  <p>{{ errorMessage }}</p>
</div>
```

## Tài nguyên assets cần thiết

Đảm bảo các tài nguyên sau tồn tại trong thư mục assets:

```
assets/
├── images/
│   ├── blogs/
│   │   ├── pos1.jpg
│   │   ├── pos2.jpg
│   │   ├── pos3.jpg
│   │   └── pos4.jpg
│   └── authors/
│       ├── pos1.jpg
│       ├── pos2.jpg
│       ├── pos3.jpg
│       └── pos4.jpg
└── data/
    └── blogs.json  (dữ liệu mẫu)
```

## Testing

Để test component với dữ liệu mẫu:

1. Component đã có sẵn dữ liệu mẫu trong method `loadBlogs()`
2. Chạy `ng serve` và truy cập `/blog`
3. Test các tính năng: filter, search, responsive

Khi API sẵn sàng:

1. Uncomment và sử dụng `loadBlogsFromAPI()`
2. Comment hoặc xóa `loadBlogs()` với dữ liệu mẫu
3. Test với API thật

## Ghi chú

- Component được thiết kế standalone, không cần NgModule
- Sử dụng CommonModule và RouterLink
- Responsive cho mobile, tablet, desktop
- Màu sắc tuân thủ design system đã cho
