import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import {
  BuyOrderItem,
  BuyOrderListItem,
  BuyOrderService,
  BuyOrdersResponse,
} from '../../../services/buy-order.service';
import { AuthService, User } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ReturnRequestModalComponent } from '../../../shared/components/return-request-modal/return-request-modal';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipping' | 'completed' | 'cancelled';

interface ReturnOrder {
  id: string;
  orderCode: string;
  orderDate: string;
  status: OrderStatus;
  totalAmount: number;
  items: Array<{ id: string; productName: string; quantity: number; price: number }>;
  customerReceivedAt?: string | null;
  deliveredAt?: string | null;
  returnStatus?: string | null;
  returnRequestedAt?: string | null;
}

@Component({
  selector: 'app-profile-returns-refunds',
  standalone: true,
  imports: [CommonModule, ReturnRequestModalComponent],
  templateUrl: './profile-returns-refunds.html',
  styleUrl: './profile-returns-refunds.css',
})
export class ProfileReturnsRefundsComponent implements OnInit, OnDestroy {
  isLoading = false;
  loadError = '';
  eligibleOrders: ReturnOrder[] = [];
  submittedOrders: ReturnOrder[] = [];

  showReturnModal = false;
  selectedOrder: ReturnOrder | null = null;
  returningOrderId: string | null = null;

  private pendingOrderId: string | null = null;
  private allOrders: ReturnOrder[] = [];
  private destroy$ = new Subject<void>();
  private readonly returnRequestWindowMs = 3 * 24 * 60 * 60 * 1000;

  constructor(
    private buyOrderService: BuyOrderService,
    private authService: AuthService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.pendingOrderId = params.get('order');
      this.tryOpenPendingOrder();
    });
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.loadError = '';

    const currentUser = this.authService.currentUserValue as AuthUser | null;
    const userId = currentUser?.customerId || currentUser?.user_id || null;
    if (!userId) {
      this.allOrders = [];
      this.refreshGroups();
      this.isLoading = false;
      return;
    }

    this.buyOrderService
      .getUserBuyOrders(userId, 1, 80)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: BuyOrdersResponse) => {
          const items = response?.data?.items || [];
          this.allOrders = items.map((order: BuyOrderListItem) => ({
            id: order.order_id || order._id || '',
            orderCode: order.order_code || order.order_id || '',
            orderDate: order.created_at || order.createdAt || new Date().toISOString(),
            status: this.normalizeStatus(order.order_status),
            totalAmount: order.total_amount || 0,
            customerReceivedAt: order.customer_received_at || null,
            deliveredAt: order.delivered_at || null,
            returnStatus: order.return_request?.status || null,
            returnRequestedAt: order.return_request?.requested_at || null,
            items: (order.items || []).map((item: BuyOrderItemList) => ({
              id: item.order_item_id || item.product_id?.toString() || '',
              productName: item.name || 'Product',
              quantity: item.quantity || 1,
              price: item.price || 0,
            })),
          }));
          this.refreshGroups();
          this.tryOpenPendingOrder();
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Load returns and refunds failed:', error);
          this.loadError = 'Không thể tải trang Returns & Refunds. Vui lòng thử lại.';
          this.allOrders = [];
          this.refreshGroups();
          this.isLoading = false;
        },
      });
  }

  openReturnModal(order: ReturnOrder): void {
    const eligibility = this.getReturnEligibility(order);
    if (!eligibility.eligible) {
      if (eligibility.reason === 'expired') {
        this.toastService.warning('Đơn hàng đã quá hạn 3 ngày để yêu cầu hoàn trả.');
      } else if (eligibility.reason === 'already_requested') {
        this.toastService.info('Đơn hàng đã có yêu cầu hoàn trả.');
      } else {
        this.toastService.info('Chỉ có thể yêu cầu hoàn trả với đơn đã hoàn thành.');
      }
      return;
    }
    this.selectedOrder = order;
    this.showReturnModal = true;
  }

  closeReturnModal(): void {
    if (this.returningOrderId) return;
    this.showReturnModal = false;
    this.selectedOrder = null;
    this.clearPendingOrderQuery();
  }

  submitReturnRequest(payload: { reason: string; note?: string }): void {
    if (!this.selectedOrder || this.returningOrderId) return;
    const orderId = this.selectedOrder.id;
    this.returningOrderId = orderId;

    this.buyOrderService.requestReturn(orderId, payload).subscribe({
      next: (response: any) => {
        const status = response?.data?.return_request?.status || 'submitted';
        const requestedAt = response?.data?.return_request?.requested_at || new Date().toISOString();
        this.allOrders = this.allOrders.map((order) =>
          order.id === orderId ? { ...order, returnStatus: status, returnRequestedAt: requestedAt } : order,
        );
        this.refreshGroups();
        this.returningOrderId = null;
        this.showReturnModal = false;
        this.selectedOrder = null;
        this.clearPendingOrderQuery();
        this.toastService.success('Đã gửi yêu cầu hoàn trả.');
      },
      error: (error: HttpErrorResponse) => {
        const message = error?.error?.message || 'Không thể gửi yêu cầu hoàn trả. Vui lòng thử lại.';
        this.toastService.error(message);
        this.returningOrderId = null;
      },
    });
  }

  formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  }

  getReturnStatusLabel(status?: string | null): string {
    const key = String(status || '').trim().toLowerCase();
    const labelMap: Record<string, string> = {
      submitted: 'Đã gửi yêu cầu',
      need_more_info: 'Cần bổ sung',
      approved: 'Đã duyệt',
      awaiting_return_shipment: 'Chờ gửi hàng trả',
      return_in_transit: 'Đang vận chuyển trả',
      received_inspecting: 'Shop đang kiểm tra',
      refund_processing: 'Đang xử lý hoàn tiền',
      refunded: 'Đã hoàn tiền',
      closed: 'Đã đóng',
    };
    return labelMap[key] || 'Đang xử lý';
  }

  getReturnDaysLeft(order: ReturnOrder): number {
    const baseDate = this.resolveReturnWindowBaseDate(order);
    if (!baseDate) return 0;
    const diffMs = baseDate.getTime() + this.returnRequestWindowMs - Date.now();
    return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  }

  private refreshGroups(): void {
    this.eligibleOrders = this.allOrders.filter((order) => this.getReturnEligibility(order).eligible);
    this.submittedOrders = this.allOrders.filter((order) => Boolean(order.returnStatus));
  }

  private tryOpenPendingOrder(): void {
    if (!this.pendingOrderId || !this.allOrders.length) return;
    const targetOrder = this.allOrders.find((order) => order.id === this.pendingOrderId);
    if (!targetOrder) {
      this.clearPendingOrderQuery();
      return;
    }
    this.openReturnModal(targetOrder);
    if (!this.showReturnModal) {
      this.clearPendingOrderQuery();
    }
  }

  private clearPendingOrderQuery(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { order: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private getReturnEligibility(
    order: ReturnOrder,
  ): { eligible: boolean; reason?: 'status' | 'already_requested' | 'expired' | 'missing_date' } {
    if (order.status !== 'completed') {
      return { eligible: false, reason: 'status' };
    }

    if (order.returnStatus) {
      return { eligible: false, reason: 'already_requested' };
    }

    const baseDate = this.resolveReturnWindowBaseDate(order);
    if (!baseDate) {
      return { eligible: false, reason: 'missing_date' };
    }

    if (Date.now() > baseDate.getTime() + this.returnRequestWindowMs) {
      return { eligible: false, reason: 'expired' };
    }

    return { eligible: true };
  }

  private resolveReturnWindowBaseDate(order: ReturnOrder): Date | null {
    const raw = order.customerReceivedAt || order.deliveredAt || order.orderDate;
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private normalizeStatus(value?: string): OrderStatus {
    const valid: OrderStatus[] = [
      'pending',
      'confirmed',
      'processing',
      'shipping',
      'completed',
      'cancelled',
    ];
    if (value && valid.includes(value as OrderStatus)) {
      return value as OrderStatus;
    }
    return 'pending';
  }
}

type AuthUser = User & { user_id?: string };
type BuyOrderItemList = BuyOrderItem & { order_item_id?: string };
