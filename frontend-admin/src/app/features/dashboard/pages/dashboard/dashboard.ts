import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ApiResponse, BackendListResponse, UserRole } from '../../../../models';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: string;
  tone: 'accent' | 'teal' | 'amber' | 'neutral';
}

interface ReportBar {
  label: string;
  value: number;
  tone: StatCard['tone'];
}

interface ContactPreview {
  id: string;
  name: string;
  email: string;
  subject: string;
  status: 'new' | 'processing' | 'replied' | 'closed';
  time: string;
}

interface StatusSlice {
  key: ContactPreview['status'];
  label: string;
  value: number;
  color: string;
  percent: number;
}

interface CommentPreview {
  id: string;
  author: string;
  content: string;
  target: string;
  time: string;
  rating?: number;
}

interface ProductSummary {
  product_id: number;
  name: string;
}

interface BlogPostSummary {
  blog_id: number;
  title: string;
  views: number;
  updated_at?: string;
}

interface ContactMessageApi {
  contact_id: number;
  full_name?: string;
  fullName?: string;
  email: string;
  purpose: 'consult' | 'rent' | 'buy' | 'custom' | 'cooperation';
  status: 'new' | 'processing' | 'replied' | 'closed' | 'done' | 'cancelled';
  created_at?: string;
  createdAt?: string;
}

interface ContactStatsResponse {
  statusStats: {
    total: number;
    new: number;
    processing: number;
    replied: number;
    closed: number;
  };
}

interface AdminComment {
  id: string;
  type: 'product' | 'blog';
  userName: string;
  content: string;
  rating?: number;
  productName?: string;
  blogTitle?: string;
  createdAt: string;
}

interface AdminCommentResponse {
  comments: AdminComment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  protected stats: StatCard[] = [
    {
      title: 'Sản phẩm đang bán',
      value: '0',
      change: 'Tổng hiện tại',
      icon: 'fas fa-box',
      tone: 'accent',
    },
    {
      title: 'Bài blog đã đăng',
      value: '0',
      change: 'Tổng hiện tại',
      icon: 'fas fa-book',
      tone: 'teal',
    },
    {
      title: 'Liên hệ mới',
      value: '0',
      change: 'Đang chờ xử lý',
      icon: 'fas fa-envelope',
      tone: 'amber',
    },
    {
      title: 'Bình luận chưa phản hồi',
      value: '0',
      change: 'Cần xử lý',
      icon: 'fas fa-comments',
      tone: 'neutral',
    },
  ];

  protected summaryBars: ReportBar[] = [
    { label: 'Sản phẩm', value: 0, tone: 'accent' },
    { label: 'Bài blog', value: 0, tone: 'teal' },
    { label: 'Liên hệ mới', value: 0, tone: 'amber' },
    { label: 'Comment chờ', value: 0, tone: 'neutral' },
  ];
  protected summaryMax = 1;
  protected contactStatusSlices: StatusSlice[] = [
    { key: 'new', label: 'Mới', value: 0, color: 'var(--amber)', percent: 0 },
    { key: 'processing', label: 'Đang xử lý', value: 0, color: 'var(--info)', percent: 0 },
    { key: 'replied', label: 'Đã phản hồi', value: 0, color: 'var(--success)', percent: 0 },
    { key: 'closed', label: 'Đã đóng', value: 0, color: '#94a3b8', percent: 0 },
  ];
  protected contactStatusTotal = 0;
  protected contactStatusGradient = 'conic-gradient(#e6dcd0 0% 100%)';
  protected pendingCommentTotal = 0;
  protected pendingCommentCount = 0;
  protected pendingCommentRate = 0;
  protected reportUpdatedAt = '—';

  protected readonly statusMeta: Record<ContactPreview['status'], string> = {
    new: 'badge badge-warning',
    processing: 'badge badge-info',
    replied: 'badge badge-success',
    closed: 'badge badge-neutral',
  };

  protected readonly isSuperAdmin = computed(
    () => this.authService.currentUser()?.role === UserRole.SUPER_ADMIN,
  );

  protected latestContacts: ContactPreview[] = [];
  protected latestComments: CommentPreview[] = [];
  protected isLoading = false;
  protected loadError = '';

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.isLoading = true;
    this.loadError = '';

    const pagingParams = new HttpParams({ fromObject: { page: '1', limit: '1' } });
    const contactParams = new HttpParams({
      fromObject: { page: '1', limit: '5', sort: '-created_at' },
    });
    const commentParams = new HttpParams({ fromObject: { page: '1', limit: '5' } });
    const pendingParams = new HttpParams({
      fromObject: { page: '1', limit: '1', status: 'pending' },
    });

    forkJoin({
      products: this.http.get<ApiResponse<BackendListResponse<ProductSummary>>>(
        `${this.apiUrl}/products`,
        { params: pagingParams },
      ),
      posts: this.http.get<ApiResponse<BackendListResponse<BlogPostSummary>>>(
        `${this.apiUrl}/blog/posts`,
        { params: pagingParams },
      ),
      contactStats: this.http.get<ApiResponse<ContactStatsResponse>>(
        `${this.apiUrl}/contact/statistics`,
      ),
      contacts: this.http.get<ApiResponse<BackendListResponse<ContactMessageApi>>>(
        `${this.apiUrl}/contact`,
        { params: contactParams },
      ),
      comments: this.http.get<ApiResponse<AdminCommentResponse>>(`${this.apiUrl}/admin/comments`, {
        params: commentParams,
      }),
      pendingComments: this.http.get<ApiResponse<AdminCommentResponse>>(
        `${this.apiUrl}/admin/comments`,
        { params: pendingParams },
      ),
    }).subscribe({
      next: (response) => {
        const productTotal = response.products.data?.pagination.total ?? 0;
        const postTotal = response.posts.data?.pagination.total ?? 0;
        const newContacts = response.contactStats.data?.statusStats?.new ?? 0;
        const pendingComments = response.pendingComments.data?.pagination.total ?? 0;
        const commentTotal =
          response.comments.data?.pagination.total ?? response.comments.data?.comments?.length ?? 0;

        this.stats = [
          { ...this.stats[0], value: this.formatNumber(productTotal) },
          { ...this.stats[1], value: this.formatNumber(postTotal) },
          { ...this.stats[2], value: this.formatNumber(newContacts) },
          { ...this.stats[3], value: this.formatNumber(pendingComments) },
        ];

        this.summaryBars = [
          { label: 'Sản phẩm', value: productTotal, tone: 'accent' },
          { label: 'Bài blog', value: postTotal, tone: 'teal' },
          { label: 'Liên hệ mới', value: newContacts, tone: 'amber' },
          { label: 'Comment chờ', value: pendingComments, tone: 'neutral' },
        ];
        this.summaryMax = Math.max(1, ...this.summaryBars.map((item) => item.value));

        this.pendingCommentTotal = commentTotal;
        this.pendingCommentCount = pendingComments;
        this.pendingCommentRate = commentTotal
          ? Math.min(100, Math.round((pendingComments / commentTotal) * 100))
          : 0;

        this.contactStatusSlices = this.buildContactStatusSlices(
          response.contactStats.data?.statusStats,
        );
        this.contactStatusTotal = this.contactStatusSlices.reduce(
          (sum, slice) => sum + slice.value,
          0,
        );
        this.contactStatusGradient = this.buildContactStatusGradient(this.contactStatusSlices);
        this.reportUpdatedAt = this.formatDateTime(new Date().toISOString());

        const contacts = response.contacts.data?.items ?? [];
        this.latestContacts = contacts.map((item) => ({
          id: String(item.contact_id),
          name: item.full_name || item.fullName || 'Khách hàng',
          email: item.email,
          subject: this.purposeLabel(item.purpose),
          status: this.normalizeContactStatus(item.status),
          time: this.formatDate(item.created_at || item.createdAt || ''),
        }));

        const comments = response.comments.data?.comments ?? [];
        this.latestComments = comments.map((comment) => ({
          id: comment.id,
          author: comment.userName,
          content: comment.content,
          target:
            comment.type === 'product'
              ? `Sản phẩm ? ${comment.productName ?? '—'}`
              : `Blog ? ${comment.blogTitle ?? '—'}`,
          time: this.formatDate(comment.createdAt),
          rating: comment.rating,
        }));

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load dashboard data:', error);
        this.loadError = 'Không thể tải dữ liệu dashboard';
        this.isLoading = false;
      },
    });
  }

  protected exportReport(): void {
    if (!this.isSuperAdmin()) {
      this.loadError = 'Chỉ super admin mới được xuất báo cáo.';
      return;
    }

    const now = new Date();
    const fileName = `dashboard-report-${this.formatFileTimestamp(now)}.xls`;
    const content = this.buildExcelReport(now);
    this.downloadExcel(content, fileName);
  }

  protected toneColor(tone: StatCard['tone']): string {
    switch (tone) {
      case 'accent':
        return 'linear-gradient(135deg, #8b1c35, #6f1228)';
      case 'teal':
        return 'linear-gradient(135deg, #0f766e, #115e59)';
      case 'amber':
        return 'linear-gradient(135deg, #f59e0b, #d97706)';
      default:
        return 'linear-gradient(135deg, #1f2937, #0f172a)';
    }
  }

  protected toneFill(tone: StatCard['tone']): string {
    switch (tone) {
      case 'accent':
        return 'linear-gradient(135deg, #8b1c35, #6f1228)';
      case 'teal':
        return 'linear-gradient(135deg, #0f766e, #115e59)';
      case 'amber':
        return 'linear-gradient(135deg, #f59e0b, #d97706)';
      default:
        return 'linear-gradient(135deg, #1f2937, #0f172a)';
    }
  }

  protected barPercent(value: number): number {
    if (!this.summaryMax) return 0;
    return Math.round((value / this.summaryMax) * 100);
  }

  private normalizeContactStatus(status: ContactMessageApi['status']): ContactPreview['status'] {
    if (status === 'done' || status === 'cancelled') {
      return 'closed';
    }
    if (status === 'processing' || status === 'replied' || status === 'closed') {
      return status;
    }
    return 'new';
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value);
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private purposeLabel(purpose: ContactMessageApi['purpose']): string {
    const map = {
      consult: 'Tư vấn mua cổ phục',
      rent: 'Thuê cổ phục chụp ảnh',
      buy: 'Mua cổ phục',
      custom: 'May đo theo yêu cầu',
      cooperation: 'Hợp tác / dự án',
    };
    return map[purpose] ?? purpose;
  }

  private buildContactStatusSlices(
    stats?: ContactStatsResponse['statusStats'],
  ): StatusSlice[] {
    const slices: Omit<StatusSlice, 'percent'>[] = [
      { key: 'new', label: 'Mới', value: stats?.new ?? 0, color: 'var(--amber)' },
      {
        key: 'processing',
        label: 'Đang xử lý',
        value: stats?.processing ?? 0,
        color: 'var(--info)',
      },
      { key: 'replied', label: 'Đã phản hồi', value: stats?.replied ?? 0, color: 'var(--success)' },
      { key: 'closed', label: 'Đã đóng', value: stats?.closed ?? 0, color: '#94a3b8' },
    ];
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);
    return slices.map((slice) => ({
      ...slice,
      percent: total ? Math.round((slice.value / total) * 100) : 0,
    }));
  }

  private buildContactStatusGradient(slices: StatusSlice[]): string {
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);
    if (!total) {
      return 'conic-gradient(#e6dcd0 0% 100%)';
    }
    let start = 0;
    const segments = slices.map((slice) => {
      const percent = (slice.value / total) * 100;
      const end = start + percent;
      const segment = `${slice.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
      start = end;
      return segment;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }

  private buildExcelReport(date: Date): string {
    const escapeCell = (value: string | number | null | undefined): string => {
      const raw = value === null || value === undefined ? '' : String(value);
      return raw
        .replace(/\r?\n|\r/g, ' ')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const summaryRows = this.summaryBars
      .map(
        (item) =>
          `<tr><td>${escapeCell(item.label)}</td><td>${escapeCell(item.value)}</td></tr>`,
      )
      .join('');

    const statusRows = this.contactStatusSlices
      .map(
        (slice) =>
          `<tr><td>${escapeCell(slice.label)}</td><td>${escapeCell(
            slice.value,
          )}</td><td>${escapeCell(slice.percent)}%</td></tr>`,
      )
      .join('');

    const contactRows = this.latestContacts
      .map(
        (contact) =>
          `<tr><td>${escapeCell(contact.name)}</td><td>${escapeCell(
            contact.email,
          )}</td><td>${escapeCell(contact.subject)}</td><td>${escapeCell(
            contact.status,
          )}</td><td>${escapeCell(contact.time)}</td></tr>`,
      )
      .join('');

    const commentRows = this.latestComments
      .map(
        (comment) =>
          `<tr><td>${escapeCell(comment.author)}</td><td>${escapeCell(
            comment.content,
          )}</td><td>${escapeCell(comment.target)}</td><td>${escapeCell(
            comment.rating ?? '',
          )}</td><td>${escapeCell(comment.time)}</td></tr>`,
      )
      .join('');

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
        </head>
        <body>
          <table>
            <tr><th colspan="2">Báo cáo dashboard</th></tr>
            <tr><td>Ngày xuất</td><td>${escapeCell(this.formatDateTime(date.toISOString()))}</td></tr>
          </table>
          <br />
          <table>
            <tr><th colspan="2">Tổng quan KPI</th></tr>
            <tr><th>Chỉ số</th><th>Giá trị</th></tr>
            ${summaryRows || '<tr><td colspan="2">Không có dữ liệu</td></tr>'}
          </table>
          <br />
          <table>
            <tr><th colspan="3">Trạng thái liên hệ</th></tr>
            <tr><th>Trạng thái</th><th>Số lượng</th><th>Tỷ lệ</th></tr>
            ${statusRows || '<tr><td colspan="3">Không có dữ liệu</td></tr>'}
          </table>
          <br />
          <table>
            <tr><th colspan="2">Bình luận chờ duyệt</th></tr>
            <tr><td>Chờ duyệt</td><td>${escapeCell(this.pendingCommentCount)}</td></tr>
            <tr><td>Tổng bình luận</td><td>${escapeCell(this.pendingCommentTotal)}</td></tr>
            <tr><td>Tỷ lệ</td><td>${escapeCell(this.pendingCommentRate)}%</td></tr>
          </table>
          <br />
          <table>
            <tr><th colspan="5">Liên hệ gần nhất</th></tr>
            <tr><th>Khách hàng</th><th>Email</th><th>Chủ đề</th><th>Trạng thái</th><th>Thời gian</th></tr>
            ${contactRows || '<tr><td colspan="5">Không có dữ liệu</td></tr>'}
          </table>
          <br />
          <table>
            <tr><th colspan="5">Bình luận mới nhất</th></tr>
            <tr><th>Người gửi</th><th>Nội dung</th><th>Đối tượng</th><th>Đánh giá</th><th>Thời gian</th></tr>
            ${commentRows || '<tr><td colspan="5">Không có dữ liệu</td></tr>'}
          </table>
        </body>
      </html>
    `
  }

  private downloadExcel(content: string, fileName: string): void {
    const blob = new Blob([content], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private formatFileTimestamp(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
      date.getHours(),
    )}${pad(date.getMinutes())}`;
  }
}
