import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiResponse, BackendListResponse } from '../../../../models';
import { NotificationService } from '../../../../core/services/notification.service';
import { environment } from '../../../../../environments/environment';

type OrderView = 'sales' | 'rent' | 'returns';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipping' | 'completed' | 'cancelled';
type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'failed' | 'refunded';
type ShippingStatus = 'pending' | 'ready_to_ship' | 'shipped' | 'delivered' | 'delivery_failed';
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
  shipping_fee?: number;
  payment_status: PaymentStatus;
  payment_transaction_code?: string | null;
  payment_method?: string | null;
  order_status: OrderStatus;
  shipping_provider?: string | null;
  shipping_method?: string | null;
  shipping_status?: ShippingStatus | null;
  tracking_code?: string | null;
  tracking_created_at?: string | null;
  estimated_delivery_at?: string | null;
  shipping_status_detail?: string | null;
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
  private readonly router = inject(Router);
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
  protected shippingMethodDraft = '';
  protected shippingFeeDraft = '';
  protected shippingStatusDraft: ShippingStatus = 'pending';
  protected trackingCodeDraft = '';
  protected trackingCreatedAtDraft = '';
  protected estimatedDeliveryAtDraft = '';
  protected shippingStatusDetailDraft = '';
  protected paymentStatusDraft: PaymentStatus = 'unpaid';
  protected paymentTransactionCodeDraft = '';
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
  protected detailMode = false;
  protected selectedSalesProgressStep: OrderStatus | null = null;
  protected selectedRentProgressStep: RentStatus | null = null;
  protected selectedReturnProgressStep: ReturnStatus | null = null;

  protected readonly orderStatusMeta: Record<OrderStatus, { label: string; class: string }> = {
    pending: { label: 'Pending', class: 'badge badge-warning' },
    confirmed: { label: 'Confirmed', class: 'badge badge-info' },
    processing: { label: 'Processing', class: 'badge badge-info' },
    shipping: { label: 'Shipping', class: 'badge badge-info' },
    completed: { label: 'Completed', class: 'badge badge-success' },
    cancelled: { label: 'Cancelled', class: 'badge badge-neutral' },
  };

  protected readonly paymentMeta: Record<PaymentStatus, { label: string; class: string }> = {
    unpaid: { label: 'Unpaid', class: 'badge badge-error' },
    partial: { label: 'Partially paid', class: 'badge badge-warning' },
    paid: { label: 'Paid', class: 'badge badge-success' },
    failed: { label: 'Failed', class: 'badge badge-neutral' },
    refunded: { label: 'Refunded', class: 'badge badge-neutral' },
  };

  protected readonly paymentStatusOptions: Array<{ value: PaymentStatus; label: string }> = [
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partial', label: 'Partially paid' },
    { value: 'paid', label: 'Paid' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
  ];
  protected readonly rentPaymentStatusOptions: Array<{ value: PaymentStatus; label: string }> = [
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partial', label: 'Partially paid' },
    { value: 'paid', label: 'Paid' },
  ];
  protected readonly contactChannelOptions: Array<{ value: ContactChannel; label: string }> = [
    { value: 'zalo', label: 'Zalo' },
    { value: 'phone', label: 'Phone' },
    { value: 'web', label: 'Web' },
  ];
  protected readonly shipmentCarrierOptions: Array<{ value: string; label: string }> = [
    { value: 'GHN', label: 'GHN' },
    { value: 'GHTK', label: 'GHTK' },
    { value: 'JNT', label: 'J&T' },
    { value: 'NOI_BO', label: 'Nội bộ' },
  ];
  protected readonly shippingMethodOptions: Array<{ value: string; label: string }> = [
    { value: 'standard', label: 'Tiêu chuẩn' },
    { value: 'express', label: 'Nhanh' },
  ];
  protected readonly shippingStatusMeta: Record<ShippingStatus, { label: string; class: string }> = {
    pending: { label: 'Chờ xử lý', class: 'badge badge-warning' },
    ready_to_ship: { label: 'Sẵn sàng giao', class: 'badge badge-info' },
    shipped: { label: 'Đang giao', class: 'badge badge-info' },
    delivered: { label: 'Đã giao', class: 'badge badge-success' },
    delivery_failed: { label: 'Giao thất bại', class: 'badge badge-error' },
  };

  private readonly salesTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled', 'pending'],
    processing: ['shipping', 'cancelled'],
    shipping: ['completed', 'cancelled', 'processing'],
    completed: [],
    cancelled: [],
  };

  private readonly rentTransitions: Record<RentStatus, RentStatus[]> = {
    booked: ['ongoing', 'cancelled'],
    ongoing: ['return_requested', 'cancelled', 'violated'],
    return_requested: ['returning', 'cancelled'],
    returning: ['returned', 'violated'],
    returned: ['closed', 'violated'],
    closed: [],
    cancelled: [],
    violated: ['closed'],
  };

  private readonly returnTransitions: Record<ReturnStatus, ReturnStatus[]> = {
    submitted: ['need_more_info', 'approved', 'closed'],
    need_more_info: ['approved', 'closed'],
    approved: ['awaiting_return_shipment', 'submitted'],
    awaiting_return_shipment: ['return_in_transit'],
    return_in_transit: ['received_inspecting'],
    received_inspecting: ['refund_processing', 'closed'],
    refund_processing: ['refunded'],
    refunded: ['closed', 'received_inspecting'],
    closed: ['received_inspecting'],
  };

  protected readonly rentStatusMeta: Record<RentStatus, { label: string; class: string }> = {
    booked: { label: 'Booked', class: 'badge badge-warning' },
    ongoing: { label: 'Ongoing', class: 'badge badge-info' },
    return_requested: { label: 'Return requested', class: 'badge badge-warning' },
    returning: { label: 'Returning', class: 'badge badge-info' },
    returned: { label: 'Received by shop', class: 'badge badge-info' },
    closed: { label: 'Closed', class: 'badge badge-neutral' },
    cancelled: { label: 'Cancelled', class: 'badge badge-neutral' },
    violated: { label: 'Violated', class: 'badge badge-error' },
  };

  protected readonly returnStatusMeta: Record<ReturnStatus, { label: string; class: string }> = {
    submitted: { label: 'Đã gửi yêu cầu', class: 'badge badge-warning' },
    need_more_info: { label: 'Cần bổ sung thông tin', class: 'badge badge-warning' },
    approved: { label: 'Đã duyệt', class: 'badge badge-info' },
    awaiting_return_shipment: { label: 'Chờ gửi hàng trả', class: 'badge badge-info' },
    return_in_transit: { label: 'Đang vận chuyển hàng trả', class: 'badge badge-info' },
    received_inspecting: { label: 'Đã nhận, đang kiểm tra', class: 'badge badge-warning' },
    refund_processing: { label: 'Đang xử lý hoàn tiền', class: 'badge badge-info' },
    refunded: { label: 'Đã hoàn tiền', class: 'badge badge-success' },
    closed: { label: 'Hoàn tất', class: 'badge badge-neutral' },
  };
  protected readonly salesProgressFlow: OrderStatus[] = [
    'pending',
    'confirmed',
    'processing',
    'shipping',
    'completed',
  ];
  protected readonly rentProgressFlow: RentStatus[] = [
    'booked',
    'ongoing',
    'return_requested',
    'returning',
    'returned',
    'closed',
  ];
  protected readonly returnProgressFlow: ReturnStatus[] = [
    'submitted',
    'need_more_info',
    'approved',
    'awaiting_return_shipment',
    'return_in_transit',
    'received_inspecting',
    'refund_processing',
    'refunded',
    'closed',
  ];

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

  private routeReady = false;
  private pendingSalesOrderId: string | null = null;
  private pendingRentOrderId: string | null = null;
  private pendingReturnRequestId: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const routeId = params.get('id');
      if (!routeId) {
        return;
      }
      this.pendingSalesOrderId = routeId;
      this.pendingRentOrderId = routeId;
      this.pendingReturnRequestId = routeId;

      if (this.routeReady && this.hasLoadedViewData()) {
        this.applyPendingSelection();
      }
    });

    this.route.queryParamMap.subscribe((params) => {
      const orderId = params.get('order');
      const requestId = params.get('request');

      if (orderId) {
        this.pendingSalesOrderId = orderId;
        this.pendingRentOrderId = orderId;
      }
      if (requestId) {
        this.pendingReturnRequestId = requestId;
      }

      if (this.routeReady && !this.detailMode) {
        if (this.view() === 'sales' && orderId) {
          this.router.navigate(['/orders/sales', orderId], { replaceUrl: true });
          return;
        }
        if (this.view() === 'rent' && orderId) {
          this.router.navigate(['/orders/rent', orderId], { replaceUrl: true });
          return;
        }
        if (this.view() === 'returns' && requestId) {
          this.router.navigate(['/orders/returns', requestId], { replaceUrl: true });
          return;
        }
      }

      if (this.routeReady && this.hasLoadedViewData()) {
        this.applyPendingSelection();
      }
    });

    this.route.data.subscribe((data) => {
      this.routeReady = true;
      const view = (data['view'] as OrderView) ?? 'sales';
      this.detailMode = Boolean(data['detail']);
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
    if (this.detailMode) {
      return;
    }
    this.router.navigate(['/orders/sales', order.id]);
  }

  protected onViewRent(order: RentOrder, event?: Event): void {
    event?.stopPropagation();
    if (this.detailMode) {
      return;
    }
    this.router.navigate(['/orders/rent', order.id]);
  }

  protected onViewReturn(request: ReturnRequestRow, event?: Event): void {
    event?.stopPropagation();
    if (this.detailMode) {
      return;
    }
    this.router.navigate(['/orders/returns', request.id]);
  }

  protected backToList(): void {
    this.router.navigate(['/orders', this.view()]);
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
          this.salesOrdersRaw = items.map((order) => this.mapSalesOrderRow(order));
          this.salesTotal = response.data?.pagination.total ?? this.salesOrdersRaw.length;
          this.applySalesFilters();
          this.isLoading = false;
          this.applyPendingSelection();
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
          this.rentOrdersRaw = items.map((order) => this.mapRentOrderRow(order));
          this.rentTotal = response.data?.pagination.total ?? this.rentOrdersRaw.length;
          this.applyRentFilters();
          this.isLoading = false;
          this.applyPendingSelection();
        },
        error: (error) => {
          console.error('Failed to load rent orders:', error);
          this.loadError = 'Unable to load rent orders';
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
          this.returnOrdersRaw = items.map((request) => this.mapReturnRequestRow(request));
          this.returnTotal = response.data?.pagination.total ?? this.returnOrdersRaw.length;
          this.applyReturnFilters();
          this.isLoading = false;
          this.applyPendingSelection();
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
          this.selectedId.set(response.data.rent_order_id ?? orderId);
          this.updateRentRow(response.data);
          this.hydrateRentDrafts(response.data);
          this.selectedRentProgressStep = this.resolveFlowStep(
            this.rentProgressFlow,
            response.data.rent_status,
            response.data.status_history,
          );
          this.rentDetailLoading = false;
        },
        error: (error) => {
          this.rentDetailLoading = false;
          this.rentDetailError = error?.error?.message || 'Unable to load rent order details';
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
          this.selectedId.set(response.data.order_id ?? orderId);
          this.updateSalesRow(response.data);
          this.hydrateSalesDrafts(response.data);
          this.selectedSalesProgressStep = this.resolveFlowStep(
            this.salesProgressFlow,
            response.data.order_status,
            response.data.status_history,
          );
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
          this.selectedId.set(response.data.return_id ?? returnId);
          this.updateReturnRow(response.data);
          this.hydrateReturnDrafts(response.data);
          this.selectedReturnProgressStep = this.resolveFlowStep(
            this.returnProgressFlow,
            response.data.status,
            response.data.status_history,
          );
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
    this.updateRentStatus(undefined, 'Confirm rent order', false, false, {
      confirmed_at: new Date().toISOString(),
    });
  }

  protected updateSalesStatus(
    nextStatus: OrderStatus,
    extraPayload?: {
      contact_channel?: ContactChannel | null;
      contacted_at?: string | null;
      shipping_provider?: string;
      tracking_code?: string;
      shipping_status?: ShippingStatus;
      shipping_status_detail?: string;
      shipping_method?: string | null;
      shipping_fee?: number;
      estimated_delivery_at?: string | null;
      cancel_reason?: string;
      admin_note?: string;
    },
    successMessage?: string,
  ): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;
    const currentStatus = this.selectedSalesDetail.order_status;
    if (currentStatus !== nextStatus && !this.canSalesTransitionTo(nextStatus)) {
      this.detailError = `Không thể chuyển từ ${currentStatus} sang ${nextStatus}`;
      this.notification.showError(this.detailError);
      return;
    }

    const payload: {
      order_status: OrderStatus;
      admin_note?: string;
      cancel_reason?: string;
      shipping_provider?: string;
      tracking_code?: string;
      shipping_status?: ShippingStatus;
      shipping_status_detail?: string;
      shipping_method?: string | null;
      shipping_fee?: number;
      estimated_delivery_at?: string | null;
      contact_channel?: ContactChannel | null;
      contacted_at?: string | null;
    } = {
      order_status: nextStatus,
      admin_note: this.adminNoteDraft?.trim() || '',
    };

    if (this.shippingStatusDetailDraft?.trim()) {
      payload.shipping_status_detail = this.shippingStatusDetailDraft.trim();
    }

    if (nextStatus === 'cancelled') {
      const cancelReason = extraPayload?.cancel_reason ?? this.cancelReasonDraft.trim();
      if (!cancelReason) {
        this.detailError = 'Vui lòng nhập lý do hủy đơn.';
        return;
      }
      payload.cancel_reason = cancelReason;
    }

    const shippingProvider = extraPayload?.shipping_provider ?? this.shippingProviderDraft.trim();
    const trackingCode = extraPayload?.tracking_code ?? this.trackingCodeDraft.trim();
    if (nextStatus === 'shipping') {
      if (!shippingProvider || !trackingCode) {
        this.detailError = 'Vui lòng nhập nhà vận chuyển và mã vận đơn.';
        return;
      }
      payload.shipping_provider = shippingProvider;
      payload.tracking_code = trackingCode;
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
            this.selectedSalesProgressStep = this.resolveFlowStep(
              this.salesProgressFlow,
              response.data.order_status,
              response.data.status_history,
            );
            if (this.salesToastOverride) {
              this.notification.showSuccess(this.salesToastOverride);
            } else if (this.shouldShowSalesNoteToast) {
              this.notification.showSuccess('Đã lưu ghi chú');
            } else {
              const message = successMessage || this.getSalesToastMessage(nextStatus);
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

  protected updatePaymentStatus(successMessage?: string): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;
    this.actionLoading = true;
    this.detailError = '';
    this.http
      .patch<ApiResponse<BuyOrderDetailApi>>(
        `${this.apiUrl}/buy-orders/${this.selectedSalesDetail.order_id}/payment-status`,
        {
          payment_status: this.paymentStatusDraft,
          payment_transaction_code: this.paymentTransactionCodeDraft || null,
        },
      )
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.selectedSalesDetail = response.data;
            this.hydrateSalesDrafts(response.data);
            this.updateSalesRow(response.data);
            this.selectedSalesProgressStep = this.resolveFlowStep(
              this.salesProgressFlow,
              response.data.order_status,
              response.data.status_history,
            );
            this.notification.showSuccess(successMessage || 'Đã cập nhật trạng thái thanh toán');
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

  protected applySalesPaymentSimulation(status: PaymentStatus): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;
    this.paymentStatusDraft = status;
    if (status === 'paid' && this.isOnlinePaymentMethod(this.selectedSalesDetail.payment_method)) {
      this.paymentTransactionCodeDraft =
        this.paymentTransactionCodeDraft || this.generatePaymentCode(this.selectedSalesDetail.payment_method);
    }
    if (status === 'unpaid' && this.isCodPaymentMethod(this.selectedSalesDetail.payment_method)) {
      this.paymentTransactionCodeDraft = '';
    }
    this.updatePaymentStatus(`Đã cập nhật thanh toán: ${this.paymentMeta[status].label}`);
  }

  protected simulateOnlinePaymentSuccess(): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;
    if (!this.isOnlinePaymentMethod(this.selectedSalesDetail.payment_method)) {
      this.notification.showInfo('Đơn COD sẽ được cập nhật thanh toán khi hoàn tất đơn.');
      return;
    }
    this.paymentStatusDraft = 'paid';
    this.paymentTransactionCodeDraft =
      this.paymentTransactionCodeDraft || this.generatePaymentCode(this.selectedSalesDetail.payment_method);
    this.updatePaymentStatus('Đã xác nhận thanh toán thành công');
  }

  protected simulateOnlinePaymentFailed(): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;
    if (!this.isOnlinePaymentMethod(this.selectedSalesDetail.payment_method)) {
      this.notification.showInfo('Đơn COD sẽ được cập nhật thanh toán khi hoàn tất đơn.');
      return;
    }
    this.paymentStatusDraft = 'failed';
    this.updatePaymentStatus('Đã cập nhật trạng thái thanh toán thất bại');
  }

  protected updateSalesTrackingInfo(successMessage?: string): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;
    const provider = this.resolveShipmentProvider(this.shippingProviderDraft);
    const trackingCode = String(this.trackingCodeDraft || '').trim();
    if (!provider || !trackingCode) {
      this.detailError = 'Vui lòng chọn đơn vị vận chuyển và tạo mã vận đơn.';
      this.notification.showError(this.detailError);
      return;
    }

    const shippingFee = this.parseNumber(this.shippingFeeDraft);
    this.actionLoading = true;
    this.detailError = '';
    this.http
      .patch<ApiResponse<BuyOrderDetailApi>>(
        `${this.apiUrl}/buy-orders/${this.selectedSalesDetail.order_id}/tracking`,
        {
          shipping_provider: provider,
          tracking_code: trackingCode,
          shipping_status: this.shippingStatusDraft,
          shipping_status_detail: this.shippingStatusDetailDraft || null,
          shipping_method: this.shippingMethodDraft || null,
          shipping_fee: shippingFee ?? 0,
          estimated_delivery_at: this.estimatedDeliveryAtDraft || null,
        },
      )
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.selectedSalesDetail = response.data;
            this.hydrateSalesDrafts(response.data);
            this.updateSalesRow(response.data);
            this.selectedSalesProgressStep = this.resolveFlowStep(
              this.salesProgressFlow,
              response.data.order_status,
              response.data.status_history,
            );
            this.notification.showSuccess(successMessage || 'Đã cập nhật thông tin vận chuyển');
          }
        },
        error: (error) => {
          this.detailError = error?.error?.message || 'Không thể cập nhật thông tin vận chuyển';
          this.notification.showError(this.detailError);
        },
        complete: () => {
          this.actionLoading = false;
        },
      });
  }

  protected createSalesTrackingCodeOnly(): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;
    this.shippingProviderDraft = this.resolveShipmentProvider(this.shippingProviderDraft);
    this.trackingCodeDraft = this.generateSalesTrackingCode(
      this.shippingProviderDraft,
      this.selectedSalesDetail.order_code,
    );
    this.shippingStatusDraft = 'ready_to_ship';
    this.trackingCreatedAtDraft = new Date().toISOString();
    if (!this.estimatedDeliveryAtDraft) {
      this.estimatedDeliveryAtDraft = this.estimateDeliveryDateIso(this.shippingMethodDraft);
    }
    if (!this.shippingStatusDetailDraft) {
      this.shippingStatusDetailDraft = 'Đã tạo mã vận đơn';
    }
    this.updateSalesTrackingInfo('Đã tạo mã vận đơn');
  }

  protected markSalesHandoverToCarrier(): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;
    if (this.selectedSalesDetail.order_status !== 'processing') {
      this.detailError = 'Chỉ được bàn giao vận chuyển khi đơn ở bước processing.';
      this.notification.showError(this.detailError);
      return;
    }
    if (!this.trackingCodeDraft.trim()) {
      this.detailError = 'Vui lòng tạo mã vận đơn trước khi bàn giao.';
      this.notification.showError(this.detailError);
      return;
    }
    this.shippingStatusDraft = 'shipped';
    this.updateSalesStatus(
      'shipping',
      {
        shipping_provider: this.resolveShipmentProvider(this.shippingProviderDraft),
        tracking_code: this.trackingCodeDraft.trim(),
        shipping_status: 'shipped',
        shipping_status_detail: this.shippingStatusDetailDraft || 'Đã bàn giao cho đơn vị vận chuyển',
        shipping_method: this.shippingMethodDraft || null,
        shipping_fee: this.parseNumber(this.shippingFeeDraft) ?? 0,
        estimated_delivery_at: this.estimatedDeliveryAtDraft || null,
      },
      'Đã bàn giao đơn cho đơn vị vận chuyển',
    );
  }

  protected markSalesDelivered(): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;
    this.updateSalesStatus(
      'completed',
      {
        shipping_status: 'delivered',
        shipping_status_detail: this.shippingStatusDetailDraft || 'Đã giao hàng thành công',
      },
      'Đã đánh dấu giao hàng thành công',
    );
  }

  protected markSalesDeliveryFailed(): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;
    this.updateSalesStatus(
      'processing',
      {
        shipping_status: 'delivery_failed',
        shipping_status_detail: this.shippingStatusDetailDraft || 'Giao hàng thất bại',
      },
      'Đã đánh dấu giao thất bại và chuyển lại xử lý',
    );
  }

  protected applyRentPaymentSimulation(status: PaymentStatus): void {
    if (!this.selectedRentDetail || this.rentActionLoading) return;
    this.rentPaymentStatusDraft = status;
    this.updateRentStatus(undefined, 'Cập nhật thanh toán mô phỏng');
  }

  protected createSalesShipmentAndMove(): void {
    if (!this.selectedSalesDetail || this.actionLoading) return;
    const provider = this.resolveShipmentProvider(this.shippingProviderDraft);
    const trackingCode = this.generateTrackingCode('SLS');
    const shipmentNote = `Vận đơn tạo lúc ${this.formatDateTime(new Date().toISOString())}`;

    this.shippingProviderDraft = provider;
    this.trackingCodeDraft = trackingCode;
    this.shippingStatusDraft = 'ready_to_ship';
    this.shippingStatusDetailDraft = shipmentNote;
    this.updateSalesTrackingInfo('Đã tạo vận đơn');
  }

  protected createRentShipmentOutDemo(): void {
    if (!this.selectedRentDetail || this.rentActionLoading) return;
    this.shippingOutProviderDraft = this.resolveShipmentProvider(this.shippingOutProviderDraft);
    this.shippingOutTrackingDraft = this.generateTrackingCode('RNTOUT');
    this.updateRentStatus(undefined, 'Tạo vận đơn giao mô phỏng');
  }

  protected createRentShipmentBackDemo(moveToReturnRequested = false): void {
    if (!this.selectedRentDetail || this.rentActionLoading) return;
    this.shippingBackProviderDraft = this.resolveShipmentProvider(this.shippingBackProviderDraft);
    this.shippingBackTrackingDraft = this.generateTrackingCode('RNTBACK');
    if (moveToReturnRequested && this.canRentTransitionTo('return_requested')) {
      this.updateRentStatus('return_requested', 'Tạo mã vận đơn trả mô phỏng');
      return;
    }
    this.updateRentStatus(undefined, 'Tạo mã vận đơn trả mô phỏng');
  }

  protected createReturnShipmentDemoAndMove(): void {
    if (!this.selectedReturnDetail || this.returnActionLoading) return;
    this.returnShippingProviderDraft = this.resolveShipmentProvider(this.returnShippingProviderDraft);
    this.returnShippingTrackingDraft = this.generateTrackingCode('RET');
    if (this.canReturnTransitionTo('awaiting_return_shipment')) {
      this.updateReturnStatus('awaiting_return_shipment', 'Tạo mã vận đơn trả mô phỏng');
      return;
    }
    this.updateReturnStatus(undefined, 'Tạo mã vận đơn trả mô phỏng');
  }

  protected viewCurrentSalesShipment(): void {
    const provider = this.selectedSalesDetail?.shipping_provider || this.shippingProviderDraft || '-';
    const tracking = this.selectedSalesDetail?.tracking_code || this.trackingCodeDraft || '-';
    this.notification.showInfo(`Vận đơn hiện tại: ${provider} - ${tracking}`);
  }

  protected viewCurrentRentShipmentBack(): void {
    const provider =
      this.selectedRentDetail?.shipping_back?.provider || this.shippingBackProviderDraft || '-';
    const tracking =
      this.selectedRentDetail?.shipping_back?.tracking_code || this.shippingBackTrackingDraft || '-';
    this.notification.showInfo(`Vận đơn trả: ${provider} - ${tracking}`);
  }

  protected viewCurrentReturnShipment(): void {
    const provider =
      this.selectedReturnDetail?.return_shipping?.provider || this.returnShippingProviderDraft || '-';
    const tracking =
      this.selectedReturnDetail?.return_shipping?.tracking_code || this.returnShippingTrackingDraft || '-';
    this.notification.showInfo(`Vận đơn hoàn trả: ${provider} - ${tracking}`);
  }

  protected viewCurrentReturnReceipt(): void {
    const receipt = this.selectedReturnDetail?.refund?.receipt_url || this.returnReceiptUrlDraft || '-';
    this.notification.showInfo(`Biên nhận hoàn tiền: ${receipt}`);
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
            this.selectedRentProgressStep = this.resolveFlowStep(
              this.rentProgressFlow,
              response.data.rent_status,
              response.data.status_history,
            );
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
          this.rentDetailError = error?.error?.message || 'Unable to update rent order';
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
            this.selectedReturnProgressStep = this.resolveFlowStep(
              this.returnProgressFlow,
              response.data.status,
              response.data.status_history,
            );
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
      shipping: 'Đã tạo vận đơn và chuyển sang đang giao',
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
        'Confirm rent order': 'Rent order confirmed',
        'Tạo vận đơn giao': 'Đã tạo vận đơn giao',
        'Tạo vận đơn giao mô phỏng': 'Đã tạo vận đơn giao mô phỏng',
        'Tạo mã vận đơn trả': 'Đã tạo mã vận đơn trả',
        'Tạo mã vận đơn trả mô phỏng': 'Đã tạo mã vận đơn trả mô phỏng',
        'Đã liên hệ': 'Đã ghi nhận liên hệ',
        'Gửi nhắc nhở khách': 'Đã gửi nhắc nhở',
        'Cập nhật vi phạm': 'Đã lưu phí vi phạm',
        'Cập nhật thanh toán mô phỏng': 'Đã cập nhật thanh toán mô phỏng',
      };
      if (logMap[logNote]) return logMap[logNote];
      return `Đã ${logNote.toLowerCase()}`;
    }
    if (!status) return 'Rent order updated';
    const statusMap: Record<RentStatus, string> = {
      booked: 'Rent order updated',
      ongoing: 'Đã đánh dấu đã giao',
      return_requested: 'Đã tạo mã vận đơn trả',
      returning: 'Rent order updated',
      returned: 'Đã đánh dấu shop đã nhận',
      closed: 'Đã hoàn cọc & chốt đơn',
      cancelled: 'Rent order cancelled',
      violated: 'Đã chuyển vi phạm',
    };
    return statusMap[status] || 'Rent order updated';
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
    this.shippingMethodDraft = order.shipping_method ?? '';
    this.shippingFeeDraft =
      order.shipping_fee !== undefined && order.shipping_fee !== null ? `${order.shipping_fee}` : '';
    this.shippingStatusDraft = this.resolveShippingStatus(order);
    this.trackingCodeDraft = order.tracking_code ?? '';
    this.trackingCreatedAtDraft = order.tracking_created_at ?? '';
    this.estimatedDeliveryAtDraft = order.estimated_delivery_at ?? '';
    this.shippingStatusDetailDraft = order.shipping_status_detail ?? '';
    this.paymentStatusDraft = order.payment_status ?? 'unpaid';
    this.paymentTransactionCodeDraft = order.payment_transaction_code ?? '';
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

  private mapSalesOrderRow(order: BuyOrderApi | BuyOrderDetailApi): SalesOrder {
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
      updatedAt: this.formatDate(order.updated_at ?? order.created_at),
      guestId: order.guest_id ?? null,
      userId: order.user_id ?? null,
      isGuest,
      contactChannel: order.contact_channel ?? null,
      contactedAt: order.contacted_at ?? null,
    };
  }

  private mapRentOrderRow(order: RentOrderApi | RentOrderDetailApi): RentOrder {
    const isGuest = Boolean(order.guest_id);
    return {
      id: order.rent_order_id ?? order.rent_order_code,
      code: order.rent_order_code ?? order.rent_order_id,
      customer: order.customer_info?.full_name ?? '-',
      phone: order.customer_info?.phone ?? '-',
      period: this.formatPeriod(order.rental_period?.start_date, order.rental_period?.end_date),
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
        order.shipping_out?.provider ?? order.shipping?.shipping_provider ?? null,
        order.shipping_out?.tracking_code ?? order.shipping?.tracking_code ?? null,
      ),
      createdAt: this.formatDate(order.created_at),
      guestId: order.guest_id ?? null,
      userId: order.user_id ?? null,
      isGuest,
      contactChannel: order.contact_channel ?? null,
      contactedAt: order.contacted_at ?? null,
      confirmedAt: order.confirmed_at ?? null,
    };
  }

  private mapReturnRequestRow(request: ReturnRequestApi): ReturnRequestRow {
    return {
      id: request.return_id ?? request.order_id,
      code: request.return_id ?? '-',
      orderCode: request.order_code ?? request.order_id ?? '-',
      status: request.status ?? 'submitted',
      amount: this.formatCurrency(request.total_amount ?? 0),
      requestedAt: this.formatDate(request.requested_at ?? request.created_at),
    };
  }

  private upsertRow<T extends { id: string }>(items: T[], nextRow: T): T[] {
    const index = items.findIndex((item) => item.id === nextRow.id);
    if (index === -1) {
      return [nextRow, ...items];
    }

    return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...nextRow } : item));
  }

  private updateSalesRow(order: BuyOrderDetailApi): void {
    const nextRow = this.mapSalesOrderRow(order);
    this.salesOrdersRaw = this.upsertRow(this.salesOrdersRaw, nextRow);
    this.salesOrders = this.upsertRow(this.salesOrders, nextRow);
  }

  private updateRentRow(order: RentOrderDetailApi): void {
    const nextRow = this.mapRentOrderRow(order);
    this.rentOrdersRaw = this.upsertRow(this.rentOrdersRaw, nextRow);
    this.rentOrders = this.upsertRow(this.rentOrders, nextRow);
  }

  private updateReturnRow(request: ReturnRequestApi): void {
    const nextRow = this.mapReturnRequestRow(request);
    this.returnOrdersRaw = this.upsertRow(this.returnOrdersRaw, nextRow);
    this.returnOrders = this.upsertRow(this.returnOrders, nextRow);
  }

  private applyPendingSelection(): void {
    if (!this.detailMode) {
      return;
    }

    if (this.view() === 'sales' && this.pendingSalesOrderId) {
      const orderId = this.pendingSalesOrderId;
      this.pendingSalesOrderId = null;
      this.selectOrder(orderId);
      return;
    }

    if (this.view() === 'rent' && this.pendingRentOrderId) {
      const orderId = this.pendingRentOrderId;
      this.pendingRentOrderId = null;
      this.selectOrder(orderId);
      return;
    }

    if (this.view() === 'returns' && this.pendingReturnRequestId) {
      const requestId = this.pendingReturnRequestId;
      this.pendingReturnRequestId = null;
      this.selectOrder(requestId);
    }
  }

  private hasLoadedViewData(): boolean {
    if (this.view() === 'sales') {
      return this.salesOrdersRaw.length > 0 || !!this.selectedSalesDetail;
    }

    if (this.view() === 'rent') {
      return this.rentOrdersRaw.length > 0 || !!this.selectedRentDetail;
    }

    return this.returnOrdersRaw.length > 0 || !!this.selectedReturnDetail;
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
    this.refreshOrders();
  }

  protected refreshOrders(): void {
    this.loadError = '';
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
    if (this.detailMode) {
      this.syncSelectedSales();
    } else {
      this.selectedId.set(null);
      this.selectedSalesDetail = null;
      this.selectedSalesProgressStep = null;
    }
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
    if (this.detailMode) {
      this.syncSelectedRent();
    } else {
      this.selectedId.set(null);
      this.selectedRentDetail = null;
      this.selectedRentProgressStep = null;
    }
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
    if (this.detailMode) {
      this.syncSelectedReturn();
    } else {
      this.selectedId.set(null);
      this.selectedReturnDetail = null;
      this.selectedReturnProgressStep = null;
    }
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
      this.selectedSalesProgressStep = null;
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
      this.selectedRentProgressStep = null;
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
      this.selectedReturnProgressStep = null;
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

  protected salesProgressLabel(status: OrderStatus): string {
    return this.orderStatusMeta[status]?.label ?? status;
  }

  protected rentProgressLabel(status: RentStatus): string {
    return this.rentStatusMeta[status]?.label ?? status;
  }

  protected returnProgressLabel(status: ReturnStatus): string {
    return this.returnStatusMeta[status]?.label ?? status;
  }

  protected isShipmentCarrierOption(value?: string | null): boolean {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return false;
    return this.shipmentCarrierOptions.some((carrier) => carrier.label.toLowerCase() === normalized);
  }

  protected salesShippingStatusMeta(order?: BuyOrderDetailApi | null): { label: string; class: string } {
    const status = this.resolveShippingStatus(order);
    return this.shippingStatusMeta[status];
  }

  protected paymentMethodLabel(method?: string | null): string {
    const normalized = String(method || '').trim().toLowerCase();
    if (normalized === 'cod') return 'COD';
    if (normalized === 'vnpay') return 'VNPAY';
    if (normalized === 'momo') return 'MoMo';
    if (normalized === 'bank_transfer') return 'Visa/Chuyển khoản';
    return normalized ? normalized.toUpperCase() : '-';
  }

  protected shippingMethodLabel(method?: string | null): string {
    const normalized = String(method || '').trim().toLowerCase();
    if (normalized === 'express' || normalized === 'nhanh') return 'Nhanh';
    if (normalized === 'standard' || normalized === 'tieu_chuan' || normalized === 'tiêu chuẩn') {
      return 'Tiêu chuẩn';
    }
    return normalized ? normalized : '-';
  }

  protected estimatedDeliveryLabel(): string {
    if (this.estimatedDeliveryAtDraft) {
      return this.formatDateTime(this.estimatedDeliveryAtDraft);
    }
    if (this.shippingMethodLabel(this.shippingMethodDraft) === 'Nhanh') {
      return '1-2 ngày';
    }
    if (this.shippingMethodLabel(this.shippingMethodDraft) === 'Tiêu chuẩn') {
      return '3-5 ngày';
    }
    return '-';
  }

  protected isCodPaymentMethod(method?: string | null): boolean {
    return String(method || '').trim().toLowerCase() === 'cod';
  }

  protected isOnlinePaymentMethod(method?: string | null): boolean {
    const normalized = String(method || '').trim().toLowerCase();
    return normalized === 'vnpay' || normalized === 'momo' || normalized === 'bank_transfer';
  }

  protected canEditSalesPayment(order?: BuyOrderDetailApi | null): boolean {
    if (!order) return false;
    if (!this.isOnlinePaymentMethod(order.payment_method)) return false;
    return order.order_status !== 'completed' && order.order_status !== 'cancelled';
  }

  protected selectSalesProgressStep(step: OrderStatus): void {
    this.selectedSalesProgressStep = step;
  }

  protected selectRentProgressStep(step: RentStatus): void {
    this.selectedRentProgressStep = step;
  }

  protected selectReturnProgressStep(step: ReturnStatus): void {
    this.selectedReturnProgressStep = step;
  }

  protected salesFocusedStep(): OrderStatus {
    return (
      this.selectedSalesProgressStep ??
      this.resolveFlowStep(
        this.salesProgressFlow,
        this.selectedSalesDetail?.order_status,
        this.selectedSalesDetail?.status_history,
      )
    );
  }

  protected rentFocusedStep(): RentStatus {
    return (
      this.selectedRentProgressStep ??
      this.resolveFlowStep(
        this.rentProgressFlow,
        this.selectedRentDetail?.rent_status,
        this.selectedRentDetail?.status_history,
      )
    );
  }

  protected returnFocusedStep(): ReturnStatus {
    return (
      this.selectedReturnProgressStep ??
      this.resolveFlowStep(
        this.returnProgressFlow,
        this.selectedReturnDetail?.status,
        this.selectedReturnDetail?.status_history,
      )
    );
  }

  protected salesCurrentStepLabel(): string {
    return this.salesProgressLabel(this.salesFocusedStep());
  }

  protected rentCurrentStepLabel(): string {
    return this.rentProgressLabel(this.rentFocusedStep());
  }

  protected returnCurrentStepLabel(): string {
    return this.returnProgressLabel(this.returnFocusedStep());
  }

  protected salesStepFieldHints(): string[] {
    const status = this.salesFocusedStep();
    switch (status) {
      case 'pending':
        return ['Xác minh thông tin khách', 'Kiểm tra sản phẩm', 'Ra quyết định đơn'];
      case 'confirmed':
        return ['Đã xác nhận', 'Chuẩn bị xử lý', 'Cập nhật thanh toán'];
      case 'processing':
        return ['Đóng gói sản phẩm', 'Tạo vận đơn', 'Chuyển sang đang giao'];
      case 'shipping':
        return ['Theo dõi vận chuyển', 'Cập nhật giao hàng', 'Xác nhận hoàn thành'];
      case 'completed':
        return ['Đơn đã hoàn tất', 'Đối soát thanh toán', 'Lưu lịch sử'];
      case 'cancelled':
        return ['Đơn đã hủy', 'Lý do hủy đơn', 'Lưu lịch sử'];
      default:
        return [];
    }
  }

  protected rentStepFieldHints(): string[] {
    const status = this.rentFocusedStep();
    switch (status) {
      case 'booked':
        return ['Confirm rent order', 'Create outbound shipment', 'Prepare handover'];
      case 'ongoing':
        return ['Theo dõi thời gian thuê', 'Xử lý yêu cầu trả', 'Cập nhật trạng thái'];
      case 'return_requested':
        return ['Tạo vận đơn trả', 'Nhắc khách gửi hàng', 'Chuẩn bị nhận hàng'];
      case 'returning':
        return ['Theo dõi hàng trả', 'Xác nhận shop đã nhận', 'Kiểm tra tình trạng'];
      case 'returned':
        return ['Tính phí phát sinh', 'Tính tiền hoàn cọc', 'Chốt hoàn tiền'];
      case 'closed':
        return ['Đơn đã hoàn tất', 'Đối soát công nợ', 'Lưu lịch sử'];
      case 'cancelled':
        return ['Đơn đã hủy', 'Lý do hủy đơn', 'Lưu lịch sử'];
      case 'violated':
        return ['Xác nhận vi phạm', 'Cập nhật phí phạt', 'Chốt đơn'];
      default:
        return [];
    }
  }

  protected returnStepFieldHints(): string[] {
    const status = this.returnFocusedStep();
    switch (status) {
      case 'submitted':
        return ['Tiếp nhận yêu cầu', 'Xác minh lý do trả', 'Phản hồi khách'];
      case 'need_more_info':
        return ['Chờ khách bổ sung', 'Kiểm tra thông tin', 'Duyệt lại yêu cầu'];
      case 'approved':
        return ['Duyệt hoàn trả', 'Tạo vận đơn trả', 'Thông báo khách'];
      case 'awaiting_return_shipment':
        return ['Chờ khách gửi hàng', 'Theo dõi mã vận đơn', 'Nhắc khách nếu cần'];
      case 'return_in_transit':
        return ['Theo dõi vận chuyển', 'Xác nhận đã nhận hàng', 'Chuẩn bị kiểm tra'];
      case 'received_inspecting':
        return ['Kiểm tra sản phẩm', 'Tính số tiền hoàn', 'Xác nhận hoàn tiền'];
      case 'refund_processing':
        return ['Đang hoàn tiền', 'Cập nhật biên nhận', 'Chuyển đã hoàn tiền'];
      case 'refunded':
        return ['Đã hoàn tiền', 'Đối soát chứng từ', 'Đóng yêu cầu'];
      case 'closed':
        return ['Yêu cầu đã hoàn tất', 'Lưu lịch sử', 'Kết thúc xử lý'];
      default:
        return [];
    }
  }

  protected salesStepPrimaryActionLabel(): string {
    switch (this.salesFocusedStep()) {
      case 'pending':
        return 'Xác nhận đơn';
      case 'confirmed':
        return 'Bắt đầu xử lý';
      case 'processing':
        return 'Tạo mã vận đơn';
      case 'shipping':
        return 'Xác nhận hoàn thành';
      default:
        return '';
    }
  }

  protected rentStepPrimaryActionLabel(): string {
    switch (this.rentFocusedStep()) {
      case 'booked':
        return 'Xác nhận bắt đầu thuê';
      case 'ongoing':
        return 'Tạo mã vận đơn trả';
      case 'return_requested':
        return 'Gửi nhắc nhở khách';
      case 'returning':
        return 'Xác nhận shop đã nhận';
      case 'returned':
        return 'Hoàn cọc & chốt đơn';
      default:
        return '';
    }
  }

  protected returnStepPrimaryActionLabel(): string {
    switch (this.returnFocusedStep()) {
      case 'submitted':
        return 'Duyệt yêu cầu';
      case 'need_more_info':
        return 'Tiếp tục duyệt';
      case 'approved':
        return 'Tạo mã vận đơn trả';
      case 'awaiting_return_shipment':
        return 'Đánh dấu đã nhận mã vận đơn';
      case 'return_in_transit':
        return 'Xác nhận đã nhận hàng';
      case 'received_inspecting':
        return 'Xác nhận hoàn tiền';
      case 'refund_processing':
        return 'Đánh dấu đã hoàn tiền';
      case 'refunded':
        return 'Đóng yêu cầu';
      default:
        return '';
    }
  }

  protected canRunSalesStepAction(): boolean {
    if (!this.selectedSalesDetail || this.actionLoading) return false;
    const focused = this.salesFocusedStep();
    const current = this.resolveFlowStep(
      this.salesProgressFlow,
      this.selectedSalesDetail.order_status,
      this.selectedSalesDetail.status_history,
    );
    if (focused !== current) return false;

    const target = this.getSalesStepActionTarget(focused);
    if (!target || !this.canSalesTransitionTo(target)) return false;
    if (
      focused === 'shipping' &&
      !this.selectedSalesDetail.customer_received_at &&
      !this.selectedSalesDetail.guest_id
    ) {
      return false;
    }
    return true;
  }

  protected canRunRentStepAction(): boolean {
    if (!this.selectedRentDetail || this.rentActionLoading) return false;
    const focused = this.rentFocusedStep();
    const current = this.resolveFlowStep(
      this.rentProgressFlow,
      this.selectedRentDetail.rent_status,
      this.selectedRentDetail.status_history,
    );
    if (focused !== current) return false;

    if (focused === 'return_requested') return true;

    const target = this.getRentStepActionTarget(focused);
    return Boolean(target && this.canRentTransitionTo(target));
  }

  protected canRunReturnStepAction(): boolean {
    if (!this.selectedReturnDetail || this.returnActionLoading) return false;
    const focused = this.returnFocusedStep();
    const current = this.resolveFlowStep(
      this.returnProgressFlow,
      this.selectedReturnDetail.status,
      this.selectedReturnDetail.status_history,
    );
    if (focused !== current) return false;

    const target = this.getReturnStepActionTarget(focused);
    return Boolean(target && this.canReturnTransitionTo(target));
  }

  protected runSalesStepAction(): void {
    if (!this.canRunSalesStepAction()) {
      if (
        this.salesFocusedStep() === 'shipping' &&
        !this.selectedSalesDetail?.customer_received_at &&
        !this.selectedSalesDetail?.guest_id
      ) {
        this.notification.showInfo('Chờ khách hàng bấm "Đã nhận hàng" để admin xác nhận hoàn thành.');
        return;
      }
      this.notification.showInfo('Chỉ thao tác ở bước hiện tại theo đúng trình tự.');
      return;
    }
    const focused = this.salesFocusedStep();
    if (focused === 'processing') {
      this.createSalesShipmentAndMove();
      return;
    }
    const target = this.getSalesStepActionTarget(focused);
    if (!target) return;
    this.updateSalesStatus(target);
  }

  protected runRentStepAction(): void {
    if (!this.canRunRentStepAction()) {
      this.notification.showInfo('Chỉ thao tác ở bước hiện tại theo đúng trình tự.');
      return;
    }
    const focused = this.rentFocusedStep();
    if (focused === 'return_requested') {
      this.updateRentStatus(undefined, 'Gửi nhắc nhở khách', true);
      return;
    }
    if (focused === 'ongoing') {
      this.createRentShipmentBackDemo(true);
      return;
    }
    const target = this.getRentStepActionTarget(focused);
    if (!target) return;
    if (target === 'return_requested') {
      this.createRentShipmentBackDemo(true);
      return;
    }
    this.updateRentStatus(target);
  }

  protected runReturnStepAction(): void {
    if (!this.canRunReturnStepAction()) {
      this.notification.showInfo('Chỉ thao tác ở bước hiện tại theo đúng trình tự.');
      return;
    }
    const focused = this.returnFocusedStep();
    if (focused === 'approved') {
      this.createReturnShipmentDemoAndMove();
      return;
    }
    const target = this.getReturnStepActionTarget(focused);
    if (!target) return;
    this.updateReturnStatus(target, this.returnStepPrimaryActionLabel());
  }

  private getSalesStepActionTarget(step: OrderStatus): OrderStatus | null {
    if (step === 'pending') return 'confirmed';
    if (step === 'confirmed') return 'processing';
    if (step === 'processing') return 'shipping';
    if (step === 'shipping') return 'completed';
    return null;
  }

  private getRentStepActionTarget(step: RentStatus): RentStatus | null {
    if (step === 'booked') return 'ongoing';
    if (step === 'ongoing') return 'return_requested';
    if (step === 'returning') return 'returned';
    if (step === 'returned') return 'closed';
    return null;
  }

  private getReturnStepActionTarget(step: ReturnStatus): ReturnStatus | null {
    if (step === 'submitted') return 'approved';
    if (step === 'need_more_info') return 'approved';
    if (step === 'approved') return 'awaiting_return_shipment';
    if (step === 'awaiting_return_shipment') return 'return_in_transit';
    if (step === 'return_in_transit') return 'received_inspecting';
    if (step === 'received_inspecting') return 'refund_processing';
    if (step === 'refund_processing') return 'refunded';
    if (step === 'refunded') return 'closed';
    return null;
  }

  private canSalesTransitionTo(next: OrderStatus): boolean {
    const current = this.selectedSalesDetail?.order_status;
    if (!current) return false;
    return (this.salesTransitions[current] || []).includes(next);
  }

  private canRentTransitionTo(next: RentStatus): boolean {
    const current = this.selectedRentDetail?.rent_status;
    if (!current) return false;
    return (this.rentTransitions[current] || []).includes(next);
  }

  private canReturnTransitionTo(next: ReturnStatus): boolean {
    const current = this.selectedReturnDetail?.status;
    if (!current) return false;
    return (this.returnTransitions[current] || []).includes(next);
  }

  protected salesProgressPercent(): number {
    return this.getProgressPercent(this.salesProgressFlow.length, this.getSalesProgressIndex());
  }

  protected salesPaymentProgressPercent(order?: BuyOrderDetailApi | null): number {
    const status = order?.payment_status ?? 'unpaid';
    if (status === 'paid' || status === 'refunded') return 100;
    if (status === 'partial') return 62;
    if (status === 'failed') return 24;
    return 10;
  }

  protected salesShippingProgressPercent(order?: BuyOrderDetailApi | null): number {
    const status = this.resolveShippingStatus(order);
    if (status === 'delivered') return 100;
    if (status === 'shipped') return 74;
    if (status === 'ready_to_ship') return 46;
    if (status === 'delivery_failed') return 35;
    return 12;
  }

  protected rentPaymentProgressPercent(order?: RentOrderDetailApi | null): number {
    const status = order?.payment?.payment_status ?? 'unpaid';
    if (status === 'paid' || status === 'refunded') return 100;
    if (status === 'partial') return 62;
    if (status === 'failed') return 24;
    return 10;
  }

  protected rentShippingProgressPercent(order?: RentOrderDetailApi | null): number {
    const status = order?.rent_status;
    const hasOutboundTracking = Boolean(
      order?.shipping_out?.tracking_code || order?.shipping_out?.provider || order?.shipping?.tracking_code,
    );
    const hasReturnTracking = Boolean(order?.shipping_back?.tracking_code || order?.shipping_back?.provider);

    if (!status) return 10;
    if (status === 'closed') return 100;
    if (status === 'returned') return hasReturnTracking ? 88 : 80;
    if (status === 'returning') return hasReturnTracking ? 74 : 66;
    if (status === 'return_requested') return hasReturnTracking ? 60 : 52;
    if (status === 'ongoing') return hasOutboundTracking ? 46 : 38;
    if (status === 'booked') return hasOutboundTracking ? 24 : 14;
    if (status === 'violated') return 68;
    if (status === 'cancelled') return 0;
    return 10;
  }

  protected rentProgressPercent(): number {
    return this.getProgressPercent(this.rentProgressFlow.length, this.getRentProgressIndex());
  }

  protected returnProgressPercent(): number {
    return this.getProgressPercent(this.returnProgressFlow.length, this.getReturnProgressIndex());
  }

  protected isSalesProgressDone(index: number): boolean {
    return this.getSalesProgressIndex() >= index;
  }

  protected isSalesProgressCurrent(index: number): boolean {
    return this.salesProgressFlow[index] === this.salesFocusedStep();
  }

  protected isRentProgressDone(index: number): boolean {
    return this.getRentProgressIndex() >= index;
  }

  protected isRentProgressCurrent(index: number): boolean {
    return this.rentProgressFlow[index] === this.rentFocusedStep();
  }

  protected isReturnProgressDone(index: number): boolean {
    return this.getReturnProgressIndex() >= index;
  }

  protected isReturnProgressCurrent(index: number): boolean {
    return this.returnProgressFlow[index] === this.returnFocusedStep();
  }

  protected salesProgressTime(status: OrderStatus): string {
    const order = this.selectedSalesDetail;
    if (!order) return '-';

    const explicitTimestamp: Partial<Record<OrderStatus, string | null | undefined>> = {
      pending: order.created_at,
      confirmed: order.confirmed_at,
      processing: order.processing_at,
      shipping: order.shipped_at,
      completed: order.customer_received_at || order.delivered_at,
      cancelled: order.cancelled_at,
    };

    const timestamp =
      explicitTimestamp[status] || this.getStatusHistoryTimestamp(order.status_history, status);
    return this.formatDateTime(timestamp);
  }

  protected rentProgressTime(status: RentStatus): string {
    const order = this.selectedRentDetail;
    if (!order) return '-';

    const explicitTimestamp: Partial<Record<RentStatus, string | null | undefined>> = {
      booked: order.created_at,
      ongoing: order.confirmed_at || order.shipping_out?.delivered_at,
      return_requested: order.return_request?.requested_at,
      returning: order.shipping_back?.shipped_at,
      returned: order.shipping_back?.delivered_at,
      closed: order.settlement?.refunded_at,
      cancelled: null,
      violated: null,
    };

    const timestamp =
      explicitTimestamp[status] || this.getStatusHistoryTimestamp(order.status_history, status);
    return this.formatDateTime(timestamp);
  }

  protected returnProgressTime(status: ReturnStatus): string {
    const request = this.selectedReturnDetail;
    if (!request) return '-';

    const explicitTimestamp: Partial<Record<ReturnStatus, string | null | undefined>> = {
      submitted: request.requested_at || request.created_at,
      need_more_info: null,
      approved: null,
      awaiting_return_shipment:
        request.return_shipping?.created_at || request.return_shipping?.received_label_at,
      return_in_transit: request.return_shipping?.shipped_at,
      received_inspecting: request.return_shipping?.received_at,
      refund_processing: null,
      refunded: request.refund?.processed_at,
      closed: request.updated_at,
    };

    const timestamp =
      explicitTimestamp[status] || this.getStatusHistoryTimestamp(request.status_history, status);
    return this.formatDateTime(timestamp);
  }

  protected isGuestSalesDetail(): boolean {
    return Boolean(this.selectedSalesDetail?.guest_id);
  }

  protected isGuestRentDetail(): boolean {
    return Boolean(this.selectedRentDetail?.guest_id);
  }

  protected showRentSettlementSection(): boolean {
    const status = this.selectedRentDetail?.rent_status;
    return status === 'returning' || status === 'returned' || status === 'violated' || status === 'closed';
  }

  protected showRentRefundSection(): boolean {
    const status = this.selectedRentDetail?.rent_status;
    return status === 'returned' || status === 'violated' || status === 'closed';
  }

  protected showRentActionSection(): boolean {
    const status = this.selectedRentDetail?.rent_status;
    return (
      status === 'booked' ||
      status === 'ongoing' ||
      status === 'return_requested' ||
      status === 'returning' ||
      status === 'returned' ||
      status === 'violated'
    );
  }

  protected showRentCancelReasonField(): boolean {
    const status = this.selectedRentDetail?.rent_status;
    return status === 'booked' || status === 'ongoing' || status === 'return_requested' || status === 'cancelled';
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

  private getSalesProgressIndex(): number {
    return this.getProgressIndex(
      this.salesProgressFlow,
      this.selectedSalesDetail?.order_status,
      this.selectedSalesDetail?.status_history,
    );
  }

  private getRentProgressIndex(): number {
    return this.getProgressIndex(
      this.rentProgressFlow,
      this.selectedRentDetail?.rent_status,
      this.selectedRentDetail?.status_history,
    );
  }

  private getReturnProgressIndex(): number {
    return this.getProgressIndex(
      this.returnProgressFlow,
      this.selectedReturnDetail?.status,
      this.selectedReturnDetail?.status_history,
    );
  }

  private isSalesTerminalStatus(): boolean {
    return this.selectedSalesDetail?.order_status === 'cancelled';
  }

  private isRentTerminalStatus(): boolean {
    const status = this.selectedRentDetail?.rent_status;
    return status === 'cancelled' || status === 'violated';
  }

  private getProgressPercent(totalSteps: number, activeIndex: number): number {
    if (totalSteps <= 0 || activeIndex < 0) {
      return 0;
    }
    return Math.round(((activeIndex + 1) / totalSteps) * 100);
  }

  private getProgressIndex<TStatus extends string>(
    flow: readonly TStatus[],
    currentStatus?: string | null,
    history?: StatusHistory[],
  ): number {
    if (currentStatus) {
      const currentIndex = flow.indexOf(currentStatus as TStatus);
      if (currentIndex >= 0) {
        return currentIndex;
      }
    }
    return this.getLastHistoryFlowIndex(flow, history);
  }

  private resolveFlowStep<TStatus extends string>(
    flow: readonly TStatus[],
    currentStatus?: string | null,
    history?: StatusHistory[],
  ): TStatus {
    if (currentStatus) {
      const currentIndex = flow.indexOf(currentStatus as TStatus);
      if (currentIndex >= 0) {
        return flow[currentIndex];
      }
    }
    const historyIndex = this.getLastHistoryFlowIndex(flow, history);
    if (historyIndex >= 0) {
      return flow[historyIndex];
    }
    return flow[0];
  }

  private getLastHistoryFlowIndex<TStatus extends string>(
    flow: readonly TStatus[],
    history?: StatusHistory[],
  ): number {
    if (!history?.length) return -1;

    let lastIndex = -1;
    for (const entry of history) {
      if (!entry.to) continue;
      const flowIndex = flow.indexOf(entry.to as TStatus);
      if (flowIndex > lastIndex) {
        lastIndex = flowIndex;
      }
    }
    return lastIndex;
  }

  private getStatusHistoryTimestamp(history: StatusHistory[] | undefined, status: string): string | null {
    if (!history?.length) return null;

    for (let index = history.length - 1; index >= 0; index -= 1) {
      const entry = history[index];
      if (entry.to === status && entry.changed_at) {
        return entry.changed_at;
      }
    }
    return null;
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
        ? { label: 'Contacted', class: 'badge badge-info' }
        : { label: 'Requested', class: 'badge badge-warning' };
    }
    if (status === 'confirmed' || status === 'processing') {
      return { label: 'Confirmed order', class: 'badge badge-info' };
    }
    if (status === 'shipping') {
      return { label: 'Shipping', class: 'badge badge-info' };
    }
    if (status === 'completed') {
      return { label: 'Completed', class: 'badge badge-success' };
    }
    if (status === 'cancelled') {
      return { label: 'Cancelled', class: 'badge badge-neutral' };
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
        return { label: 'Rental confirmed', class: 'badge badge-info' };
      }
      if (contactedAt) {
        return { label: 'Contacted', class: 'badge badge-info' };
      }
      return { label: 'Rental request', class: 'badge badge-warning' };
    }
    if (status === 'ongoing') {
      return { label: 'Ongoing', class: 'badge badge-info' };
    }
    if (status === 'return_requested' || status === 'returning' || status === 'returned') {
      return { label: 'Returned item', class: 'badge badge-info' };
    }
    if (status === 'closed') {
      return { label: 'Closed', class: 'badge badge-neutral' };
    }
    if (status === 'cancelled') {
      return { label: 'Cancelled', class: 'badge badge-neutral' };
    }
    if (status === 'violated') {
      return { label: 'Violated', class: 'badge badge-error' };
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

  private resolveShippingStatus(order?: BuyOrderDetailApi | null): ShippingStatus {
    const rawStatus = String(order?.shipping_status || '').trim().toLowerCase() as ShippingStatus;
    if (rawStatus && this.shippingStatusMeta[rawStatus]) {
      return rawStatus;
    }
    const orderStatus = order?.order_status;
    if (orderStatus === 'completed') return 'delivered';
    if (orderStatus === 'shipping') return 'shipped';
    if (orderStatus === 'processing' && String(order?.tracking_code || '').trim()) {
      return 'ready_to_ship';
    }
    return 'pending';
  }

  private estimateDeliveryDateIso(shippingMethod?: string | null): string {
    const normalized = String(shippingMethod || '').trim().toLowerCase();
    const etaDays = normalized === 'express' || normalized === 'nhanh' ? 2 : 4;
    const eta = new Date();
    eta.setDate(eta.getDate() + etaDays);
    return eta.toISOString();
  }

  private normalizeTrackingPrefix(carrier?: string | null): string {
    const normalized = String(carrier || '').trim().toUpperCase();
    if (normalized.includes('GHN')) return 'GHN';
    if (normalized.includes('GHTK')) return 'GHTK';
    if (normalized.includes('J&T') || normalized.includes('JNT') || normalized.includes('J T')) {
      return 'JNT';
    }
    return 'SHIP';
  }

  private generateSalesTrackingCode(carrier: string, orderCode: string): string {
    const prefix = this.normalizeTrackingPrefix(carrier);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const orderTail = String(orderCode || '').replace(/\D/g, '').slice(-4).padStart(4, '0');
    const random = Math.floor(10 + Math.random() * 90);
    return `${prefix}${yy}${mm}${dd}${orderTail}${random}`;
  }

  private generatePaymentCode(method?: string | null): string {
    const normalized = String(method || '').trim().toLowerCase();
    const prefixMap: Record<string, string> = {
      cod: 'COD',
      vnpay: 'VNP',
      momo: 'MOMO',
      bank_transfer: 'VISA',
    };
    const prefix = prefixMap[normalized] || 'PAY';
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}${yy}${mm}${dd}${random}`;
  }

  private resolveShipmentProvider(current?: string | null): string {
    const normalized = String(current || '').trim();
    if (!normalized) {
      return this.shipmentCarrierOptions[0]?.label || 'GHN';
    }
    if (normalized.toUpperCase() === 'NOI_BO') {
      return 'Nội bộ';
    }
    return normalized;
  }

  private generateTrackingCode(prefix: string): string {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate(),
    ).padStart(2, '0')}`;
    const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(
      2,
      '0',
    )}`;
    const randomPart = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${datePart}-${timePart}${randomPart}`;
  }

  private parseNumber(value?: string): number | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.toString().trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
