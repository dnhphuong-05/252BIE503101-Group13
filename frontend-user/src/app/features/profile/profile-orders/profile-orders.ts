import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import {
  BuyOrderService,
  BuyOrdersResponse,
  BuyOrderItem,
  BuyOrderListItem,
} from '../../../services/buy-order.service';
import { AuthService, User } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { CancelOrderModalComponent } from '../../../shared/components/cancel-order-modal/cancel-order-modal';
import { ReturnRequestModalComponent } from '../../../shared/components/return-request-modal/return-request-modal';

interface Order {
  id: string;
  orderCode: string;
  orderDate: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  customerReceivedAt?: string | null;
  returnStatus?: string | null;
}

interface OrderItem {
  id: string;
  productName: string;
  productImage: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
}

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipping' | 'completed' | 'cancelled';
type OrdersTab = 'all' | OrderStatus;

@Component({
  selector: 'app-profile-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, CancelOrderModalComponent, ReturnRequestModalComponent],
  templateUrl: './profile-orders.html',
  styleUrl: './profile-orders.css',
})
export class ProfileOrdersComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  selectedTab: OrdersTab = 'all';
  isLoading = false;
  loadError = '';
  private destroy$ = new Subject<void>();
  private placeholderImage = 'assets/images/placeholder.jpg';
  totalSpent = 0;
  activeOrders = 0;
  showCancelModal = false;
  cancelingOrder: Order | null = null;
  isCanceling = false;
  showReturnModal = false;
  returningOrder: Order | null = null;
  confirmingOrderId: string | null = null;
  returningOrderId: string | null = null;

  tabs: Array<{ id: OrdersTab; label: string; count: number }> = [
    { id: 'all', label: 'Tất cả', count: 0 },
    { id: 'pending', label: 'Chờ xác nhận', count: 0 },
    { id: 'confirmed', label: 'Đã xác nhận', count: 0 },
    { id: 'processing', label: 'Đang xử lý', count: 0 },
    { id: 'shipping', label: 'Đang giao', count: 0 },
    { id: 'completed', label: 'Hoàn thành', count: 0 },
    { id: 'cancelled', label: 'Đã hủy', count: 0 },
  ];

  constructor(
    private buyOrderService: BuyOrderService,
    private authService: AuthService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrders() {
    this.isLoading = true;
    this.loadError = '';

    const currentUser = this.authService.currentUserValue as AuthUser | null;
    const userId = currentUser?.customerId || currentUser?.user_id || null;

    if (!userId) {
      this.orders = [];
      this.filteredOrders = [];
      this.updateTabCounts();
      this.updateSummary();
      this.isLoading = false;
      return;
    }

    this.buyOrderService
      .getUserBuyOrders(userId, 1, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: BuyOrdersResponse) => {
          const items = response?.data?.items || [];
          this.orders = items.map((order: BuyOrderListItem) => ({
            id: order.order_id || order._id || '',
            orderCode: order.order_code || order.order_id || '',
            orderDate: order.created_at || order.createdAt || new Date().toISOString(),
            status: this.normalizeStatus(order.order_status),
            totalAmount: order.total_amount || 0,
            customerReceivedAt: order.customer_received_at || null,
            returnStatus: order.return_request?.status || null,
            items: (order.items || []).map((item: BuyOrderItemList) => ({
              id: item.order_item_id || item.product_id?.toString() || '',
              productName: item.name || 'Sản phẩm',
              productImage: item.thumbnail || this.placeholderImage,
              size: item.size || '',
              color: item.color || '',
              quantity: item.quantity || 1,
              price: item.price || 0,
            })),
          }));

          this.updateTabCounts();
          this.updateSummary();
          this.filterOrders();
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Load orders failed:', error);
          this.loadError = 'Không thể tải đơn hàng. Vui lòng thử lại.';
          this.orders = [];
          this.filteredOrders = [];
          this.updateTabCounts();
          this.updateSummary();
          this.isLoading = false;
        },
      });
  }

  updateTabCounts() {
    this.tabs[0].count = this.orders.length;
    this.tabs[1].count = this.orders.filter((o) => o.status === 'pending').length;
    this.tabs[2].count = this.orders.filter((o) => o.status === 'confirmed').length;
    this.tabs[3].count = this.orders.filter((o) => o.status === 'processing').length;
    this.tabs[4].count = this.orders.filter((o) => o.status === 'shipping').length;
    this.tabs[5].count = this.orders.filter((o) => o.status === 'completed').length;
    this.tabs[6].count = this.orders.filter((o) => o.status === 'cancelled').length;
  }

  updateSummary() {
    this.totalSpent = this.orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    this.activeOrders = this.orders.filter(
      (order) => !['completed', 'cancelled'].includes(order.status),
    ).length;
  }

  selectTab(tabId: OrdersTab) {
    this.selectedTab = tabId;
    this.filterOrders();
  }

  filterOrders() {
    if (this.selectedTab === 'all') {
      this.filteredOrders = [...this.orders];
    } else {
      this.filteredOrders = this.orders.filter((order) => order.status === this.selectedTab);
    }
  }

  getStatusLabel(status: OrdersTab): string {
    if (status === 'all') return 'tất cả';
    const labels: Record<OrderStatus, string> = {
      pending: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      processing: 'Đang xử lý',
      shipping: 'Đang giao hàng',
      completed: 'Đã hoàn thành',
      cancelled: 'Đã hủy',
    };
    return labels[status] || status;
  }

  getStatusColor(status: OrderStatus): string {
    const colors: Record<OrderStatus, string> = {
      pending: '#FF9800',
      confirmed: '#3B82F6',
      processing: '#2196F3',
      shipping: '#9C27B0',
      completed: '#4CAF50',
      cancelled: '#F44336',
    };
    return colors[status] || '#999';
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  }

  openCancelModal(order: Order) {
    if (order.status !== 'pending') return;
    this.cancelingOrder = order;
    this.showCancelModal = true;
  }

  closeCancelModal() {
    this.showCancelModal = false;
    this.cancelingOrder = null;
  }

  confirmCancelOrder(reason: string) {
    if (!this.cancelingOrder) return;
    this.isCanceling = true;
    const orderId = this.cancelingOrder.id;

    this.buyOrderService
      .cancelOrder(orderId, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.orders = this.orders.map((order) =>
            order.id === orderId ? { ...order, status: 'cancelled' } : order,
          );
          this.updateTabCounts();
          this.updateSummary();
          this.filterOrders();
          this.isCanceling = false;
          this.closeCancelModal();
          this.toastService.success('Đã huỷ đơn hàng.');
        },
        error: (error: HttpErrorResponse) => {
          console.error('Cancel order failed:', error);
          this.isCanceling = false;
          this.toastService.error('Không thể huỷ đơn hàng. Vui lòng thử lại.');
        },
      });
  }

  canConfirmReceived(order: Order): boolean {
    return order.status === 'shipping' && !order.customerReceivedAt && !order.returnStatus;
  }

  canRequestReturn(order: Order): boolean {
    return order.status === 'shipping' && !order.returnStatus && !order.customerReceivedAt;
  }

  confirmReceived(order: Order) {
    if (!this.canConfirmReceived(order) || this.confirmingOrderId) return;
    if (!confirm('Xác nhận bạn đã nhận được hàng?')) return;
    this.confirmingOrderId = order.id;
    this.buyOrderService.confirmReceived(order.id).subscribe({
      next: () => {
        this.orders = this.orders.map((item) =>
          item.id === order.id ? { ...item, customerReceivedAt: new Date().toISOString() } : item,
        );
        this.filteredOrders = this.filteredOrders.map((item) =>
          item.id === order.id ? { ...item, customerReceivedAt: new Date().toISOString() } : item,
        );
        this.toastService.success('Đã xác nhận nhận hàng. Chờ admin hoàn tất.');
        this.confirmingOrderId = null;
      },
      error: (error: HttpErrorResponse) => {
        const message =
          error?.error?.message || 'Không thể xác nhận nhận hàng. Vui lòng thử lại.';
        this.toastService.error(message);
        this.confirmingOrderId = null;
      },
    });
  }

  openReturnModal(order: Order) {
    if (!this.canRequestReturn(order) || this.returningOrderId) return;
    this.returningOrder = order;
    this.showReturnModal = true;
  }

  closeReturnModal() {
    if (this.returningOrderId) return;
    this.showReturnModal = false;
    this.returningOrder = null;
  }

  submitReturnRequest(payload: { reason: string; note?: string }) {
    if (!this.returningOrder || this.returningOrderId) return;
    const orderId = this.returningOrder.id;
    this.returningOrderId = orderId;
    this.buyOrderService.requestReturn(orderId, payload).subscribe({
      next: (response: any) => {
        const status = response?.data?.return_request?.status || 'submitted';
        this.orders = this.orders.map((item) =>
          item.id === orderId ? { ...item, returnStatus: status } : item,
        );
        this.filteredOrders = this.filteredOrders.map((item) =>
          item.id === orderId ? { ...item, returnStatus: status } : item,
        );
        this.toastService.success('Đã gửi yêu cầu hoàn trả.');
        this.returningOrderId = null;
        this.showReturnModal = false;
        this.returningOrder = null;
      },
      error: (error: HttpErrorResponse) => {
        const message =
          error?.error?.message || 'Không thể gửi yêu cầu hoàn trả. Vui lòng thử lại.';
        this.toastService.error(message);
        this.returningOrderId = null;
      },
    });
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
