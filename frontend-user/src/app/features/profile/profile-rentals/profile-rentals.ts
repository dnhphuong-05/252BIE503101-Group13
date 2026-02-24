import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import {
  RentOrderService,
  RentOrdersResponse,
  RentOrderListItem,
  RentStatus,
  RentOrderShipping,
} from '../../../services/rent-order.service';
import { AuthService, User } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

type RentalStatus = Exclude<RentStatus, 'returned'>;
type RentalTab = 'all' | RentalStatus;

interface RentalOrder {
  id: string;
  orderCode: string;
  productId?: string;
  productName: string;
  image: string;
  size?: string;
  color?: string;
  quantity: number;
  returnRequestedAt?: string | null;
  returnNote?: string | null;
  returnShipping?: {
    provider?: string | null;
    trackingCode?: string | null;
    shippedAt?: string | null;
  } | null;
  violationNote?: string | null;
  adminNote?: string | null;
  rentalPeriod: {
    start: string;
    end: string;
    days: number;
  };
  depositAmount: number;
  depositPaid: number;
  shippingFee: number;
  rentalFee: number;
  totalDue: number;
  refundExpected: number;
  status: RentalStatus;
  deliveryMethod: 'ship' | 'pickup';
  shipping?: {
    provider?: string | null;
    trackingCode?: string | null;
    status?: RentOrderShipping['shipping_status'];
  } | null;
  settlement?: {
    refundAmount?: number | null;
    penaltyTotal?: number | null;
    extraCharge?: number | null;
    lateFee?: number | null;
    damageFee?: number | null;
    penaltyFee?: number | null;
    cleaningFee?: number | null;
  } | null;
}

@Component({
  selector: 'app-profile-rentals',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile-rentals.html',
  styleUrl: './profile-rentals.css',
})
export class ProfileRentalsComponent implements OnInit, OnDestroy {
  rentalOrders: RentalOrder[] = [];
  filteredOrders: RentalOrder[] = [];
  activeTab: RentalTab = 'all';
  isLoading = false;
  loadError = '';
  private destroy$ = new Subject<void>();
  private placeholderImage = 'assets/images/placeholder.jpg';
  totalOrders = 0;
  ongoingCount = 0;
  waitingReturnCount = 0;
  holdingDeposit = 0;
  expectedRefund = 0;
  dueSoonCount = 0;
  requestingReturnId: string | null = null;
  confirmingReturnId: string | null = null;
  cancelingOrderId: string | null = null;
  tabs: Array<{ id: RentalTab; label: string; count: number }> = [
    { id: 'all', label: 'Tất cả', count: 0 },
    { id: 'booked', label: 'Đã đặt', count: 0 },
    { id: 'ongoing', label: 'Đang thuê', count: 0 },
    { id: 'return_requested', label: 'Yêu cầu trả', count: 0 },
    { id: 'returning', label: 'Đang trả', count: 0 },
    { id: 'returned_received', label: 'Shop đã nhận', count: 0 },
    { id: 'closed', label: 'Hoàn tất', count: 0 },
    { id: 'cancelled', label: 'Đã huỷ', count: 0 },
    { id: 'violated', label: 'Vi phạm', count: 0 },
  ];

  constructor(
    private rentOrderService: RentOrderService,
    private authService: AuthService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.loadRentalOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRentalOrders() {
    this.isLoading = true;
    this.loadError = '';

    const currentUser = this.authService.currentUserValue as AuthUser | null;
    const userId = currentUser?.customerId || currentUser?.user_id || null;

    if (!userId) {
      this.rentalOrders = [];
      this.filteredOrders = [];
      this.updateTabCounts();
      this.updateSummary();
      this.isLoading = false;
      return;
    }

    this.rentOrderService
      .getUserRentOrders(userId, 1, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: RentOrdersResponse) => {
          const items = response?.data?.items || [];
          this.rentalOrders = items.map((order: RentOrderListItem) => {
            const period = order.rental_period;
            const startDate = period?.start_date || '';
            const endDate = period?.end_date || '';
            const days = period?.days ?? this.getDaysBetween(startDate, endDate) ?? 0;
            const settlement = order.settlement ?? null;
            const shippingOut = order.shipping_out ?? order.shipping ?? null;
            const returnRequest = order.return_request ?? null;
            const returnShipping = order.shipping_back ?? null;
            const violationNote = order.item?.condition_in?.note || null;

            return {
              id: order.rent_order_id || order.rent_order_code || order._id || '',
              orderCode: order.rent_order_code || order.rent_order_id || '',
              productId: order.item?.product_id ? String(order.item.product_id) : undefined,
              productName: order.item?.name_snapshot || 'Sản phẩm thuê',
              image: order.item?.thumbnail_snapshot || this.placeholderImage,
              size: order.item?.size || '',
              color: order.item?.color || '',
              quantity: order.item?.quantity || 1,
              returnRequestedAt: returnRequest?.requested_at || null,
              returnNote: returnRequest?.note || null,
              returnShipping: returnShipping
                ? {
                    provider: returnShipping.provider ?? null,
                    trackingCode: returnShipping.tracking_code ?? null,
                    shippedAt: returnShipping.shipped_at ?? null,
                  }
                : null,
              violationNote,
              adminNote: order.admin_note ?? null,
              rentalPeriod: {
                start: startDate,
                end: endDate,
                days,
              },
              depositAmount: order.pricing?.deposit_required || 0,
              depositPaid: order.payment?.deposit_paid || 0,
              shippingFee: order.pricing?.shipping_fee || 0,
              rentalFee: order.pricing?.rent_fee_expected || 0,
              totalDue: order.pricing?.total_due_today || 0,
              refundExpected: order.pricing?.refund_expected || 0,
              status: this.normalizeStatus(order.rent_status),
              deliveryMethod: order.customer_info?.delivery_method || 'pickup',
              shipping: shippingOut
                ? {
                    provider:
                      (shippingOut as { provider?: string | null }).provider ??
                      (shippingOut as RentOrderShipping).shipping_provider ??
                      null,
                    trackingCode: (shippingOut as { tracking_code?: string | null }).tracking_code ?? null,
                    status: (shippingOut as RentOrderShipping).shipping_status ?? null,
                  }
                : null,
              settlement: settlement
                ? {
                    refundAmount: settlement.refund_amount ?? null,
                    penaltyTotal: settlement.penalty_total ?? null,
                    extraCharge: settlement.extra_charge ?? null,
                    lateFee: settlement.late_fee ?? null,
                    damageFee: settlement.damage_fee ?? null,
                    penaltyFee: settlement.penalty_fee ?? null,
                    cleaningFee: settlement.cleaning_fee ?? null,
                  }
                : null,
            };
          });

          this.updateTabCounts();
          this.updateSummary();
          this.applyFilter();
          this.isLoading = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Load rentals failed:', error);
          this.loadError = 'KhÃ´ng thá»ƒ táº£i Ä‘Æ¡n thuÃª. Vui lÃ²ng thá»­ láº¡i.';
          this.rentalOrders = [];
          this.filteredOrders = [];
          this.updateTabCounts();
          this.updateSummary();
          this.isLoading = false;
        },
      });
  }

  switchTab(tabId: RentalTab) {
    this.activeTab = tabId;
    this.applyFilter();
  }

  updateTabCounts() {
    this.tabs.forEach((tab) => {
      if (tab.id === 'all') {
        tab.count = this.rentalOrders.length;
      } else if (tab.id === 'violated') {
        tab.count = this.rentalOrders.filter((order) => this.hasViolation(order)).length;
      } else if (tab.id === 'return_requested') {
        tab.count = this.rentalOrders.filter((order) => this.isReturnRequestedTab(order)).length;
      } else if (tab.id === 'ongoing') {
        tab.count = this.rentalOrders.filter((order) => this.isPureOngoing(order)).length;
      } else {
        tab.count = this.rentalOrders.filter((order) => order.status === tab.id).length;
      }
    });
  }

  updateSummary() {
    this.totalOrders = this.rentalOrders.length;
    this.ongoingCount = this.rentalOrders.filter((order) => order.status === 'ongoing').length;
    this.waitingReturnCount = this.rentalOrders.filter(
      (order) =>
        ['return_requested', 'returning'].includes(order.status) ||
        (order.status === 'ongoing' && !!order.returnRequestedAt),
    ).length;
    this.holdingDeposit = this.rentalOrders
      .filter((order) => !['closed', 'cancelled'].includes(order.status))
      .reduce((sum, order) => sum + (order.depositAmount || 0), 0);
    this.expectedRefund = this.rentalOrders.reduce(
      (sum, order) => sum + this.getRefundAmount(order),
      0,
    );
    this.dueSoonCount = this.rentalOrders.filter(
      (order) => order.status === 'ongoing' && this.isDueSoon(order),
    ).length;
  }

  applyFilter() {
    if (this.activeTab === 'all') {
      this.filteredOrders = [...this.rentalOrders];
    } else if (this.activeTab === 'violated') {
      this.filteredOrders = this.rentalOrders.filter((order) => this.hasViolation(order));
    } else if (this.activeTab === 'return_requested') {
      this.filteredOrders = this.rentalOrders.filter((order) => this.isReturnRequestedTab(order));
    } else if (this.activeTab === 'ongoing') {
      this.filteredOrders = this.rentalOrders.filter((order) => this.isPureOngoing(order));
    } else {
      this.filteredOrders = this.rentalOrders.filter((order) => order.status === this.activeTab);
    }
  }

  getFilteredOrders(): RentalOrder[] {
    return this.filteredOrders;
  }

  getStatusLabel(status: RentalStatus): string {
    const labels: Record<RentalStatus, string> = {
      booked: 'Đã đặt',
      ongoing: 'Đang thuê',
      return_requested: 'Yêu cầu trả',
      returning: 'Đang trả',
      returned_received: 'Shop đã nhận',
      closed: 'Hoàn tất',
      cancelled: 'Đã huỷ',
      violated: 'Vi phạm',
    };
    return labels[status] || status;
  }

  getStatusBadgeClass(status: RentalStatus): string {
    return `status-badge ${status}`;
  }

  formatDate(date: string): string {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '--';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsed);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  getCountdownLabel(order: RentalOrder): string | null {
    if (order.status !== 'ongoing') return null;
    const days = this.getDaysUntilReturn(order);
    if (days === null) return null;
    if (days < 0) return `Trễ hạn ${Math.abs(days)} ngày`;
    if (days === 0) return 'Hôm nay là ngày trả';
    return `Còn ${days} ngày để trả`;
  }

  isOverdue(order: RentalOrder): boolean {
    const days = this.getDaysUntilReturn(order);
    return typeof days === 'number' && days < 0;
  }

  isDueSoon(order: RentalOrder): boolean {
    const days = this.getDaysUntilReturn(order);
    return typeof days === 'number' && days >= 0 && days <= 1;
  }

  getRefundAmount(order: RentalOrder): number {
    if (order.settlement?.refundAmount !== null && order.settlement?.refundAmount !== undefined) {
      return order.settlement.refundAmount;
    }
    const deposit =
      order.depositAmount !== null && order.depositAmount !== undefined
        ? order.depositAmount
        : order.depositPaid || 0;
    const rentFee = order.rentalFee || 0;
    const penalty = this.getPenaltyTotal(order);
    return Math.max(0, deposit - rentFee - penalty);
  }

  getInitialPayment(order: RentalOrder): number {
    if (typeof order.totalDue === 'number' && order.totalDue > 0) {
      return order.totalDue;
    }
    const deposit = order.depositPaid || order.depositAmount || 0;
    const shipping = order.shippingFee || 0;
    return deposit + shipping;
  }

  getPenaltyTotal(order: RentalOrder): number {
    const settlement = order.settlement;
    if (!settlement) return 0;
    if (settlement.penaltyTotal !== null && settlement.penaltyTotal !== undefined) {
      return settlement.penaltyTotal;
    }
    const extra = settlement.extraCharge ?? 0;
    const late = settlement.lateFee ?? 0;
    const damage = settlement.damageFee ?? 0;
    const cleaning = settlement.cleaningFee ?? 0;
    const penaltyFee = settlement.penaltyFee ?? 0;
    return extra + late + damage + cleaning + penaltyFee;
  }

  hasViolation(order: RentalOrder): boolean {
    if (order.status === 'violated') return true;
    if (this.getPenaltyTotal(order) > 0) return true;
    return !!order.violationNote?.trim();
  }

  private isReturnRequestedTab(order: RentalOrder): boolean {
    return order.status === 'return_requested' || (order.status === 'ongoing' && !!order.returnRequestedAt);
  }

  private isPureOngoing(order: RentalOrder): boolean {
    return order.status === 'ongoing' && !order.returnRequestedAt;
  }

  getPenaltyBreakdown(order: RentalOrder): string {
    const settlement = order.settlement;
    if (!settlement) return '';
    const parts: string[] = [];
    if (settlement.lateFee) {
      parts.push(`Phí trễ ${this.formatCurrency(settlement.lateFee)}`);
    }
    if (settlement.damageFee) {
      parts.push(`Phí hư hỏng ${this.formatCurrency(settlement.damageFee)}`);
    }
    if (settlement.penaltyFee) {
      parts.push(`Phạt vi phạm ${this.formatCurrency(settlement.penaltyFee)}`);
    }
    if (settlement.cleaningFee) {
      parts.push(`Phí vệ sinh ${this.formatCurrency(settlement.cleaningFee)}`);
    }
    if (settlement.extraCharge) {
      parts.push(`Phí khác ${this.formatCurrency(settlement.extraCharge)}`);
    }
    return parts.join(', ');
  }

  getViolationDisplay(order: RentalOrder): string {
    const breakdown = this.getPenaltyBreakdown(order);
    const reason = order.violationNote || '';
    if (breakdown && reason) {
      return `${breakdown} · ${reason}`;
    }
    if (breakdown) return breakdown;
    if (reason) return reason;
    return 'Chưa cập nhật';
  }

  canRequestReturn(order: RentalOrder): boolean {
    return order.status === 'ongoing' && !order.returnRequestedAt;
  }

  canConfirmReturn(order: RentalOrder): boolean {
    return order.status === 'return_requested' && !!order.returnShipping?.trackingCode;
  }

  requestReturn(order: RentalOrder) {
    if (!this.canRequestReturn(order) || this.requestingReturnId) return;
    if (!confirm('Bạn muốn gửi yêu cầu trả hàng cho đơn này?')) return;

    this.requestingReturnId = order.id;
    this.rentOrderService.requestReturn(order.id).subscribe({
      next: () => {
        const requestedAt = new Date().toISOString();
        this.rentalOrders = this.rentalOrders.map((item) =>
          item.id === order.id ? { ...item, returnRequestedAt: requestedAt } : item,
        );
        this.applyFilter();
        this.updateSummary();
        this.updateTabCounts();
        this.toastService.success('Đã gửi yêu cầu trả hàng.');
        this.requestingReturnId = null;
      },
      error: (error: HttpErrorResponse) => {
        const message = error?.error?.message || 'Không thể gửi yêu cầu trả hàng.';
        this.toastService.error(message);
        this.requestingReturnId = null;
      },
    });
  }

  confirmReturnShipment(order: RentalOrder) {
    if (!this.canConfirmReturn(order) || this.confirmingReturnId) return;
    if (!confirm('Xác nhận bạn đã gửi hàng trả?')) return;

    this.confirmingReturnId = order.id;
    this.rentOrderService.confirmReturnShipment(order.id).subscribe({
      next: () => {
        this.rentalOrders = this.rentalOrders.map((item) =>
          item.id === order.id ? { ...item, status: 'returning' } : item,
        );
        this.applyFilter();
        this.updateSummary();
        this.updateTabCounts();
        this.toastService.success('Đã xác nhận gửi hàng trả.');
        this.confirmingReturnId = null;
      },
      error: (error: HttpErrorResponse) => {
        const message = error?.error?.message || 'Không thể xác nhận gửi hàng.';
        this.toastService.error(message);
        this.confirmingReturnId = null;
      },
    });
  }

  trackReturn(order: RentalOrder) {
    console.log('Track return:', order.id, order.returnShipping?.trackingCode);
    // TODO: Implement tracking link
  }

  trackDelivery(order: RentalOrder) {
    console.log('Track delivery:', order.id, order.shipping?.trackingCode);
    // TODO: Implement tracking link
  }

  rentAgain(order: RentalOrder) {
    console.log('Rent again:', order.productId);
  }

  cancelRental(order: RentalOrder) {
    if (order.status !== 'booked' || this.cancelingOrderId) return;
    if (!confirm('Bạn có chắc chắn muốn hủy đơn thuê này?')) return;

    this.cancelingOrderId = order.id;
    this.rentOrderService.cancelRentOrder(order.id).subscribe({
      next: () => {
        this.rentalOrders = this.rentalOrders.map((item) =>
          item.id === order.id ? { ...item, status: 'cancelled' } : item,
        );
        this.applyFilter();
        this.updateSummary();
        this.updateTabCounts();
        this.toastService.success('Đã hủy đơn thuê.');
        this.cancelingOrderId = null;
      },
      error: (error: HttpErrorResponse) => {
        const message = error?.error?.message || 'Không thể hủy đơn thuê.';
        this.toastService.error(message);
        this.cancelingOrderId = null;
      },
    });
  }

  private normalizeStatus(value?: string): RentalStatus {
    const normalized = value === 'returned' ? 'returned_received' : value;
    const valid: Array<RentalStatus> = [
      'booked',
      'ongoing',
      'return_requested',
      'returning',
      'returned_received',
      'closed',
      'cancelled',
      'violated',
    ];
    if (normalized && valid.includes(normalized as RentalStatus)) {
      return normalized as RentalStatus;
    }
    return 'booked';
  }

  private getDaysBetween(start?: string, end?: string): number | null {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    return Math.round((endDay.getTime() - startDay.getTime()) / 86400000);
  }

  private getDaysUntilReturn(order: RentalOrder): number | null {
    if (!order.rentalPeriod?.end) return null;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endDate = new Date(order.rentalPeriod.end);
    if (Number.isNaN(endDate.getTime())) return null;
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    return Math.round((endDay.getTime() - todayStart.getTime()) / 86400000);
  }
}

type AuthUser = User & { user_id?: string };

