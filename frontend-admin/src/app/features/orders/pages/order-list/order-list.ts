import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse, BackendListResponse } from '../../../../models';
import { NotificationService } from '../../../../core/services/notification.service';
import { environment } from '../../../../../environments/environment';

type OrderView = 'sales' | 'rent' | 'returns';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipping' | 'completed' | 'cancelled';
type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'failed' | 'refunded';
type ContactChannel = 'zalo' | 'phone' | 'web';
type RentStatus =
  | 'booked'
  | 'ongoing'
  | 'return_requested'
  | 'returning'
  | 'returned'
  | 'closed'
  | 'cancelled'
  | 'violated';
type ReturnStatus =
  | 'submitted'
  | 'need_more_info'
  | 'approved'
  | 'awaiting_return_shipment'
  | 'return_in_transit'
  | 'received_inspecting'
  | 'refund_processing'
  | 'refunded'
  | 'closed';

interface SalesOrder {
  id: string;
  code: string;
  customer: string;
  phone: string;
  total: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  shipping: string;
  createdAt: string;
  updatedAt: string;
  guestId?: string | null;
  userId?: string | null;
  isGuest: boolean;
  contactChannel?: ContactChannel | null;
  contactedAt?: string | null;
}

interface RentOrder {
  id: string;
  code: string;
  customer: string;
  phone: string;
  period: string;
  days: number;
  rentStatus: RentStatus;
  paymentStatus: PaymentStatus;
  depositPaid: string;
  rentFee: string;
  refundExpected: string;
  returnRequested: boolean;
  returnRequestedAt?: string;
  tracking?: string;
  createdAt: string;
  guestId?: string | null;
  userId?: string | null;
  isGuest: boolean;
  contactChannel?: ContactChannel | null;
  contactedAt?: string | null;
  confirmedAt?: string | null;
}

interface ReturnRequestRow {
  id: string;
  code: string;
  orderCode: string;
  status: ReturnStatus;
  amount: string;
  requestedAt: string;
}

interface BuyOrderApi {
  order_id: string;
  order_code: string;
  user_id?: string | null;
  guest_id?: string | null;
  customer_info: { full_name: string; phone: string; email?: string; address?: OrderAddress };
  total_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  shipping_provider?: string | null;
  tracking_code?: string | null;
  contact_channel?: ContactChannel | null;
  contacted_at?: string | null;
  contacted_by?: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderAddress {
  detail?: string;
  address_detail?: string;
  ward?: string;
  district?: string;
  province?: string;
}

interface StatusHistory {
  from?: string;
  to?: string;
  changed_by?: string | null;
  note?: string;
  changed_at?: string;
}

interface BuyOrderDetailApi extends BuyOrderApi {
  items?: Array<{
    product_id: number | string;
    sku: string;
    name: string;
    thumbnail?: string;
    size?: string | null;
    color?: string | null;
    price: number;
    quantity: number;
    total_price?: number;
  }>;
  detailedItems?: Array<{
    product_id: number | string;
    sku: string;
    name: string;
    thumbnail?: string;
    size?: string | null;
    color?: string | null;
    price: number;
    quantity: number;
    total_price?: number;
  }>;
  payment_method?: string;
  paid_at?: string | null;
  admin_note?: string;
  cancel_reason?: string;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  processing_at?: string | null;
  processing_by?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  customer_received_at?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  refund_status?: string | null;
  shipping_status_detail?: string | null;
  return_request?: {
    return_id?: string | null;
    status?: ReturnStatus | null;
    requested_at?: string | null;
    note?: string | null;
  };
  status_history?: StatusHistory[];
}

interface RentOrderApi {
  rent_order_id: string;
  rent_order_code: string;
  user_id?: string | null;
  guest_id?: string | null;
  customer_info: { full_name: string; phone: string; email?: string; address?: OrderAddress };
  rental_period: { start_date: string; end_date: string; days: number };
  pricing: {
    deposit_required: number;
    rent_fee_expected?: number;
    refund_expected?: number;
    late_fee?: number;
    damage_fee?: number;
  };
  payment: { payment_status: PaymentStatus; deposit_paid: number };
  rent_status: RentStatus;
  contact_channel?: ContactChannel | null;
  contacted_at?: string | null;
  contacted_by?: string | null;
  confirmed_at?: string | null;
  confirmed_by?: string | null;
  shipping?: { shipping_provider?: string | null; tracking_code?: string | null } | null;
  shipping_out?: { provider?: string | null; tracking_code?: string | null } | null;
  return_request?: { requested_at?: string | null; note?: string };
  settlement?: {
    refund_expected?: number | null;
    refund_paid?: number | null;
    refund_receipt_url?: string | null;
    refund_note?: string | null;
    late_fee?: number | null;
    damage_fee?: number | null;
    penalty_fee?: number | null;
    cleaning_fee?: number | null;
    extra_charge?: number | null;
  };
  created_at: string;
}

interface RentOrderDetailApi extends RentOrderApi {
  item: {
    product_id: string | number;
    sku: string;
    name_snapshot: string;
    thumbnail_snapshot?: string;
    rent_price_per_day: number;
    deposit_amount: number;
    quantity: number;
    condition_out?: { photos?: string[]; note?: string };
    condition_in?: { photos?: string[]; note?: string };
  };
  payment: { payment_status: PaymentStatus; deposit_paid: number; paid_at?: string | null };
  pricing: {
    deposit_required: number;
    rent_fee_expected: number;
    total_due_today: number;
    refund_expected?: number;
    late_fee?: number;
    damage_fee?: number;
  };
  settlement?: {
    refund_expected?: number | null;
    refund_paid?: number | null;
    refunded_at?: string | null;
    refund_receipt_url?: string | null;
    refund_note?: string | null;
    penalty_fee?: number | null;
    late_fee?: number | null;
    damage_fee?: number | null;
    cleaning_fee?: number | null;
    extra_charge?: number | null;
  };
  admin_note?: string;
  cancel_reason?: string;
  shipping_out?: {
    provider?: string | null;
    tracking_code?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
  } | null;
  shipping_back?: {
    provider?: string | null;
    tracking_code?: string | null;
    created_by_shop?: boolean | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
  } | null;
  return_request?: { requested_at?: string | null; note?: string };
  status_history?: StatusHistory[];
}

interface ReturnRequestApi {
  return_id: string;
  order_id: string;
  order_code: string;
  user_id: string;
  status: ReturnStatus;
  reason?: string;
  customer_note?: string;
  admin_note?: string;
  closed_reason?: string;
  total_amount?: number;
  customer_info?: { full_name?: string; phone?: string; email?: string; address?: OrderAddress };
  items?: Array<{
    product_id: number | string;
    sku: string;
    name: string;
    thumbnail?: string;
    size?: string;
    color?: string;
    price: number;
    quantity: number;
    total_price?: number;
  }>;
  return_shipping?: {
    provider?: string | null;
    tracking_code?: string | null;
    label_code?: string | null;
    created_at?: string | null;
    received_label_at?: string | null;
    shipped_at?: string | null;
    received_at?: string | null;
  } | null;
  refund?: {
    requested_amount?: number;
    approved_amount?: number;
    adjusted_amount?: number;
    method?: string | null;
    note?: string;
    processed_at?: string | null;
    receipt_url?: string;
  } | null;
  status_history?: StatusHistory[];
  requested_at?: string;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-list.html',
  styleUrl: './order-list.css',
})
export class OrderListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = environment.apiUrl;

  protected readonly view = signal<OrderView>('sales');
  protected readonly selectedId = signal<string | null>(null);
  protected salesOrders: SalesOrder[] = [];
  protected rentOrders: RentOrder[] = [];
  protected returnOrders: ReturnRequestRow[] = [];
  private salesOrdersRaw: SalesOrder[] = [];
  private rentOrdersRaw: RentOrder[] = [];
  private returnOrdersRaw: ReturnRequestRow[] = [];
  protected isLoading = false;
  protected loadError = '';
  protected salesTotal = 0;
  protected rentTotal = 0;
  protected returnTotal = 0;
  protected selectedSalesDetail: BuyOrderDetailApi | null = null;
  protected selectedRentDetail: RentOrderDetailApi | null = null;
  protected selectedReturnDetail: ReturnRequestApi | null = null;
  protected detailLoading = false;
  protected rentDetailLoading = false;
  protected returnDetailLoading = false;
  protected detailError = '';
  protected rentDetailError = '';
  protected returnDetailError = '';
  protected actionLoading = false;
  protected rentActionLoading = false;
  protected returnActionLoading = false;
  protected adminNoteDraft = '';
  protected cancelReasonDraft = '';
  protected shippingProviderDraft = '';
  protected trackingCodeDraft = '';
  protected shippingStatusDraft = '';
  protected paymentStatusDraft: PaymentStatus = 'unpaid';
  protected salesContactChannelDraft: ContactChannel | '' = '';
  protected rentAdminNoteDraft = '';
  protected rentCancelReasonDraft = '';
  protected rentDepositPaidDraft = '';
  protected rentPaymentStatusDraft: PaymentStatus = 'unpaid';
  protected rentReturnNoteDraft = '';
  protected rentContactChannelDraft: ContactChannel | '' = '';
  protected shippingOutProviderDraft = '';
  protected shippingOutTrackingDraft = '';
  protected shippingBackProviderDraft = '';
  protected shippingBackTrackingDraft = '';
  protected conditionOutNoteDraft = '';
  protected conditionInNoteDraft = '';
  protected rentLateFeeDraft = '';
  protected rentDamageFeeDraft = '';
  protected rentPenaltyFeeDraft = '';
  protected rentCleaningFeeDraft = '';
  protected rentExtraChargeDraft = '';
  protected rentRefundExpectedDraft = '';
  protected rentRefundPaidDraft = '';
  protected rentRefundReceiptUrlDraft = '';
  protected rentRefundNoteDraft = '';
  private shouldShowSalesNoteToast = false;
  private salesToastOverride = '';
  protected returnNoteDraft = '';
  protected returnRefundAmountDraft = '';
  protected returnRefundNoteDraft = '';
  protected returnShippingProviderDraft = '';
  protected returnShippingTrackingDraft = '';
  protected returnReceiptUrlDraft = '';
  protected searchTerm = '';
  protected salesStatusFilter: OrderStatus | 'all' = 'all';
  protected salesPaymentFilter: PaymentStatus | 'all' = 'all';
  protected salesShippingFilter: 'all' | string = 'all';
  protected salesCustomerFilter: 'all' | 'user' | 'guest' = 'all';
  protected rentStatusFilter: RentStatus | 'all' = 'all';
  protected rentPaymentFilter: PaymentStatus | 'all' = 'all';
  protected rentReturnFilter: 'all' | 'requested' | 'none' = 'all';
  protected rentCustomerFilter: 'all' | 'user' | 'guest' = 'all';
  protected returnStatusFilter: ReturnStatus | 'all' = 'all';

  protected readonly orderStatusMeta: Record<OrderStatus, { label: string; class: string }> = {
    pending: { label: 'Chờ xác nhận', class: 'badge badge-warning' },
    confirmed: { label: 'Đã xác nhận', class: 'badge badge-info' },
    processing: { label: 'Đang xử lý', class: 'badge badge-info' },
    shipping: { label: 'Đang giao', class: 'badge badge-info' },
    completed: { label: 'Hoàn thành', class: 'badge badge-success' },
    cancelled: { label: 'Đã hủy', class: 'badge badge-neutral' },
  };

  protected readonly paymentMeta: Record<PaymentStatus, { label: string; class: string }> = {
    unpaid: { label: 'Chưa thanh toán', class: 'badge badge-error' },
    partial: { label: 'Thanh toán một phần', class: 'badge badge-warning' },
    paid: { label: 'Đã thanh toán', class: 'badge badge-success' },
    failed: { label: 'Thất bại', class: 'badge badge-neutral' },
    refunded: { label: 'Hoàn tiền', class: 'badge badge-neutral' },
  };

  protected readonly paymentStatusOptions: Array<{ value: PaymentStatus; label: string }> = [
    { value: 'unpaid', label: 'Chưa thanh toán' },
    { value: 'partial', label: 'Thanh toán một phần' },
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'failed', label: 'Thất bại' },
    { value: 'refunded', label: 'Hoàn tiền' },
  ];
  protected readonly rentPaymentStatusOptions: Array<{ value: PaymentStatus; label: string }> = [
    { value: 'unpaid', label: 'Chưa thanh toán' },
    { value: 'partial', label: 'Thanh toán một phần' },
    { value: 'paid', label: 'Đã thanh toán' },
  ];
  protected readonly contactChannelOptions: Array<{ value: ContactChannel; label: string }> = [
    { value: 'zalo', label: 'Zalo' },
    { value: 'phone', label: 'Phone' },
    { value: 'web', label: 'Web' },
  ];

  private readonly salesTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled', 'pending'],
    processing: ['shipping', 'cancelled'],
    shipping: ['completed', 'cancelled', 'processing'],
    completed: [],
    cancelled: [],
  };

  protected readonly rentStatusMeta: Record<RentStatus, { label: string; class: string }> = {
    booked: { label: 'Đã đặt', class: 'badge badge-warning' },
    ongoing: { label: 'Đang thuê', class: 'badge badge-info' },
    return_requested: { label: 'Yêu cầu trả', class: 'badge badge-warning' },
    returning: { label: 'Đang trả', class: 'badge badge-info' },
    returned: { label: 'Shop đã nhận', class: 'badge badge-info' },
    closed: { label: 'Hoàn tất', class: 'badge badge-neutral' },
    cancelled: { label: 'Đã hủy', class: 'badge badge-neutral' },
    violated: { label: 'Vi phạm', class: 'badge badge-error' },
  };

  protected readonly returnStatusMeta: Record<ReturnStatus, { label: string; class: string }> = {
    submitted: { label: 'Đã gửi', class: 'badge badge-warning' },
    need_more_info: { label: 'Cần bổ sung', class: 'badge badge-warning' },
    approved: { label: 'Đã duyệt', class: 'badge badge-info' },
    awaiting_return_shipment: { label: 'Chờ gửi hàng', class: 'badge badge-info' },
    return_in_transit: { label: 'Đang hoàn trả', class: 'badge badge-info' },
    received_inspecting: { label: 'Đang kiểm tra', class: 'badge badge-warning' },
    refund_processing: { label: 'Đang hoàn tiền', class: 'badge badge-info' },
    refunded: { label: 'Đã hoàn tiền', class: 'badge badge-success' },
    closed: { label: 'Đã đóng', class: 'badge badge-neutral' },
  };

  protected readonly selectedSalesOrder = computed(() => {
    if (this.view() !== 'sales') return null;
    const id = this.selectedId();
    if (!id) return null;
    return this.salesOrders.find((order) => order.id === id) || null;
  });

  protected readonly selectedRentOrder = computed(() => {
    if (this.view() !== 'rent') return null;
    const id = this.selectedId();
    if (!id) return null;
    return this.rentOrders.find((order) => order.id === id) || null;
  });

  protected readonly selectedReturnOrder = computed(() => {
    if (this.view() !== 'returns') return null;
    const id = this.selectedId();
    if (!id) return null;
    return this.returnOrders.find((order) => order.id === id) || null;
  });

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      const view = (data['view'] as OrderView) ?? 'sales';
      this.view.set(view);
      if (view === 'returns') {
        this.selectedId.set(null);
        this.selectedSalesDetail = null;
        this.selectedRentDetail = null;
        this.selectedReturnDetail = null;
        this.loadReturnRequests();
        return;
      }

      if (view === 'rent') {
        this.selectedSalesDetail = null;
        this.selectedRentDetail = null;
        this.selectedReturnDetail = null;
        this.loadRentOrders();
      } else {
        this.loadSalesOrders();
      }
    });
  }

  protected selectOrder(id: string): void {
    this.selectedId.set(id);
    if (this.view() === 'sales') {
      this.fetchSalesDetail(id);
    } else if (this.view() === 'rent') {
      this.fetchRentDetail(id);
    } else if (this.view() === 'returns') {
      this.fetchReturnDetail(id);
    }
  }

  protected onViewSales(order: SalesOrder, event?: Event): void {
    event?.stopPropagation();
    this.selectOrder(order.id);
  }

  protected onViewRent(order: RentOrder, event?: Event): void {
    event?.stopPropagation();
    this.selectOrder(order.id);
  }

  private loadSalesOrders(): void {
    this.isLoading = true;
    this.loadError = '';
    this.selectedSalesDetail = null;

    const params = new HttpParams({ fromObject: { page: '1', limit: '20' } });

    this.http
      .get<ApiResponse<BackendListResponse<BuyOrderApi>>>(`${this.apiUrl}/buy-orders`, { params })
      .subscribe({
        next: (response) => {
          const items = response.data?.items ?? [];
          this.salesOrdersRaw = items.map((order) => {
            const isGuest = Boolean(order.guest_id);
            return {
              id: order.order_id ?? order.order_code,
              code: order.order_code ?? order.order_id,
              customer: order.customer_info?.full_name ?? '-',
              phone: order.customer_info?.phone ?? '-',
              total: this.formatCurrency(order.total_amount),
              paymentStatus: order.payment_status ?? 'unpaid',
              orderStatus: order.order_status ?? 'pending',
              shipping: this.formatShipping(order.shipping_provider, order.tracking_code),
              createdAt: this.formatDate(order.created_at),
              updatedAt: this.formatDate(order.updated_at),
              guestId: order.guest_id ?? null,
              userId: order.user_id ?? null,
              isGuest,
              contactChannel: order.contact_channel ?? null,
              contactedAt: order.contacted_at ?? null,
            };
          });
          this.salesTotal = response.data?.pagination.total ?? this.salesOrdersRaw.length;
          this.applySalesFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load sales orders:', error);
          this.loadError = 'Không thể tải đơn mua';
          this.salesOrders = [];
          this.salesOrdersRaw = [];
          this.salesTotal = 0;
          this.selectedId.set(null);
          this.selectedSalesDetail = null;
          this.isLoading = false;
        },
      });
  }

  private loadRentOrders(): void {
    this.isLoading = true;
    this.loadError = '';
    this.rentDetailError = '';

    const params = new HttpParams({ fromObject: { page: '1', limit: '20' } });

    this.http
      .get<ApiResponse<BackendListResponse<RentOrderApi>>>(`${this.apiUrl}/rent-orders`, { params })
      .subscribe({
        next: (response) => {
          const items = response.data?.items ?? [];
          this.rentOrdersRaw = items.map((order) => {
            const isGuest = Boolean(order.guest_id);
            return {
              id: order.rent_order_id ?? order.rent_order_code,
              code: order.rent_order_code ?? order.rent_order_id,
              customer: order.customer_info?.full_name ?? '-',
              phone: order.customer_info?.phone ?? '-',
              period: this.formatPeriod(
                order.rental_period?.start_date,
                order.rental_period?.end_date,
              ),
              days: order.rental_period?.days ?? 0,
              rentStatus: order.rent_status ?? 'booked',
              paymentStatus: order.payment?.payment_status ?? 'unpaid',
              depositPaid: this.formatCurrency(this.calcRentDeposit(order)),
              rentFee: this.formatCurrency(this.calcRentFee(order)),
              refundExpected: this.formatCurrency(this.calcRentRefundExpected(order)),
              returnRequested: Boolean(
                order.return_request?.requested_at ||
                  ['return_requested', 'returning', 'returned', 'closed', 'violated'].includes(
                    order.rent_status,
                  ),
              ),
              returnRequestedAt: order.return_request?.requested_at
                ? this.formatDate(order.return_request.requested_at)
                : '',
              tracking: this.formatShipping(
                order.shipping_out?.provider ??
                  order.shipping?.shipping_provider ??
                  null,
                order.shipping_out?.tracking_code ??
                  order.shipping?.tracking_code ??
                  null,
              ),
              createdAt: this.formatDate(order.created_at),
              guestId: order.guest_id ?? null,
              userId: order.user_id ?? null,
              isGuest,
              contactChannel: order.contact_channel ?? null,
              contactedAt: order.contacted_at ?? null,
              confirmedAt: order.confirmed_at ?? null,
            };
          });
          this.rentTotal = response.data?.pagination.total ?? this.rentOrdersRaw.length;
          this.applyRentFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load rent orders:', error);
          this.loadError = 'Không thể tải đơn thuê';
          this.rentOrders = [];
          this.rentOrdersRaw = [];
          this.rentTotal = 0;
          this.selectedId.set(null);
          this.selectedRentDetail = null;
          this.isLoading = false;
        },
      });
  }

  private loadReturnRequests(): void {
    this.isLoading = true;
    this.loadError = '';
    this.returnDetailError = '';
    this.selectedReturnDetail = null;

    const params = new HttpParams({ fromObject: { page: '1', limit: '20' } });

    this.http
      .get<ApiResponse<BackendListResponse<ReturnRequestApi>>>(`${this.apiUrl}/returns`, {
        params,
      })
      .subscribe({
        next: (response) => {
          const items = response.data?.items ?? [];
          this.returnOrdersRaw = items.map((request) => ({
            id: request.return_id ?? request.order_id,
            code: request.return_id ?? '-',
            orderCode: request.order_code ?? request.order_id ?? '-',
            status: request.status ?? 'submitted',
            amount: this.formatCurrency(request.total_amount ?? 0),
            requestedAt: this.formatDate(request.requested_at ?? request.created_at),
          }));
          this.returnTotal = response.data?.pagination.total ?? this.returnOrdersRaw.length;
          this.applyReturnFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load return requests:', error);
          this.loadError = 'Không thể tải yêu cầu hoàn trả';
          this.returnOrders = [];
          this.returnOrdersRaw = [];
          this.returnTotal = 0;
          this.selectedId.set(null);
          this.selectedReturnDetail = null;
          this.isLoading = false;
        },
      });
  }

  private fetchRentDetail(orderId: string): void {
    if (!orderId) return;
    this.rentDetailLoading = true;
    this.rentDetailError = '';

    this.http
      .get<ApiResponse<RentOrderDetailApi>>(`${this.apiUrl}/rent-orders/${orderId}`)
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.rentDetailLoading = false;
            return;
          }
          this.selectedRentDetail = response.data;
          this.hydrateRentDrafts(response.data);
          this.rentDetailLoading = false;
        },
        error: (error) => {
          this.rentDetailLoading = false;
          this.rentDetailError = error?.error?.message || 'Không thể tải chi tiết đơn thuê';
        },
      });
  }

  private fetchSalesDetail(orderId: string): void {
    if (!orderId) return;
    this.detailLoading = true;
    this.detailError = '';

    this.http
      .get<ApiResponse<BuyOrderDetailApi>>(`${this.apiUrl}/buy-orders/${orderId}`)
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.detailLoading = false;
            return;
          }
          this.selectedSalesDetail = response.data;
          this.hydrateSalesDrafts(response.data);
          this.detailLoading = false;
        },
        error: (error) => {
          this.detailLoading = false;
          this.detailError = error?.error?.message || 'Không thể tải chi tiết đơn';
        },
      });
  }

  private fetchReturnDetail(returnId: string): void {
    if (!returnId) return;
    this.returnDetailLoading = true;
    this.returnDetailError = '';

    this.http
      .get<ApiResponse<ReturnRequestApi>>(`${this.apiUrl}/returns/${returnId}`)
      .subscribe({
        next: (response) => {
          if (!response.data) {
            this.returnDetailLoading = false;
            return;
          }
          this.selectedReturnDetail = response.data;
          this.hydrateReturnDrafts(response.data);
          this.returnDetailLoading = false;
        },
        error: (error) => {
          this.returnDetailLoading = false;
          this.returnDetailError = error?.error?.message || 'Không thể tải chi tiết hoàn trả';
        },
      });
  }

  protected markSalesContacted(): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;
    if (!this.salesContactChannelDraft) {
      this.detailError = 'Vui lòng chọn kênh liên hệ.';
      return;
    }
    this.salesToastOverride = 'Đã ghi nhận liên hệ';
    this.updateSalesStatus(this.selectedSalesDetail.order_status, {
      contact_channel: this.salesContactChannelDraft,
      contacted_at: new Date().toISOString(),
    });
  }

  protected markRentContacted(): void {
    if (!this.selectedRentDetail || this.rentActionLoading) return;
    if (!this.rentContactChannelDraft) {
      this.rentDetailError = 'Vui lòng chọn kênh liên hệ.';
      return;
    }
    this.updateRentStatus(undefined, 'Đã liên hệ', false, false, {
      contact_channel: this.rentContactChannelDraft,
      contacted_at: new Date().toISOString(),
    });
  }

  protected markRentConfirmed(): void {
    if (!this.selectedRentDetail || this.rentActionLoading) return;
    this.updateRentStatus(undefined, 'Xác nhận đơn thuê', false, false, {
      confirmed_at: new Date().toISOString(),
    });
  }

  protected updateSalesStatus(
    nextStatus: OrderStatus,
    extraPayload?: { contact_channel?: ContactChannel | null; contacted_at?: string | null },
  ): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;

    const payload: {
      order_status: OrderStatus;
      admin_note?: string;
      cancel_reason?: string;
      shipping_provider?: string;
      tracking_code?: string;
      shipping_status_detail?: string;
      contact_channel?: ContactChannel | null;
      contacted_at?: string | null;
    } = {
      order_status: nextStatus,
      admin_note: this.adminNoteDraft?.trim() || '',
    };

    if (this.shippingStatusDraft?.trim()) {
      payload.shipping_status_detail = this.shippingStatusDraft.trim();
    }

    if (nextStatus === 'cancelled') {
      if (!this.cancelReasonDraft.trim()) {
        this.detailError = 'Vui lòng nhập lý do hủy đơn.';
        return;
      }
      payload.cancel_reason = this.cancelReasonDraft.trim();
    }

    if (nextStatus === 'shipping') {
      if (!this.shippingProviderDraft.trim() || !this.trackingCodeDraft.trim()) {
        this.detailError = 'Vui lòng nhập nhà vận chuyển và mã vận đơn.';
        return;
      }
      payload.shipping_provider = this.shippingProviderDraft.trim();
      payload.tracking_code = this.trackingCodeDraft.trim();
    }
    if (extraPayload) {
      Object.assign(payload, extraPayload);
    }

    this.actionLoading = true;
    this.detailError = '';
    this.http
      .patch<ApiResponse<BuyOrderDetailApi>>(
        `${this.apiUrl}/buy-orders/${this.selectedSalesDetail.order_id}/status`,
        payload,
      )
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.selectedSalesDetail = response.data;
            this.hydrateSalesDrafts(response.data);
            this.updateSalesRow(response.data);
            if (this.salesToastOverride) {
              this.notification.showSuccess(this.salesToastOverride);
            } else if (this.shouldShowSalesNoteToast) {
              this.notification.showSuccess('Đã lưu ghi chú');
            } else {
              const message = this.getSalesToastMessage(nextStatus);
              if (message) {
                this.notification.showSuccess(message);
              }
            }
          }
        },
        error: (error) => {
          this.detailError =
            error?.error?.message || 'Không thể cập nhật trạng thái đơn';
          this.notification.showError(this.detailError);
          this.shouldShowSalesNoteToast = false;
          this.salesToastOverride = '';
        },
        complete: () => {
          this.actionLoading = false;
          this.shouldShowSalesNoteToast = false;
          this.salesToastOverride = '';
        },
      });
  }

  protected updatePaymentStatus(): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;
    this.actionLoading = true;
    this.detailError = '';
    this.http
      .patch<ApiResponse<BuyOrderDetailApi>>(
        `${this.apiUrl}/buy-orders/${this.selectedSalesDetail.order_id}/payment-status`,
        { payment_status: this.paymentStatusDraft },
      )
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.selectedSalesDetail = response.data;
            this.hydrateSalesDrafts(response.data);
            this.updateSalesRow(response.data);
            this.notification.showSuccess('Đã cập nhật trạng thái thanh toán');
          }
        },
        error: (error) => {
          this.detailError =
            error?.error?.message || 'Không thể cập nhật trạng thái thanh toán';
          this.notification.showError(this.detailError);
        },
        complete: () => {
          this.actionLoading = false;
        },
      });
  }

  protected saveAdminNote(): void {
    if (!this.selectedSalesDetail) return;
    this.shouldShowSalesNoteToast = true;
    this.updateSalesStatus(this.selectedSalesDetail.order_status);
  }

  protected updateRentStatus(
    nextStatus?: RentStatus,
    logNote?: string,
    notifyReturnReminder?: boolean,
    notifyViolation?: boolean,
    extraPayload?: {
      contact_channel?: ContactChannel | null;
      contacted_at?: string | null;
      confirmed_at?: string | null;
    },
  ): void {
    if (!this.selectedRentDetail || this.rentActionLoading) return;
    this.rentActionLoading = true;
    this.rentDetailError = '';

    const payload: {
      rent_status?: RentStatus;
      admin_note?: string;
      cancel_reason?: string;
      deposit_paid?: number;
      payment_status?: PaymentStatus;
      shipping_out?: { provider?: string | null; tracking_code?: string | null };
      shipping_back?: {
        provider?: string | null;
        tracking_code?: string | null;
        created_by_shop?: boolean;
      };
      return_request?: { note?: string };
      condition_out?: { note?: string };
      condition_in?: { note?: string };
      pricing?: { late_fee?: number; damage_fee?: number; refund_expected?: number };
      settlement?: {
        refund_expected?: number;
        refund_paid?: number;
        refund_receipt_url?: string | null;
        refund_note?: string | null;
        penalty_fee?: number;
        cleaning_fee?: number;
        extra_charge?: number;
      };
      log_note?: string;
      notify_return_reminder?: boolean;
      notify_violation?: boolean;
      contact_channel?: ContactChannel | null;
      contacted_at?: string | null;
      confirmed_at?: string | null;
    } = {};

    if (nextStatus) {
      payload.rent_status = nextStatus;
    }
    const shouldShowRentNoteToast = logNote === 'Cập nhật ghi chú';
    if (typeof logNote === 'string') {
      payload.log_note = logNote;
    }
    if (notifyReturnReminder) {
      payload.notify_return_reminder = true;
    }
    if (notifyViolation) {
      payload.notify_violation = true;
    }
    if (this.rentAdminNoteDraft !== undefined) {
      payload.admin_note = this.rentAdminNoteDraft.trim();
    }
    if (this.rentCancelReasonDraft.trim()) {
      payload.cancel_reason = this.rentCancelReasonDraft.trim();
    }

    if (nextStatus === 'cancelled' && !this.rentCancelReasonDraft.trim()) {
      this.rentDetailError = 'Vui lòng nhập lý do hủy đơn.';
      this.rentActionLoading = false;
      return;
    }

    if (nextStatus === 'return_requested') {
      if (!this.selectedRentDetail.return_request?.requested_at) {
        this.rentDetailError = 'Khách chưa gửi yêu cầu trả.';
        this.rentActionLoading = false;
        return;
      }
      if (!this.shippingBackProviderDraft.trim() || !this.shippingBackTrackingDraft.trim()) {
        this.rentDetailError = 'Vui lòng nhập nhà vận chuyển và mã vận đơn trả.';
        this.rentActionLoading = false;
        return;
      }
    }

    const depositPaid = this.parseNumber(this.rentDepositPaidDraft);
    if (depositPaid !== null) {
      payload.deposit_paid = depositPaid;
    }

    if (this.rentPaymentStatusDraft) {
      payload.payment_status = this.rentPaymentStatusDraft;
    }

    if (this.shippingOutProviderDraft.trim() || this.shippingOutTrackingDraft.trim()) {
      payload.shipping_out = {
        provider: this.shippingOutProviderDraft.trim() || null,
        tracking_code: this.shippingOutTrackingDraft.trim() || null,
      };
    }

    if (this.shippingBackProviderDraft.trim() || this.shippingBackTrackingDraft.trim()) {
      payload.shipping_back = {
        provider: this.shippingBackProviderDraft.trim() || null,
        tracking_code: this.shippingBackTrackingDraft.trim() || null,
        created_by_shop: true,
      };
    }

    if (this.rentReturnNoteDraft.trim()) {
      payload.return_request = { note: this.rentReturnNoteDraft.trim() };
    }

    if (this.conditionOutNoteDraft.trim()) {
      payload.condition_out = { note: this.conditionOutNoteDraft.trim() };
    }

    if (this.conditionInNoteDraft.trim()) {
      payload.condition_in = { note: this.conditionInNoteDraft.trim() };
    }

    const autoLateFee = this.calcRentLateFeeAuto(this.selectedRentDetail);
    this.rentLateFeeDraft = `${autoLateFee}`;
    this.refreshRentRefundExpectedDraft();

    const lateFee = autoLateFee;
    const damageFee = this.parseNumber(this.rentDamageFeeDraft);
    const refundExpected = this.parseNumber(this.rentRefundExpectedDraft);
    const penaltyFee = this.parseNumber(this.rentPenaltyFeeDraft);
    const cleaningFee = this.parseNumber(this.rentCleaningFeeDraft);
    const extraCharge = this.parseNumber(this.rentExtraChargeDraft);
    if (lateFee !== null || damageFee !== null || refundExpected !== null) {
      payload.pricing = {};
      if (lateFee !== null) payload.pricing.late_fee = lateFee;
      if (damageFee !== null) payload.pricing.damage_fee = damageFee;
      if (refundExpected !== null) payload.pricing.refund_expected = refundExpected;
    }

    const refundPaid = this.parseNumber(this.rentRefundPaidDraft);
    const refundReceiptUrl =
      typeof this.rentRefundReceiptUrlDraft === 'string'
        ? this.rentRefundReceiptUrlDraft.trim()
        : '';
    const refundNote =
      typeof this.rentRefundNoteDraft === 'string' ? this.rentRefundNoteDraft.trim() : '';
    if (
      refundPaid !== null ||
      penaltyFee !== null ||
      cleaningFee !== null ||
      extraCharge !== null ||
      refundExpected !== null ||
      refundReceiptUrl ||
      refundNote
    ) {
      payload.settlement = payload.settlement || {};
      if (refundExpected !== null) payload.settlement.refund_expected = refundExpected;
      if (refundPaid !== null) payload.settlement.refund_paid = refundPaid;
      if (penaltyFee !== null) payload.settlement.penalty_fee = penaltyFee;
      if (cleaningFee !== null) payload.settlement.cleaning_fee = cleaningFee;
      if (extraCharge !== null) payload.settlement.extra_charge = extraCharge;
      if (refundReceiptUrl) payload.settlement.refund_receipt_url = refundReceiptUrl;
      if (refundNote) payload.settlement.refund_note = refundNote;
    }
    if (extraPayload) {
      Object.assign(payload, extraPayload);
    }

    this.http
      .patch<ApiResponse<RentOrderDetailApi>>(
        `${this.apiUrl}/rent-orders/${this.selectedRentDetail.rent_order_id}/status`,
        payload,
      )
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.selectedRentDetail = response.data;
            this.hydrateRentDrafts(response.data);
            this.updateRentRow(response.data);
            if (notifyReturnReminder) {
              this.notification.showSuccess('Đã gửi nhắc nhở');
            } else if (shouldShowRentNoteToast) {
              this.notification.showSuccess('Đã lưu ghi chú');
            } else {
              const message = this.getRentToastMessage(nextStatus, logNote, notifyViolation);
              if (message) {
                this.notification.showSuccess(message);
              }
            }
          }
        },
        error: (error) => {
          this.rentDetailError = error?.error?.message || 'Không thể cập nhật đơn thuê';
          this.notification.showError(this.rentDetailError);
        },
        complete: () => {
          this.rentActionLoading = false;
        },
      });
  }

  protected updateReturnStatus(nextStatus?: ReturnStatus, logNote?: string): void {
    if (!this.selectedReturnDetail || this.returnActionLoading) return;
    this.returnActionLoading = true;
    this.returnDetailError = '';

    const payload: {
      status?: ReturnStatus;
      note?: string;
      admin_note?: string;
      return_shipping?: { provider?: string | null; tracking_code?: string | null };
      refund?: { adjusted_amount?: number; approved_amount?: number; note?: string; receipt_url?: string };
    } = {};

    if (nextStatus) {
      payload.status = nextStatus;
    }

    const note = (logNote ?? this.returnNoteDraft)?.trim();
    if (note) {
      payload.note = note;
    }

    if (this.returnRefundNoteDraft.trim()) {
      payload.refund = payload.refund || {};
      payload.refund.note = this.returnRefundNoteDraft.trim();
    }

    const refundAmount = this.parseNumber(this.returnRefundAmountDraft);
    if (refundAmount !== null) {
      payload.refund = payload.refund || {};
      payload.refund.adjusted_amount = refundAmount;
      if (!payload.refund.approved_amount) {
        payload.refund.approved_amount = refundAmount;
      }
    }

    if (this.returnReceiptUrlDraft.trim()) {
      payload.refund = payload.refund || {};
      payload.refund.receipt_url = this.returnReceiptUrlDraft.trim();
    }

    if (this.returnShippingProviderDraft.trim() || this.returnShippingTrackingDraft.trim()) {
      payload.return_shipping = {
        provider: this.returnShippingProviderDraft.trim() || null,
        tracking_code: this.returnShippingTrackingDraft.trim() || null,
      };
    }

    this.http
      .patch<ApiResponse<ReturnRequestApi>>(
        `${this.apiUrl}/returns/${this.selectedReturnDetail.return_id}/status`,
        payload,
      )
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.selectedReturnDetail = response.data;
            this.hydrateReturnDrafts(response.data);
            this.updateReturnRow(response.data);
            const message = this.getReturnToastMessage(nextStatus, logNote);
            if (message) {
              this.notification.showSuccess(message);
            }
          }
        },
        error: (error) => {
          this.returnDetailError =
            error?.error?.message || 'Không thể cập nhật hoàn trả';
          this.notification.showError(this.returnDetailError);
        },
        complete: () => {
          this.returnActionLoading = false;
        },
      });
  }

  private getSalesToastMessage(status: OrderStatus): string {
    const messages: Record<OrderStatus, string> = {
      pending: 'Đã chuyển về chờ xác nhận',
      confirmed: 'Đã xác nhận đơn',
      processing: 'Đã chuyển sang xử lý',
      shipping: 'Đã tạo vận đơn & chuyển đang giao',
      completed: 'Đã hoàn thành đơn',
      cancelled: 'Đã hủy đơn',
    };
    return messages[status] || 'Đã cập nhật đơn mua';
  }

  private getRentToastMessage(
    status?: RentStatus,
    logNote?: string,
    notifyViolation?: boolean,
  ): string {
    if (notifyViolation) {
      return 'Đã cập nhật phí vi phạm';
    }
    if (logNote) {
      const logMap: Record<string, string> = {
        'Xác nhận đơn thuê': 'Đã xác nhận đơn thuê',
        'Tạo vận đơn giao': 'Đã tạo vận đơn giao',
        'Tạo mã vận đơn trả': 'Đã tạo mã vận đơn trả',
        'Đã liên hệ': 'Đã ghi nhận liên hệ',
        'Gửi nhắc nhở khách': 'Đã gửi nhắc nhở',
        'Cập nhật vi phạm': 'Đã lưu phí vi phạm',
      };
      if (logMap[logNote]) return logMap[logNote];
      return `Đã ${logNote.toLowerCase()}`;
    }
    if (!status) return 'Đã cập nhật đơn thuê';
    const statusMap: Record<RentStatus, string> = {
      booked: 'Đã cập nhật đơn thuê',
      ongoing: 'Đã đánh dấu đã giao',
      return_requested: 'Đã tạo mã vận đơn trả',
      returning: 'Đã cập nhật đơn thuê',
      returned: 'Đã đánh dấu shop đã nhận',
      closed: 'Đã hoàn cọc & chốt đơn',
      cancelled: 'Đã hủy đơn thuê',
      violated: 'Đã chuyển vi phạm',
    };
    return statusMap[status] || 'Đã cập nhật đơn thuê';
  }

  private getReturnToastMessage(status?: ReturnStatus, logNote?: string): string {
    if (logNote) {
      return logNote;
    }
    if (!status) return 'Đã cập nhật hoàn trả';
    const statusMap: Record<ReturnStatus, string> = {
      submitted: 'Đã cập nhật hoàn trả',
      need_more_info: 'Đã yêu cầu bổ sung thông tin',
      approved: 'Đã duyệt yêu cầu',
      awaiting_return_shipment: 'Đã tạo mã vận đơn trả',
      return_in_transit: 'Đã cập nhật vận đơn trả',
      received_inspecting: 'Đã xác nhận đã nhận hàng',
      refund_processing: 'Đã xác nhận hoàn tiền',
      refunded: 'Đã đánh dấu đã hoàn tiền',
      closed: 'Đã đóng yêu cầu hoàn trả',
    };
    return statusMap[status] || 'Đã cập nhật hoàn trả';
  }

  private hydrateSalesDrafts(order: BuyOrderDetailApi): void {
    this.adminNoteDraft = order.admin_note ?? '';
    this.cancelReasonDraft = order.cancel_reason ?? '';
    this.shippingProviderDraft = order.shipping_provider ?? '';
    this.trackingCodeDraft = order.tracking_code ?? '';
    this.shippingStatusDraft = order.shipping_status_detail ?? '';
    this.paymentStatusDraft = order.payment_status ?? 'unpaid';
    this.salesContactChannelDraft = order.contact_channel ?? '';
  }

  private hydrateRentDrafts(order: RentOrderDetailApi): void {
    this.rentAdminNoteDraft = order.admin_note ?? '';
    this.rentCancelReasonDraft = order.cancel_reason ?? '';
    this.rentDepositPaidDraft = `${this.calcRentDeposit(order)}`;
    this.rentPaymentStatusDraft = order.payment?.payment_status ?? 'unpaid';
    this.rentReturnNoteDraft = order.return_request?.note ?? '';
    this.rentContactChannelDraft = order.contact_channel ?? '';
    this.shippingOutProviderDraft = order.shipping_out?.provider ?? '';
    this.shippingOutTrackingDraft = order.shipping_out?.tracking_code ?? '';
    this.shippingBackProviderDraft = order.shipping_back?.provider ?? '';
    this.shippingBackTrackingDraft = order.shipping_back?.tracking_code ?? '';
    this.conditionOutNoteDraft = order.item?.condition_out?.note ?? '';
    this.conditionInNoteDraft = order.item?.condition_in?.note ?? '';
    this.rentLateFeeDraft = `${this.calcRentLateFeeAuto(order)}`;
    this.rentDamageFeeDraft = `${order.pricing?.damage_fee ?? order.settlement?.damage_fee ?? 0}`;
    this.rentPenaltyFeeDraft = `${order.settlement?.penalty_fee ?? 0}`;
    this.rentCleaningFeeDraft = `${order.settlement?.cleaning_fee ?? 0}`;
    this.rentExtraChargeDraft = `${order.settlement?.extra_charge ?? 0}`;
    this.rentRefundExpectedDraft = `${this.calcRentRefundExpected(order)}`;
    this.rentRefundPaidDraft = `${order.settlement?.refund_paid ?? 0}`;
    this.rentRefundReceiptUrlDraft = order.settlement?.refund_receipt_url ?? '';
    this.rentRefundNoteDraft = order.settlement?.refund_note ?? '';
    this.refreshRentRefundExpectedDraft();
  }

  private hydrateReturnDrafts(request: ReturnRequestApi): void {
    this.returnNoteDraft = request.admin_note ?? '';
    const adjusted =
      request.refund?.adjusted_amount ??
      request.refund?.approved_amount ??
      request.refund?.requested_amount ??
      request.total_amount ??
      0;
    this.returnRefundAmountDraft = `${adjusted}`;
    this.returnRefundNoteDraft = request.refund?.note ?? '';
    this.returnShippingProviderDraft = request.return_shipping?.provider ?? '';
    this.returnShippingTrackingDraft = request.return_shipping?.tracking_code ?? '';
    this.returnReceiptUrlDraft = request.refund?.receipt_url ?? '';
  }

  private updateSalesRow(order: BuyOrderDetailApi): void {
    const updatedAt = this.formatDate(order.updated_at ?? new Date().toISOString());
    const shipping = this.formatShipping(order.shipping_provider, order.tracking_code);
    const isGuest = Boolean(order.guest_id);
    const updateRow = (item: SalesOrder) =>
      item.id === order.order_id
        ? {
            ...item,
            orderStatus: order.order_status ?? item.orderStatus,
            paymentStatus: order.payment_status ?? item.paymentStatus,
            shipping,
            updatedAt,
            guestId: order.guest_id ?? item.guestId,
            userId: order.user_id ?? item.userId,
            isGuest,
            contactChannel: order.contact_channel ?? item.contactChannel,
            contactedAt: order.contacted_at ?? item.contactedAt,
          }
        : item;
    this.salesOrders = this.salesOrders.map(updateRow);
    this.salesOrdersRaw = this.salesOrdersRaw.map(updateRow);
  }

  private updateRentRow(order: RentOrderDetailApi): void {
    const tracking = this.formatShipping(
      order.shipping_out?.provider ?? order.shipping?.shipping_provider ?? null,
      order.shipping_out?.tracking_code ?? order.shipping?.tracking_code ?? null,
    );
    const isGuest = Boolean(order.guest_id);
    const updateRow = (item: RentOrder) =>
      item.id === order.rent_order_id
        ? {
            ...item,
            rentStatus: order.rent_status ?? item.rentStatus,
            paymentStatus: order.payment?.payment_status ?? item.paymentStatus,
            depositPaid: this.formatCurrency(this.calcRentDeposit(order)),
            rentFee: this.formatCurrency(this.calcRentFee(order)),
            refundExpected: this.formatCurrency(this.calcRentRefundExpected(order)),
            returnRequested: Boolean(
              order.return_request?.requested_at ||
                ['return_requested', 'returning', 'returned', 'closed', 'violated'].includes(
                  order.rent_status,
                ),
            ),
            returnRequestedAt: order.return_request?.requested_at
              ? this.formatDate(order.return_request.requested_at)
              : '',
            tracking,
            guestId: order.guest_id ?? item.guestId,
            userId: order.user_id ?? item.userId,
            isGuest,
            contactChannel: order.contact_channel ?? item.contactChannel,
            contactedAt: order.contacted_at ?? item.contactedAt,
            confirmedAt: order.confirmed_at ?? item.confirmedAt,
          }
        : item;
    this.rentOrders = this.rentOrders.map(updateRow);
    this.rentOrdersRaw = this.rentOrdersRaw.map(updateRow);
  }

  private updateReturnRow(request: ReturnRequestApi): void {
    this.returnOrders = this.returnOrders.map((item) =>
      item.id === request.return_id
        ? {
            ...item,
            status: request.status ?? item.status,
            amount: this.formatCurrency(request.total_amount ?? 0),
            requestedAt: this.formatDate(request.requested_at ?? request.created_at),
          }
        : item,
    );
  }

  protected applyFilters(): void {
    if (this.view() === 'sales') {
      this.applySalesFilters();
    } else if (this.view() === 'rent') {
      this.applyRentFilters();
    } else if (this.view() === 'returns') {
      this.applyReturnFilters();
    }
  }

  protected resetFilters(): void {
    this.searchTerm = '';
    this.salesStatusFilter = 'all';
    this.salesPaymentFilter = 'all';
    this.salesShippingFilter = 'all';
    this.salesCustomerFilter = 'all';
    this.rentStatusFilter = 'all';
    this.rentPaymentFilter = 'all';
    this.rentReturnFilter = 'all';
    this.rentCustomerFilter = 'all';
    this.returnStatusFilter = 'all';
    this.applyFilters();
  }

  protected refreshOrders(): void {
    if (this.view() === 'sales') {
      this.loadSalesOrders();
      return;
    }
    if (this.view() === 'rent') {
      this.loadRentOrders();
      return;
    }
    if (this.view() === 'returns') {
      this.loadReturnRequests();
    }
  }

  private applySalesFilters(): void {
    const search = this.normalizeText(this.searchTerm);
    let filtered = [...this.salesOrdersRaw];

    if (this.salesStatusFilter !== 'all') {
      filtered = filtered.filter((order) => order.orderStatus === this.salesStatusFilter);
    }
    if (this.salesPaymentFilter !== 'all') {
      filtered = filtered.filter((order) => order.paymentStatus === this.salesPaymentFilter);
    }
    if (this.salesShippingFilter !== 'all') {
      const shippingFilter = this.normalizeText(this.salesShippingFilter);
      filtered = filtered.filter((order) =>
        this.normalizeText(order.shipping).includes(shippingFilter),
      );
    }
    if (this.salesCustomerFilter !== 'all') {
      const shouldGuest = this.salesCustomerFilter === 'guest';
      filtered = filtered.filter((order) => order.isGuest === shouldGuest);
    }
    if (search) {
      filtered = filtered.filter((order) => {
        const haystack = [
          order.code,
          order.customer,
          order.phone,
        ]
          .map((value) => this.normalizeText(value))
          .join(' ');
        return haystack.includes(search);
      });
    }

    this.salesOrders = filtered;
    this.syncSelectedSales();
  }

  private applyRentFilters(): void {
    const search = this.normalizeText(this.searchTerm);
    let filtered = [...this.rentOrdersRaw];

    if (this.rentStatusFilter !== 'all') {
      filtered = filtered.filter((order) => order.rentStatus === this.rentStatusFilter);
    }
    if (this.rentPaymentFilter !== 'all') {
      filtered = filtered.filter((order) => order.paymentStatus === this.rentPaymentFilter);
    }
    if (this.rentReturnFilter !== 'all') {
      const shouldHaveRequest = this.rentReturnFilter === 'requested';
      filtered = filtered.filter((order) => order.returnRequested === shouldHaveRequest);
    }
    if (this.rentCustomerFilter !== 'all') {
      const shouldGuest = this.rentCustomerFilter === 'guest';
      filtered = filtered.filter((order) => order.isGuest === shouldGuest);
    }
    if (search) {
      filtered = filtered.filter((order) => {
        const haystack = [
          order.code,
          order.customer,
          order.phone,
        ]
          .map((value) => this.normalizeText(value))
          .join(' ');
        return haystack.includes(search);
      });
    }

    this.rentOrders = filtered;
    this.syncSelectedRent();
  }

  private applyReturnFilters(): void {
    const search = this.normalizeText(this.searchTerm);
    let filtered = [...this.returnOrdersRaw];

    if (this.returnStatusFilter !== 'all') {
      filtered = filtered.filter((request) => request.status === this.returnStatusFilter);
    }

    if (search) {
      filtered = filtered.filter((request) => {
        const haystack = [request.code, request.orderCode]
          .map((value) => this.normalizeText(value))
          .join(' ');
        return haystack.includes(search);
      });
    }

    this.returnOrders = filtered;
    this.syncSelectedReturn();
  }

  private syncSelectedSales(): void {
    if (this.view() !== 'sales') return;
    const currentId = this.selectedId();
    const hasCurrent = currentId && this.salesOrders.some((order) => order.id === currentId);
    if (hasCurrent) return;

    const nextId = this.salesOrders[0]?.id ?? null;
    this.selectedId.set(nextId);
    if (nextId) {
      this.fetchSalesDetail(nextId);
    } else {
      this.selectedSalesDetail = null;
    }
  }

  private syncSelectedRent(): void {
    if (this.view() !== 'rent') return;
    const currentId = this.selectedId();
    const hasCurrent = currentId && this.rentOrders.some((order) => order.id === currentId);
    if (hasCurrent) return;

    const nextId = this.rentOrders[0]?.id ?? null;
    this.selectedId.set(nextId);
    if (nextId) {
      this.fetchRentDetail(nextId);
    } else {
      this.selectedRentDetail = null;
    }
  }

  private syncSelectedReturn(): void {
    if (this.view() !== 'returns') return;
    const currentId = this.selectedId();
    const hasCurrent = currentId && this.returnOrders.some((order) => order.id === currentId);
    if (hasCurrent) return;

    const nextId = this.returnOrders[0]?.id ?? null;
    this.selectedId.set(nextId);
    if (nextId) {
      this.fetchReturnDetail(nextId);
    } else {
      this.selectedReturnDetail = null;
    }
  }

  private normalizeText(value?: string | null): string {
    return (value ?? '').toString().trim().toLowerCase();
  }

  protected getSalesStatusMetaFor(order: SalesOrder): { label: string; class: string } {
    return this.resolveSalesStatusMeta(order.orderStatus, order.isGuest, order.contactedAt);
  }

  protected getSalesDetailStatusMeta(order: BuyOrderDetailApi): { label: string; class: string } {
    return this.resolveSalesStatusMeta(
      order.order_status ?? 'pending',
      Boolean(order.guest_id),
      order.contacted_at ?? null,
    );
  }

  protected getRentStatusMetaFor(order: RentOrder): { label: string; class: string } {
    return this.resolveRentStatusMeta(
      order.rentStatus,
      order.isGuest,
      order.contactedAt,
      order.confirmedAt,
    );
  }

  protected getRentDetailStatusMeta(order: RentOrderDetailApi): { label: string; class: string } {
    return this.resolveRentStatusMeta(
      order.rent_status ?? 'booked',
      Boolean(order.guest_id),
      order.contacted_at ?? null,
      order.confirmed_at ?? null,
    );
  }

  protected getSalesItems(order?: BuyOrderDetailApi | null) {
    if (!order) return [];
    if (order.detailedItems?.length) return order.detailedItems;
    return order.items ?? [];
  }

  protected isGuestSalesDetail(): boolean {
    return Boolean(this.selectedSalesDetail?.guest_id);
  }

  protected isGuestRentDetail(): boolean {
    return Boolean(this.selectedRentDetail?.guest_id);
  }

  protected formatAddressText(address?: OrderAddress): string {
    if (!address) return '-';
    const parts = [
      address.detail || address.address_detail,
      address.ward,
      address.district,
      address.province,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : '-';
  }

  protected formatCurrency(value: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(value)} đ`;
  }

  private resolveSalesStatusMeta(
    status: OrderStatus,
    isGuest: boolean,
    contactedAt?: string | null,
  ): { label: string; class: string } {
    if (!isGuest) {
      return this.orderStatusMeta[status];
    }
    if (status === 'pending') {
      return contactedAt
        ? { label: 'Đã liên hệ', class: 'badge badge-info' }
        : { label: 'Yêu cầu', class: 'badge badge-warning' };
    }
    if (status === 'confirmed' || status === 'processing') {
      return { label: 'Đã chốt đơn', class: 'badge badge-info' };
    }
    if (status === 'shipping') {
      return { label: 'Đang giao', class: 'badge badge-info' };
    }
    if (status === 'completed') {
      return { label: 'Hoàn tất', class: 'badge badge-success' };
    }
    if (status === 'cancelled') {
      return { label: 'Đã hủy', class: 'badge badge-neutral' };
    }
    return this.orderStatusMeta[status];
  }

  private resolveRentStatusMeta(
    status: RentStatus,
    isGuest: boolean,
    contactedAt?: string | null,
    confirmedAt?: string | null,
  ): { label: string; class: string } {
    if (!isGuest) {
      return this.rentStatusMeta[status];
    }
    if (status === 'booked') {
      if (confirmedAt) {
        return { label: 'Đã chốt thuê', class: 'badge badge-info' };
      }
      if (contactedAt) {
        return { label: 'Đã liên hệ', class: 'badge badge-info' };
      }
      return { label: 'Yêu cầu thuê', class: 'badge badge-warning' };
    }
    if (status === 'ongoing') {
      return { label: 'Đang thuê', class: 'badge badge-info' };
    }
    if (status === 'return_requested' || status === 'returning' || status === 'returned') {
      return { label: 'Đã trả đồ', class: 'badge badge-info' };
    }
    if (status === 'closed') {
      return { label: 'Hoàn tất', class: 'badge badge-neutral' };
    }
    if (status === 'cancelled') {
      return { label: 'Đã hủy', class: 'badge badge-neutral' };
    }
    if (status === 'violated') {
      return { label: 'Vi phạm', class: 'badge badge-error' };
    }
    return this.rentStatusMeta[status];
  }

  protected calcRentDeposit(order?: {
    payment?: { deposit_paid?: number };
    pricing?: { deposit_required?: number };
    item?: { deposit_amount?: number; quantity?: number };
  }): number {
    const depositRequired = order?.pricing?.deposit_required;
    let depositBase =
      typeof depositRequired === 'number' && Number.isFinite(depositRequired)
        ? depositRequired
        : null;
    if (depositBase === null) {
      const itemDeposit = order?.item?.deposit_amount;
      const itemQty = order?.item?.quantity;
      if (typeof itemDeposit === 'number' && Number.isFinite(itemDeposit)) {
        const safeQty = typeof itemQty === 'number' && itemQty > 0 ? itemQty : 1;
        depositBase = itemDeposit * safeQty;
      }
    }
    return depositBase ?? order?.payment?.deposit_paid ?? 0;
  }

  protected calcRentFee(order?: { pricing?: { rent_fee_expected?: number } }): number {
    return order?.pricing?.rent_fee_expected ?? 0;
  }

  protected calcRentPenaltyFees(order?: {
    pricing?: { late_fee?: number | null; damage_fee?: number | null };
    settlement?: {
      late_fee?: number | null;
      damage_fee?: number | null;
      penalty_fee?: number | null;
      cleaning_fee?: number | null;
      extra_charge?: number | null;
    };
  }): number {
    const lateFee = order?.settlement?.late_fee ?? order?.pricing?.late_fee ?? 0;
    const damageFee = order?.settlement?.damage_fee ?? order?.pricing?.damage_fee ?? 0;
    const penaltyFee = order?.settlement?.penalty_fee ?? 0;
    const cleaningFee = order?.settlement?.cleaning_fee ?? 0;
    const extraCharge = order?.settlement?.extra_charge ?? 0;
    return lateFee + damageFee + penaltyFee + cleaningFee + extraCharge;
  }

  protected calcRentRefundExpected(order?: {
    payment?: { deposit_paid?: number };
    pricing?: {
      deposit_required?: number;
      rent_fee_expected?: number;
      late_fee?: number | null;
      damage_fee?: number | null;
    };
    item?: { deposit_amount?: number; quantity?: number };
    settlement?: { late_fee?: number | null; damage_fee?: number | null; penalty_fee?: number | null };
  }): number {
    const depositRequired = order?.pricing?.deposit_required;
    let depositBase =
      typeof depositRequired === 'number' && Number.isFinite(depositRequired)
        ? depositRequired
        : null;
    if (depositBase === null) {
      const itemDeposit = order?.item?.deposit_amount;
      const itemQty = order?.item?.quantity;
      if (typeof itemDeposit === 'number' && Number.isFinite(itemDeposit)) {
        const safeQty = typeof itemQty === 'number' && itemQty > 0 ? itemQty : 1;
        depositBase = itemDeposit * safeQty;
      }
    }
    const deposit = depositBase ?? this.calcRentDeposit(order);
    const rentFee = this.calcRentFee(order);
    const penaltyTotal = this.calcRentPenaltyFees(order);
    return Math.max(0, deposit - rentFee - penaltyTotal);
  }

  private calcRentLateFeeAuto(order?: RentOrderDetailApi): number {
    if (!order) return 0;
    const shippedAt = order.shipping_back?.shipped_at;
    const endDate = order.rental_period?.end_date;
    if (!shippedAt || !endDate) return 0;
    const shipDay = this.toDateStart(shippedAt);
    const endDay = this.toDateStart(endDate);
    if (!shipDay || !endDay) return 0;
    const diffMs = shipDay.getTime() - endDay.getTime();
    if (diffMs <= 0) return 0;
    const lateDays = Math.ceil(diffMs / 86400000);
    const rentPerDay = this.calcRentPerDay(order);
    const latePerDay = rentPerDay * 0.03;
    return Math.round(lateDays * latePerDay);
  }

  private calcRentPerDay(order?: RentOrderDetailApi): number {
    if (!order) return 0;
    const rentPerDay = order.item?.rent_price_per_day;
    const qty = order.item?.quantity;
    if (typeof rentPerDay === 'number' && Number.isFinite(rentPerDay)) {
      const safeQty = typeof qty === 'number' && qty > 0 ? qty : 1;
      return rentPerDay * safeQty;
    }
    const total = order.pricing?.rent_fee_expected;
    const days = order.rental_period?.days;
    if (typeof total === 'number' && Number.isFinite(total) && typeof days === 'number' && days > 0) {
      return total / days;
    }
    return 0;
  }

  protected refreshRentRefundExpectedDraft(): void {
    if (!this.selectedRentDetail) return;
    const deposit = this.calcRentDeposit(this.selectedRentDetail);
    const rentFee = this.calcRentFee(this.selectedRentDetail);
    const lateFee = this.calcRentLateFeeAuto(this.selectedRentDetail);
    const damageFee = this.parseNumber(this.rentDamageFeeDraft) ?? 0;
    const penaltyFee = this.parseNumber(this.rentPenaltyFeeDraft) ?? 0;
    const cleaningFee = this.parseNumber(this.rentCleaningFeeDraft) ?? 0;
    const extraCharge = this.parseNumber(this.rentExtraChargeDraft) ?? 0;
    const expected = Math.max(
      0,
      deposit - rentFee - lateFee - damageFee - penaltyFee - cleaningFee - extraCharge,
    );
    this.rentLateFeeDraft = `${lateFee}`;
    this.rentRefundExpectedDraft = `${expected}`;
  }

  private toDateStart(value: string | Date): Date | null {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatDate(value?: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  protected formatDateTime(value?: string | null): string {
    if (!value) return '-';
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

  private formatPeriod(start?: string, end?: string): string {
    if (!start || !end) return '-';
    return `${this.formatDate(start)} - ${this.formatDate(end)}`;
  }

  private formatShipping(provider?: string | null, tracking?: string | null): string {
    if (!provider && !tracking) return '-';
    if (provider && tracking) return `${provider} - ${tracking}`;
    return provider || tracking || '-';
  }

  private parseNumber(value?: string): number | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.toString().trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
