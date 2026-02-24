import { Component, OnInit } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BlogService, BlogPost, BlogCategory } from '../../services/blog.service';

interface TrendingTopic {
  label: string;
  type: 'category';
  value: number;
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, RouterLink],
  templateUrl: './blog.html',
  styleUrls: ['./blog.css'],
})
export class BlogComponent implements OnInit {
  blogs: BlogPost[] = [];
  allBlogs: BlogPost[] = [];
  filteredBlogs: BlogPost[] = [];
  featuredBlog: BlogPost | null = null;
  recentBlogs: BlogPost[] = [];
  tagCloud: string[] = [];
  trendingTopics: TrendingTopic[] = [];
  categories: BlogCategory[] = [];
  selectedCategory: number | 'all' = 'all';
  searchTerm: string = '';

  private categoryMap = new Map<number, string>();
  private fallbackCategories = [
    { id: 1, name: 'Lịch Sử Cổ Phục' },
    { id: 2, name: 'Hướng Dẫn Mặc' },
    { id: 3, name: 'Bảo Quản & Giặt Giũ' },
    { id: 4, name: 'Xu Hướng & Phong Cách' },
    { id: 5, name: 'May Đo & Cho Thuê' },
  ];

  constructor(private blogService: BlogService) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadBlogs();
    this.loadFeatured();
  }

  loadBlogs(): void {
    this.blogService.getPublishedPosts({ page: 1, limit: 13 }).subscribe({
      next: (res) => {
        const items = res?.data?.items || [];
        this.blogs = items;
        this.allBlogs = items;
        this.recentBlogs = items.slice(0, 4);
        this.buildTagCloud(items);
        if (!this.featuredBlog && items.length > 0) {
          this.featuredBlog = items[0];
        }
        this.applyFilters();
      },
      error: () => {
        this.blogs = [];
        this.allBlogs = [];
        this.filteredBlogs = [];
        this.recentBlogs = [];
        this.tagCloud = [];
      },
    });
  }

  loadFeatured(): void {
    this.blogService.getFeaturedPosts(1).subscribe({
      next: (res: any) => {
        const items = res?.data?.items || res?.data || [];
        if (items.length > 0) {
          this.featuredBlog = items[0];
        }
      },
      error: () => {
        // fallback handled in loadBlogs
      },
    });
  }

  loadCategories(): void {
    this.blogService.getActiveCategories({ page: 1, limit: 5 }).subscribe({
      next: (res) => {
        const items = res?.data?.items || [];
        const normalized = items
          .map((cat) => ({
            ...cat,
            id: this.resolveCategoryId(cat),
          }))
          .filter((cat) => Number.isFinite(cat.id));
        this.categories = normalized;
        this.categoryMap = new Map(normalized.map((cat) => [cat.id, cat.name]));
        this.trendingTopics = normalized.slice(0, 5).map((cat) => ({
          label: cat.name,
          type: 'category',
          value: cat.id,
        }));
      },
      error: () => {
        this.categories = [];
        this.categoryMap = new Map(this.fallbackCategories.map((cat) => [cat.id, cat.name]));
        this.trendingTopics = this.fallbackCategories.slice(0, 5).map((cat) => ({
          label: cat.name,
          type: 'category',
          value: cat.id,
        }));
      },
    });
  }

  buildTagCloud(items: BlogPost[]): void {
    const counts = new Map<string, number>();

    items.forEach((blog) => {
      (blog.tags || []).forEach((tag) => {
        const key = tag.trim();
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });

    this.tagCloud = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag)
      .slice(0, 10);
  }

  onTopicClick(topic: TrendingTopic): void {
    this.selectedCategory = topic.value;
    this.searchTerm = '';
    this.loadBlogsByCategory(topic.value);
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.applyFilters();
  }

  filterByCategory(categoryId: number | 'all'): void {
    this.selectedCategory = categoryId;
    if (categoryId === 'all') {
      this.loadBlogs();
      return;
    }
    this.loadBlogsByCategory(categoryId);
  }

  onTagClick(tag: string): void {
    this.searchTerm = tag;
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedCategory = 'all';
    this.searchTerm = '';
    this.loadBlogs();
  }

  applyFilters(): void {
    const baseList = this.allBlogs.length > 0 ? this.allBlogs : this.blogs;
    let list = [...baseList];

    if (this.selectedCategory !== 'all') {
      const selectedId = Number(this.selectedCategory);
      list = list.filter((blog) => Number(blog.category_id) === selectedId);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      list = list.filter((blog) => {
        const inText =
          blog.title?.toLowerCase().includes(term) || blog.excerpt?.toLowerCase().includes(term);
        const inTags = (blog.tags || []).some((tag) => tag.toLowerCase().includes(term));
        return inText || inTags;
      });
    }

    this.filteredBlogs = list;
  }

  loadBlogsByCategory(categoryId: number): void {
    this.blogService.getPublishedPosts({ page: 1, limit: 13, categoryId }).subscribe({
      next: (res) => {
        const items = res?.data?.items || [];
        this.blogs = items;
        this.filteredBlogs = items;
        this.recentBlogs = items.slice(0, 4);
        this.buildTagCloud(items);
        if (items.length > 0) {
          this.featuredBlog = items[0];
        }
        if (this.searchTerm.trim()) {
          this.applyFilters();
        }
      },
      error: () => {
        this.blogs = [];
        this.filteredBlogs = [];
        this.recentBlogs = [];
        this.tagCloud = [];
      },
    });
  }

  getInitial(text: string): string {
    return text ? text.charAt(0).toUpperCase() : '?';
  }

  getCategoryName(categoryId: number | string): string {
    const resolvedId = Number(categoryId);
    return this.categoryMap.get(resolvedId) || 'Chuyên mục';
  }

  private resolveCategoryId(category: BlogCategory): number {
    const rawId = (category as BlogCategory & { category_id?: number }).category_id ?? category.id;
    return Number(rawId);
  }

  getAuthorName(blog: BlogPost | null | undefined): string {
    return blog?.author?.name || 'Jonathan Doe';
  }

  getAuthorAvatar(blog: BlogPost | null | undefined): string {
    const name = encodeURIComponent(blog?.author?.name || 'User');
    return (
      blog?.author?.avatar ||
      `https://ui-avatars.com/api/?name=${name}&background=75162D&color=F2D9A0`
    );
  }

  getReadingTime(blog: BlogPost): number {
    if (blog.reading_time && blog.reading_time > 0) {
      return blog.reading_time;
    }
    const length = (blog.content || blog.excerpt || '').length;
    return Math.max(2, Math.ceil(length / 600));
  }

  formatDate(dateString: string): string {
    return this.blogService.formatDate(dateString);
  }
}
