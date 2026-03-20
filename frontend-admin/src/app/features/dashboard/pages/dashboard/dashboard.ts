import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
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

interface SalesDashboardSummary {
  total_revenue: number;
  total_profit: number;
  completed_orders: number;
  total_orders: number;
  cancelled_orders: number;
  completion_rate: number;
  average_order_value: number;
}

interface SalesTrendPoint {
  date: string;
  label: string;
  revenue: number;
  profit: number;
  completed_orders: number;
}

interface SalesDashboardReport {
  period: {
    days: number;
    from: string;
    to: string;
    timezone: string;
  };
  summary: SalesDashboardSummary;
  trend: SalesTrendPoint[];
  updated_at?: string;
}

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  label: string;
  date: string;
}

interface LineChartModel {
  path: string;
  areaPath: string;
  points: ChartPoint[];
  maxValue: number;
}

interface BarChartItem {
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  label: string;
  date: string;
}

interface BarChartModel {
  bars: BarChartItem[];
  maxValue: number;
}

type DetailChartType = 'revenue' | 'profit' | 'completed';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly chartWidth = 640;
  private readonly chartHeight = 220;
  private readonly chartPaddingX = 20;
  private readonly chartPaddingTop = 16;
  private readonly chartPaddingBottom = 24;

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
  protected reportUpdatedAt = '--';

  protected readonly salesRangeOptions = [7, 30, 90];
  protected selectedSalesRange = 30;
  protected salesRangeLabel = '--';
  protected isSalesLoading = false;
  protected salesSummary: SalesDashboardSummary = {
    total_revenue: 0,
    total_profit: 0,
    completed_orders: 0,
    total_orders: 0,
    cancelled_orders: 0,
    completion_rate: 0,
    average_order_value: 0,
  };
  protected salesTrend: SalesTrendPoint[] = [];
  protected salesTrendTicks: string[] = [];
  protected revenueLineChart: LineChartModel = this.emptyLineChart();
  protected profitLineChart: LineChartModel = this.emptyLineChart();
  protected completedBarChart: BarChartModel = this.emptyBarChart();
  protected isDetailModalOpen = false;
  protected detailChartType: DetailChartType = 'revenue';

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
    this.loadSalesReport();
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
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
              ? `Sản phẩm - ${comment.productName ?? '--'}`
              : `Blog - ${comment.blogTitle ?? '--'}`,
          time: this.formatDate(comment.createdAt),
          rating: comment.rating,
        }));

        this.reportUpdatedAt = this.formatDateTime(new Date().toISOString());
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load dashboard data:', error);
        this.loadError = 'Không thể tải dữ liệu dashboard';
        this.isLoading = false;
      },
    });
  }

  private loadSalesReport(): void {
    this.isSalesLoading = true;
    const params = new HttpParams({
      fromObject: { days: String(this.selectedSalesRange) },
    });

    this.http
      .get<ApiResponse<SalesDashboardReport>>(`${this.apiUrl}/buy-orders/dashboard-report`, {
        params,
      })
      .subscribe({
        next: (response) => {
          this.applySalesReport(response.data);
          this.reportUpdatedAt = this.formatDateTime(new Date().toISOString());
          this.isSalesLoading = false;
        },
        error: (error) => {
          console.error('Failed to load sales report data:', error);
          this.resetSalesReport();
          this.isSalesLoading = false;
        },
      });
  }

  protected changeSalesRange(days: number): void {
    if (days === this.selectedSalesRange) return;
    this.selectedSalesRange = days;
    this.loadSalesReport();
  }

  protected openChartDetail(type: DetailChartType): void {
    this.detailChartType = type;
    this.isDetailModalOpen = true;
    this.lockBodyScroll();
  }

  protected closeChartDetail(): void {
    this.isDetailModalOpen = false;
    this.unlockBodyScroll();
  }

  protected onDetailBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeChartDetail();
    }
  }

  private lockBodyScroll(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  private unlockBodyScroll(): void {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  protected detailModalTitle(): string {
    if (this.detailChartType === 'revenue') {
      return 'Chi tiết doanh thu theo ngày';
    }
    if (this.detailChartType === 'profit') {
      return 'Chi tiết lợi nhuận theo ngày';
    }
    return 'Chi tiết đơn hoàn thành theo ngày';
  }

  protected detailMetricLabel(): string {
    if (this.detailChartType === 'revenue') return 'Doanh thu';
    if (this.detailChartType === 'profit') return 'Lợi nhuận';
    return 'Đơn hoàn thành';
  }

  protected detailSummaryValue(): string {
    if (this.detailChartType === 'revenue') {
      return this.formatCurrency(this.salesSummary.total_revenue);
    }
    if (this.detailChartType === 'profit') {
      return this.formatCurrency(this.salesSummary.total_profit);
    }
    return this.formatNumber(this.salesSummary.completed_orders);
  }

  protected detailValueOf(point: SalesTrendPoint): number {
    if (this.detailChartType === 'revenue') return point.revenue;
    if (this.detailChartType === 'profit') return point.profit;
    return point.completed_orders;
  }

  protected formatDetailValue(value: number): string {
    if (this.detailChartType === 'completed') {
      return this.formatNumber(value);
    }
    return this.formatCurrency(value);
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

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value);
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  protected isSalesRangeActive(days: number): boolean {
    return this.selectedSalesRange === days;
  }

  protected formatCompletionRate(value: number): string {
    return `${Number(value || 0).toFixed(1)}%`;
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

  protected hasSalesTrendData(): boolean {
    return this.salesTrend.some(
      (point) => point.revenue > 0 || point.profit > 0 || point.completed_orders > 0,
    );
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

  private buildContactStatusSlices(stats?: ContactStatsResponse['statusStats']): StatusSlice[] {
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

  private applySalesReport(report?: SalesDashboardReport): void {
    if (!report) {
      this.resetSalesReport();
      return;
    }

    this.salesSummary = {
      total_revenue: Number(report.summary?.total_revenue || 0),
      total_profit: Number(report.summary?.total_profit || 0),
      completed_orders: Number(report.summary?.completed_orders || 0),
      total_orders: Number(report.summary?.total_orders || 0),
      cancelled_orders: Number(report.summary?.cancelled_orders || 0),
      completion_rate: Number(report.summary?.completion_rate || 0),
      average_order_value: Number(report.summary?.average_order_value || 0),
    };

    this.salesTrend = report.trend ?? [];
    this.salesRangeLabel = report.period?.from && report.period?.to
      ? `${this.formatDate(report.period.from)} - ${this.formatDate(report.period.to)}`
      : '--';
    this.salesTrendTicks = this.buildTrendTicks(this.salesTrend);
    this.revenueLineChart = this.buildLineChart(this.salesTrend, (item) => item.revenue);
    this.profitLineChart = this.buildLineChart(this.salesTrend, (item) => item.profit);
    this.completedBarChart = this.buildBarChart(this.salesTrend, (item) => item.completed_orders);
  }

  private resetSalesReport(): void {
    this.salesSummary = {
      total_revenue: 0,
      total_profit: 0,
      completed_orders: 0,
      total_orders: 0,
      cancelled_orders: 0,
      completion_rate: 0,
      average_order_value: 0,
    };
    this.salesTrend = [];
    this.salesRangeLabel = '--';
    this.salesTrendTicks = [];
    this.revenueLineChart = this.emptyLineChart();
    this.profitLineChart = this.emptyLineChart();
    this.completedBarChart = this.emptyBarChart();
  }

  private emptyLineChart(): LineChartModel {
    return {
      path: '',
      areaPath: '',
      points: [],
      maxValue: 0,
    };
  }

  private emptyBarChart(): BarChartModel {
    return {
      bars: [],
      maxValue: 0,
    };
  }

  private buildLineChart(
    trend: SalesTrendPoint[],
    selector: (item: SalesTrendPoint) => number,
  ): LineChartModel {
    if (!trend.length) return this.emptyLineChart();

    const values = trend.map((item) => Number(selector(item) || 0));
    const maxValue = Math.max(0, ...values);
    const minValue = Math.min(0, ...values);
    const valueRange = maxValue - minValue || 1;

    const innerWidth = this.chartWidth - this.chartPaddingX * 2;
    const innerHeight = this.chartHeight - this.chartPaddingTop - this.chartPaddingBottom;
    const stepX = trend.length > 1 ? innerWidth / (trend.length - 1) : 0;
    const baselineY = this.chartPaddingTop + innerHeight;

    const points: ChartPoint[] = trend.map((item, index) => {
      const value = values[index];
      const normalized = (value - minValue) / valueRange;
      const x = this.chartPaddingX + stepX * index;
      const y = this.chartPaddingTop + innerHeight - normalized * innerHeight;
      return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        value,
        label: item.label || this.formatDate(item.date),
        date: item.date,
      };
    });

    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
    const areaPath =
      points.length > 1
        ? `${path} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
        : `${path} L ${points[0].x} ${baselineY} Z`;

    return {
      path,
      areaPath,
      points,
      maxValue: Math.round(maxValue),
    };
  }

  private buildBarChart(
    trend: SalesTrendPoint[],
    selector: (item: SalesTrendPoint) => number,
  ): BarChartModel {
    if (!trend.length) return this.emptyBarChart();

    const values = trend.map((item) => Number(selector(item) || 0));
    const maxValue = Math.max(1, ...values);
    const innerWidth = this.chartWidth - this.chartPaddingX * 2;
    const innerHeight = this.chartHeight - this.chartPaddingTop - this.chartPaddingBottom;
    const barGap = trend.length > 20 ? 2 : 4;
    const barWidth = Math.max(4, (innerWidth - barGap * (trend.length - 1)) / trend.length);

    const bars: BarChartItem[] = trend.map((item, index) => {
      const value = values[index];
      const rawHeight = (value / maxValue) * innerHeight;
      const height = value > 0 ? Math.max(2, rawHeight) : 0;
      const x = this.chartPaddingX + index * (barWidth + barGap);
      const y = this.chartPaddingTop + innerHeight - height;
      return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        width: Number(barWidth.toFixed(2)),
        height: Number(height.toFixed(2)),
        value,
        label: item.label || this.formatDate(item.date),
        date: item.date,
      };
    });

    return {
      bars,
      maxValue,
    };
  }

  private buildTrendTicks(trend: SalesTrendPoint[]): string[] {
    if (!trend.length) return [];
    if (trend.length === 1) return [trend[0].label || this.formatDate(trend[0].date)];

    const first = trend[0].label || this.formatDate(trend[0].date);
    const midIndex = Math.floor((trend.length - 1) / 2);
    const middle = trend[midIndex].label || this.formatDate(trend[midIndex].date);
    const last = trend[trend.length - 1].label || this.formatDate(trend[trend.length - 1].date);
    return [first, middle, last];
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

    const salesSummaryRows = [
      { label: 'Tổng doanh thu', value: this.formatCurrency(this.salesSummary.total_revenue) },
      { label: 'Tổng lợi nhuận', value: this.formatCurrency(this.salesSummary.total_profit) },
      { label: 'Đơn hoàn thành', value: this.formatNumber(this.salesSummary.completed_orders) },
      { label: 'Tổng đơn', value: this.formatNumber(this.salesSummary.total_orders) },
      { label: 'Đơn đã hủy', value: this.formatNumber(this.salesSummary.cancelled_orders) },
      { label: 'Tỷ lệ hoàn thành', value: this.formatCompletionRate(this.salesSummary.completion_rate) },
      {
        label: 'Giá trị đơn trung bình',
        value: this.formatCurrency(this.salesSummary.average_order_value),
      },
    ]
      .map((item) => `<tr><td>${escapeCell(item.label)}</td><td>${escapeCell(item.value)}</td></tr>`)
      .join('');

    const salesTrendRows = this.salesTrend
      .map(
        (point) =>
          `<tr><td>${escapeCell(point.label)}</td><td>${escapeCell(
            this.formatCurrency(point.revenue),
          )}</td><td>${escapeCell(this.formatCurrency(point.profit))}</td><td>${escapeCell(
            this.formatNumber(point.completed_orders),
          )}</td></tr>`,
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
            <tr><th colspan="2">Báo cáo doanh thu - lợi nhuận</th></tr>
            <tr><th>Chỉ số</th><th>Giá trị</th></tr>
            ${salesSummaryRows || '<tr><td colspan="2">Không có dữ liệu</td></tr>'}
          </table>
          <br />
          <table>
            <tr><th colspan="4">Xu hướng theo ngày (${escapeCell(this.salesRangeLabel)})</th></tr>
            <tr><th>Ngày</th><th>Doanh thu</th><th>Lợi nhuận</th><th>Đơn hoàn thành</th></tr>
            ${salesTrendRows || '<tr><td colspan="4">Không có dữ liệu</td></tr>'}
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
    `;
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
