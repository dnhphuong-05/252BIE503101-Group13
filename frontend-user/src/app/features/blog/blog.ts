import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Blog {
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

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './blog.html',
  styleUrls: ['./blog.css'],
})
export class BlogComponent implements OnInit {
  blogs: Blog[] = [];
  featuredBlog: Blog | null = null;
  filteredBlogs: Blog[] = [];
  selectedCategory: string = 'all';
  searchTerm: string = '';

  categories = [
    { name: 'Tất cả', value: 'all' },
    { name: 'Lịch sử', value: 'Lịch sử' },
    { name: 'Hướng dẫn', value: 'Hướng dẫn' },
    { name: 'Kiến thức', value: 'Kiến thức' },
    { name: 'Nghệ thuật', value: 'Nghệ thuật' },
  ];

  ngOnInit() {
    // Dữ liệu mẫu - sẽ thay thế bằng API call sau
    this.loadBlogs();
  }

  loadBlogs() {
    // Dữ liệu mẫu từ blogs.json - sau này sẽ load từ API
    this.blogs = [
      {
        id: 'BLOG001',
        title: 'Lịch sử hình thành và phát triển Áo Nhật Bình',
        category: 'Lịch sử',
        author: 'Nguyễn Văn A',
        authorAvatar: 'assets/images/authors/pos1.jpg',
        date: '2026-01-15',
        thumbnail: 'assets/images/blogs/pos1.jpg',
        excerpt:
          'Tìm hiểu về nguồn gốc và sự phát triển của trang phục cung đình Áo Nhật Bình thời triều Nguyễn, một trong những kiệt tác văn hóa trang phục Việt Nam.',
        content:
          'Áo Nhật Bình là một trong những trang phục cung đình cao quý nhất của triều Nguyễn...',
        views: 1250,
        likes: 89,
        tags: ['lịch sử', 'cung đình', 'nhật bình'],
      },
      {
        id: 'BLOG002',
        title: 'Hướng dẫn bảo quản áo cổ phục truyền thống',
        category: 'Hướng dẫn',
        author: 'Trần Thị B',
        authorAvatar: 'assets/images/authors/pos2.jpg',
        date: '2026-01-10',
        thumbnail: 'assets/images/blogs/pos2.jpg',
        excerpt:
          'Cách bảo quản và giặt giũ áo cổ phục để giữ được chất lượng lâu dài, tránh hư hỏng và phai màu.',
        content: 'Việc bảo quản áo cổ phục đúng cách rất quan trọng...',
        views: 980,
        likes: 65,
        tags: ['bảo quản', 'hướng dẫn', 'chăm sóc'],
      },
      {
        id: 'BLOG003',
        title: 'Phân biệt các loại áo dài cổ phục Việt Nam',
        category: 'Kiến thức',
        author: 'Lê Văn C',
        authorAvatar: 'assets/images/authors/pos3.jpg',
        date: '2026-01-05',
        thumbnail: 'assets/images/blogs/pos3.jpg',
        excerpt:
          'Tổng hợp và phân biệt các loại áo cổ phục từ cung đình đến dân gian, giúp bạn hiểu rõ hơn về trang phục truyền thống.',
        content: 'Việt Nam có nhiều loại áo cổ phục khác nhau...',
        views: 1580,
        likes: 124,
        tags: ['kiến thức', 'phân loại', 'cổ phục'],
      },
      {
        id: 'BLOG004',
        title: 'Nghệ thuật thêu trên áo dài cung đình',
        category: 'Nghệ thuật',
        author: 'Phạm Thị D',
        authorAvatar: 'assets/images/authors/pos4.jpg',
        date: '2025-12-28',
        thumbnail: 'assets/images/blogs/pos4.jpg',
        excerpt:
          'Khám phá vẻ đẹp tinh xảo của nghệ thuật thêu truyền thống trên những bộ áo dài cung đình thời xưa.',
        content: 'Nghệ thuật thêu trên áo dài cung đình là một nghệ thuật đặc biệt...',
        views: 1420,
        likes: 98,
        tags: ['nghệ thuật', 'thêu', 'cung đình'],
      },
      {
        id: 'BLOG005',
        title: 'Trang phục truyền thống trong lễ hội Việt Nam',
        category: 'Lịch sử',
        author: 'Hoàng Văn E',
        authorAvatar: 'assets/images/authors/pos1.jpg',
        date: '2025-12-20',
        thumbnail: 'assets/images/blogs/pos1.jpg',
        excerpt:
          'Vai trò và ý nghĩa của trang phục truyền thống trong các lễ hội văn hóa Việt Nam qua các thời kỳ.',
        content: 'Trang phục truyền thống đóng vai trò quan trọng trong các lễ hội...',
        views: 890,
        likes: 72,
        tags: ['lịch sử', 'lễ hội', 'văn hóa'],
      },
      {
        id: 'BLOG006',
        title: 'Cách chọn áo cổ phục phù hợp với dáng người',
        category: 'Hướng dẫn',
        author: 'Đỗ Thị F',
        authorAvatar: 'assets/images/authors/pos2.jpg',
        date: '2025-12-15',
        thumbnail: 'assets/images/blogs/pos2.jpg',
        excerpt:
          'Hướng dẫn chi tiết cách chọn lựa áo cổ phục phù hợp với từng dáng người để tôn lên vẻ đẹp tự nhiên.',
        content: 'Việc chọn áo cổ phục phù hợp với dáng người là một nghệ thuật...',
        views: 1120,
        likes: 85,
        tags: ['hướng dẫn', 'thời trang', 'dáng người'],
      },
    ];

    // Lấy bài viết nổi bật (bài có nhiều views nhất)
    this.featuredBlog = this.blogs.reduce((prev, current) =>
      prev.views > current.views ? prev : current,
    );

    this.filteredBlogs = this.blogs;
  }

  filterByCategory(category: string) {
    this.selectedCategory = category;
    this.applyFilters();
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredBlogs = this.blogs.filter((blog) => {
      const matchesCategory =
        this.selectedCategory === 'all' || blog.category === this.selectedCategory;
      const matchesSearch =
        blog.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        blog.excerpt.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Method sẽ được sử dụng khi kết nối API
  /*
  async loadBlogsFromAPI() {
    try {
      const response = await fetch('http://your-api-url/blogs');
      this.blogs = await response.json();
      this.filteredBlogs = this.blogs;
      if (this.blogs.length > 0) {
        this.featuredBlog = this.blogs[0];
      }
    } catch (error) {
      console.error('Error loading blogs:', error);
    }
  }
  */
}
