import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { NotificationService } from '../../../../core/services/notification.service';
import { ApiResponse, BackendListResponse } from '../../../../models';

type TailorOrderStatus =
  | 'created'
  | 'consulted'
  | 'sample_confirmed'
  | 'tailoring'
  | 'fitting_adjustment'
  | 'completed'
  | 'delivered'
  | 'cancelled';

type TailorProgressStatus = Exclude<TailorOrderStatus, 'cancelled'>;
type TailorProgressStep = TailorProgressStatus | 'finalized';
type TailorChannel = 'zalo' | 'phone' | 'web';
type TailorPaymentMethod = 'cash' | 'bank_transfer' | 'zalo_pay' | 'other';
type TailorPaymentStatus = 'unpaid' | 'deposited' | 'partial' | 'paid';
type TailorReceiveMethod = 'pickup_at_store' | 'home_delivery';
type TailorAttachmentTarget = 'customer_reference' | 'fabric' | 'final_design';

interface ProductReferenceApi {
  product_id: number;
  name: string;
  sku?: string;
  category_name?: string;
  era?: string;
  material?: string;
  craftsmanship?: string;
  thumbnail?: string;
  tailor_available?: boolean;
  attributes?: { colors?: string[] };
}

interface ProductReferenceOption {
  id: number;
  name: string;
  sku: string;
  categoryName: string;
  era: string;
  material: string;
  craftsmanship: string;
  colorPalette: string;
  thumbnail: string;
  tailorAvailable: boolean;
}

@Component({
  selector: 'app-tailor-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './tailor-order-detail.html',
  styleUrl: './tailor-order-detail.css',
})
export class TailorOrderDetailComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly notification = inject(NotificationService);
  private readonly apiUrl = environment.apiUrl;

  protected readonly statusMeta: Record<TailorOrderStatus, { label: string; class: string }> = {
    created: { label: 'Mới tạo', class: 'badge badge-warning' },
    consulted: { label: 'Đã tư vấn', class: 'badge badge-info' },
    sample_confirmed: { label: 'Đã chốt mẫu', class: 'badge badge-info' },
    tailoring: { label: 'Đang may', class: 'badge badge-info' },
    fitting_adjustment: { label: 'Chờ thử/chỉnh sửa', class: 'badge badge-info' },
    completed: { label: 'Hoàn thành', class: 'badge badge-success' },
    delivered: { label: 'Đang giao', class: 'badge badge-success' },
    cancelled: { label: 'Đã hủy', class: 'badge badge-neutral' },
  };

  protected readonly progressFlow: TailorProgressStatus[] = [
    'created',
    'consulted',
    'sample_confirmed',
    'tailoring',
    'fitting_adjustment',
    'completed',
    'delivered',
  ];

  protected readonly progressSteps: TailorProgressStep[] = [
    'created',
    'consulted',
    'sample_confirmed',
    'tailoring',
    'fitting_adjustment',
    'completed',
    'delivered',
    'finalized',
  ];

  protected readonly progressStepMeta: Record<TailorProgressStep, { label: string }> = {
    created: { label: 'Mới tạo' },
    consulted: { label: 'Đã tư vấn' },
    sample_confirmed: { label: 'Đã chốt mẫu' },
    tailoring: { label: 'Đang may' },
    fitting_adjustment: { label: 'Chờ thử/chỉnh sửa' },
    completed: { label: 'Hoàn thành' },
    delivered: { label: 'Đang giao' },
    finalized: { label: 'Hoàn tất' },
  };

  private readonly transitionMap: Record<TailorOrderStatus, TailorOrderStatus[]> = {
    created: ['consulted', 'cancelled'],
    consulted: ['sample_confirmed', 'cancelled'],
    sample_confirmed: ['tailoring', 'cancelled'],
    tailoring: ['fitting_adjustment', 'cancelled'],
    fitting_adjustment: ['completed', 'tailoring', 'cancelled'],
    completed: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  };

  protected readonly channelOptions: Array<{ value: TailorChannel; label: string }> = [
    { value: 'zalo', label: 'Zalo' },
    { value: 'phone', label: 'Điện thoại' },
    { value: 'web', label: 'Website' },
  ];
  protected readonly paymentOptions: Array<{ value: TailorPaymentMethod; label: string }> = [
    { value: 'bank_transfer', label: 'Chuyển khoản' },
    { value: 'cash', label: 'Tiền mặt' },
    { value: 'zalo_pay', label: 'ZaloPay' },
    { value: 'other', label: 'Khác' },
  ];
  protected readonly paymentStatusOptions: Array<{ value: TailorPaymentStatus; label: string }> = [
    { value: 'unpaid', label: 'Chưa cọc' },
    { value: 'deposited', label: 'Đã cọc' },
    { value: 'partial', label: 'Thanh toán một phần' },
    { value: 'paid', label: 'Đã thanh toán đủ' },
  ];
  protected readonly receiveMethodOptions: Array<{ value: TailorReceiveMethod; label: string }> = [
    { value: 'pickup_at_store', label: 'Nhận tại cửa hàng' },
    { value: 'home_delivery', label: 'Giao tận nơi' },
  ];
  protected readonly shipmentCarrierOptions: Array<{ value: string; label: string }> = [
    { value: 'GHTK', label: 'GHTK' },
    { value: 'GHN', label: 'GHN' },
  ];

  protected selectedOrder: any = null;
  protected form: any = this.createEmptyForm();
  protected productOptions: ProductReferenceOption[] = [];
  protected selectedStep: TailorProgressStep = 'created';
  protected legacyStatusMode = false;
  protected detailLoading = true;
  protected productLoading = false;
  protected actionLoading = false;
  protected shipmentLoading = false;
  protected detailError = '';
  protected uploadingAttachment: Record<TailorAttachmentTarget, boolean> = {
    customer_reference: false,
    fabric: false,
    final_design: false,
  };
  private readonly autoGeneratedTitlePattern = /^Custom tailoring request #\d+$/i;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const orderId = params.get('id');
      if (!orderId) {
        this.detailLoading = false;
        this.detailError = 'Không tìm thấy mã đơn may đo.';
        return;
      }
      this.fetchOrderDetail(orderId);
    });
    this.loadProductOptions();
  }

  protected get normalizedStatus(): TailorOrderStatus {
    return this.normalizeStatus(this.selectedOrder?.status);
  }

  protected get selectedStatusMeta() {
    return this.selectedOrder ? this.statusMeta[this.normalizedStatus] : null;
  }

  protected get isCancelled(): boolean {
    return this.normalizedStatus === 'cancelled';
  }

  protected get activeProgressStatus(): TailorProgressStep {
    if (!this.selectedOrder) return 'created';
    if (this.isCancelled) return this.getLastReachedProgressStatus();
    if (this.normalizedStatus === 'delivered') return 'finalized';
    return this.progressSteps.includes(this.normalizedStatus as TailorProgressStep)
      ? (this.normalizedStatus as TailorProgressStep)
      : this.getLastReachedProgressStatus();
  }

  protected get activeProgressIndex(): number {
    return this.progressSteps.indexOf(this.activeProgressStatus);
  }

  protected get orderCreatedAt(): string | null {
    const history = Array.isArray(this.selectedOrder?.status_history)
      ? this.selectedOrder.status_history
      : [];
    const createdEntry = history.find(
      (entry: any) =>
        String(entry?.to || '').trim() === 'created' &&
        (entry?.from === null || String(entry?.from || '').trim() === ''),
    );
    return createdEntry?.changed_at || this.selectedOrder?.created_at || null;
  }

  protected get progressPercent(): number {
    return Math.round(((this.activeProgressIndex + 1) / this.progressSteps.length) * 100);
  }

  protected get canReviewProgressSteps(): boolean {
    return this.activeProgressStatus === 'finalized';
  }

  protected get totalAmount(): number {
    return Math.max(0, Number(this.form.quotedPrice || 0) + Number(this.form.shippingFee || 0));
  }

  protected get totalCost(): number {
    return Math.max(
      0,
      Number(this.form.materialCost || 0) +
        Number(this.form.laborCost || 0) +
        Number(this.form.accessoryCost || 0) +
        Number(this.form.otherCost || 0),
    );
  }

  protected get balanceDue(): number {
    return Math.max(0, this.totalAmount - Number(this.form.paidAmount || 0));
  }

  protected progressLabel(step: TailorProgressStep): string {
    return this.progressStepMeta[step].label;
  }

  protected progressTime(step: TailorProgressStep): string {
    return this.formatDateTime(this.getProgressTimestamp(step));
  }

  protected isStepDone(index: number): boolean {
    return index <= this.activeProgressIndex;
  }

  protected isStepCurrent(index: number): boolean {
    return !this.isCancelled && index === this.activeProgressIndex;
  }

  protected isStepSelected(step: TailorProgressStep): boolean {
    return this.selectedStep === step;
  }

  protected selectStep(step: TailorProgressStep): void {
    if (!this.canReviewProgressSteps) return;
    this.selectedStep = step;
  }

  protected canMoveTo(next: TailorOrderStatus): boolean {
    return (this.transitionMap[this.normalizedStatus] || []).includes(next);
  }

  protected isShipmentCarrierOption(value?: string | null): boolean {
    const normalized = String(value || '').trim().toUpperCase();
    return this.shipmentCarrierOptions.some((item) => item.value === normalized);
  }

  protected paymentMethodLabel(value?: string | null): string {
    const found = this.paymentOptions.find((item) => item.value === value);
    return found?.label || 'Chưa thiết lập';
  }

  protected paymentStatusLabel(value?: string | null): string {
    const found = this.paymentStatusOptions.find((item) => item.value === value);
    return found?.label || 'Chưa thiết lập';
  }

  protected receiveMethodLabel(value?: string | null): string {
    const found = this.receiveMethodOptions.find((item) => item.value === value);
    return found?.label || 'Giao tận nơi';
  }

  protected get hasShipmentUpdated(): boolean {
    return Boolean(this.selectedOrder?.timeline?.shipment_created_at);
  }

  protected get canConfirmDelivered(): boolean {
    return this.canMoveTo('delivered') && this.hasShipmentUpdated && !this.shipmentLoading && !this.actionLoading;
  }

  protected get canConfirmCompletedStep(): boolean {
    return this.normalizedStatus === 'completed' && this.canMoveTo('delivered') && !this.actionLoading;
  }

  protected confirmCompletedAndOpenDelivery(): void {
    if (!this.selectedOrder || !this.canConfirmCompletedStep) {
      this.notification.showError('Chưa thể chuyển sang tab Đang giao.');
      return;
    }

    this.selectedStep = 'delivered';
    this.notification.showInfo('Đã chuyển sang tab Đang giao. Hãy tạo vận đơn trước khi xác nhận đã giao.');
  }

  protected get customerReferenceImages(): string[] {
    return this.getAttachmentList('customer_reference');
  }

  protected get fabricImages(): string[] {
    return this.getAttachmentList('fabric');
  }

  protected get finalDesignImages(): string[] {
    return this.getAttachmentList('final_design');
  }

  protected isUploadingAttachment(target: TailorAttachmentTarget): boolean {
    return Boolean(this.uploadingAttachment[target]);
  }

  protected onAttachmentFilesSelected(event: Event, target: TailorAttachmentTarget): void {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files || []);
    if (!files.length) return;
    void this.uploadAttachmentFiles(files, target);
    if (input) {
      input.value = '';
    }
  }

  protected removeAttachment(target: TailorAttachmentTarget, url: string): void {
    const next = this.getAttachmentList(target).filter((item) => item !== url);
    this.setAttachmentList(target, next);
  }

  protected clearAttachments(target: TailorAttachmentTarget): void {
    this.setAttachmentList(target, []);
  }

  protected stepFieldHints(step: TailorProgressStep): string[] {
    switch (step) {
      case 'created':
        return ['Khách hàng', 'Mã khách', 'Kênh bán', 'Nhân viên phụ trách'];
      case 'consulted':
        return ['Nội dung tư vấn', 'Mẫu gốc', 'Giá nền', 'Ghi chú chốt qua Zalo'];
      case 'sample_confirmed':
        return ['Chi tiết may đo', 'Số đo', 'Tùy chỉnh', 'Ảnh mẫu'];
      case 'tailoring':
        return ['Đang may', 'Ghi chú thợ may', 'Ảnh thiết kế chốt'];
      case 'fitting_adjustment':
        return ['Thử/chỉnh sửa', 'Yêu cầu sửa', 'Số đo bổ sung'];
      case 'completed':
        return this.canConfirmCompletedStep
          ? ['\u004b\u0069\u1ec3m tra s\u1ea3n ph\u1ea9m', '\u0110\u1ed1i so\u00e1t c\u00f4ng n\u1ee3', 'X\u00e1c nh\u1eadn chuy\u1ec3n b\u01b0\u1edbc']
          : ['\u0110\u00e3 x\u00e1c nh\u1eadn ho\u00e0n th\u00e0nh', 'Theo d\u00f5i tab \u0110ang giao'];
      case 'delivered':
        return ['Hình thức nhận', 'Đơn vị vận chuyển', 'Tạo vận đơn', 'Xác nhận đã giao'];
      case 'finalized':
        return ['Đơn đã hoàn tất', 'Đối soát công nợ', 'Kiểm tra lịch sử trạng thái'];
      default:
        return [];
    }
  }

  protected onReferenceProductChange(): void {
    const selected = this.productOptions.find((item) => item.id === Number(this.form.referenceProductId));
    if (!selected) return;
    this.form.referenceProductName = selected.name;
    this.form.referenceModelCode = selected.sku;
    this.form.referenceSku = selected.sku;
    this.form.title = selected.name;
    this.form.categoryName = selected.categoryName;
    this.form.era = selected.era;
    this.form.material = selected.material;
    this.form.craftsmanship = selected.craftsmanship;
    this.form.colorPalette = selected.colorPalette;
    this.form.thumbnail = selected.thumbnail || this.form.thumbnail;
  }

  protected async saveTailorOrder(showSuccess = true): Promise<boolean> {
    if (!this.selectedOrder || this.actionLoading || this.shipmentLoading) return false;
    this.actionLoading = true;
    try {
      const payload = this.buildPayloadByStep(this.selectedStep);
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<any>>(
          `${this.apiUrl}/tailor-orders/${this.selectedOrder.tailor_order_id}`,
          payload,
        ),
      );
      if (response.data) this.applyDetail(response.data);
      if (showSuccess) this.notification.showSuccess('Đã lưu đơn may đo.');
      return true;
    } catch (error: any) {
      this.notification.showError(this.resolveApiError(error, 'Không thể lưu đơn may đo.'));
      return false;
    } finally {
      this.actionLoading = false;
    }
  }

  protected async confirmAndMove(
    status: TailorOrderStatus,
    note: string,
    _confirmMessage: string,
  ): Promise<void> {
    if (!this.selectedOrder || !this.canMoveTo(status)) return;
    await this.moveTo(status, note);
  }

  protected async moveTo(status: TailorOrderStatus, note: string): Promise<void> {
    if (!this.selectedOrder || !this.canMoveTo(status)) return;

    const guardError = this.validateBeforeTransition(status);
    if (guardError) {
      this.notification.showError(guardError);
      return;
    }

    if (status === 'delivered' && !this.hasShipmentUpdated) {
      this.notification.showError('Vui lòng tạo vận đơn trước khi xác nhận đã giao.');
      return;
    }

    this.actionLoading = true;
    const fallbackStatus = this.toLegacyCompatStatus(status);
    const statusForApi = status === 'completed' ? fallbackStatus : status;
    const payload = this.buildPayloadByStep(this.selectedStep);
    const applyStatusResult = (data: any): boolean => {
      if (data) this.applyDetail(data);
      const actualStatus = this.normalizeStatus(data?.status);
      if (actualStatus !== status) {
        this.notification.showError(
          `\u0110\u00e3 l\u01b0u d\u1eef li\u1ec7u nh\u01b0ng ch\u01b0a chuy\u1ec3n \u0111\u01b0\u1ee3c sang b\u01b0\u1edbc ${this.statusMeta[status].label}.`,
        );
        return false;
      }
      this.notification.showSuccess('\u0110\u00e3 c\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i.');
      return true;
    };

    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<any>>(
          `${this.apiUrl}/tailor-orders/${this.selectedOrder.tailor_order_id}`,
          {
            ...payload,
            status: statusForApi,
            status_note: note,
            cancel_reason: this.form.cancelReason || '',
          },
        ),
      );
      if (!applyStatusResult(response.data)) return;
    } catch (error: any) {
      if (
        this.shouldFallbackLegacyStatus(error) && fallbackStatus !== status
      ) {
        try {
          const response = await firstValueFrom(
            this.http.patch<ApiResponse<any>>(
              `${this.apiUrl}/tailor-orders/${this.selectedOrder.tailor_order_id}`,
              {
                ...payload,
                status: fallbackStatus,
                status_note: note,
                cancel_reason: this.form.cancelReason || '',
              },
            ),
          );
          if (!applyStatusResult(response.data)) return;
          return;
        } catch (fallbackError: any) {
          this.notification.showError(
            this.resolveApiError(fallbackError, 'Không thể cập nhật trạng thái.'),
          );
          return;
        }
      }

      this.notification.showError(this.resolveApiError(error, 'Không thể cập nhật trạng thái.'));
    } finally {
      this.actionLoading = false;
    }
  }

  protected async createShipment(): Promise<void> {
    if (!this.selectedOrder) return;
    const carrierName = String(this.form.carrierName || '').trim();
    if (!carrierName) {
      this.notification.showError('Vui lòng chọn đơn vị vận chuyển trước khi tạo vận đơn.');
      return;
    }

    const saved = await this.saveTailorOrder(false);
    if (!saved) return;

    this.shipmentLoading = true;
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<any>>(
          `${this.apiUrl}/tailor-orders/${this.selectedOrder.tailor_order_id}/generate-shipment`,
          {
            carrier_name: carrierName,
            note: this.form.shipmentNote,
          },
        ),
      );
      if (response.data) this.applyDetail(response.data);
      this.notification.showSuccess('Đã tạo vận đơn.');
    } catch (error: any) {
      this.notification.showError(this.resolveApiError(error, 'Không thể tạo vận đơn.'));
    } finally {
      this.shipmentLoading = false;
    }
  }

  protected formatCurrency(value?: number | null): string {
    return `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} đ`;
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

  protected formatHistoryStatus(value?: string | null): string {
    if (!value) return 'Khởi tạo';
    return this.statusMeta[this.normalizeStatus(value)]?.label || value;
  }

  private loadProductOptions(): void {
    this.productLoading = true;
    const params = new HttpParams({
      fromObject: { page: '1', limit: '100', status: 'active', sortBy: 'created_at', sortOrder: 'desc' },
    });
    this.http.get<ApiResponse<BackendListResponse<ProductReferenceApi>>>(`${this.apiUrl}/products`, { params }).subscribe({
      next: (response) => {
        this.productOptions = (response.data?.items || []).map((item) => ({
          id: Number(item.product_id),
          name: item.name || 'Sản phẩm mẫu',
          sku: item.sku || '',
          categoryName: item.category_name || '',
          era: item.era || '',
          material: item.material || '',
          craftsmanship: item.craftsmanship || '',
          colorPalette: Array.isArray(item.attributes?.colors) ? item.attributes.colors.join(', ') : '',
          thumbnail: item.thumbnail || '',
          tailorAvailable: Boolean(item.tailor_available),
        }));
        this.productLoading = false;
      },
      error: () => {
        this.productLoading = false;
      },
    });
  }

  private fetchOrderDetail(orderId: string): void {
    this.detailLoading = true;
    this.http.get<ApiResponse<any>>(`${this.apiUrl}/tailor-orders/${orderId}`).subscribe({
      next: (response) => {
        if (response.data) this.applyDetail(response.data);
        this.detailLoading = false;
      },
      error: (error) => {
        this.detailError = error?.error?.message || 'Không thể tải chi tiết đơn may đo.';
        this.detailLoading = false;
      },
    });
  }

  private applyDetail(order: any): void {
    const rawTitle = String(order.product?.title || '').trim();
    const displayTitle = this.isAutoGeneratedTitle(rawTitle) ? '' : rawTitle;

    this.legacyStatusMode = this.detectLegacyStatusMode(order);
    this.selectedOrder = { ...order, status: this.normalizeStatus(order.status) };
    this.form = {
      ...this.createEmptyForm(),
      customerCode: order.customer?.customer_code || order.customer?.user_id || order.customer?.guest_id || '',
      fullName: order.customer?.full_name || '',
      phone: order.customer?.phone || '',
      email: order.customer?.email || '',
      zaloContact: order.customer?.zalo_contact || '',
      address: order.customer?.address || '',
      customerNote: order.customer?.customer_note || '',
      channel: order.communication?.channel || 'zalo',
      handledBy: order.communication?.handled_by || '',
      customerConfirmedAt: this.toInputDateTime(order.communication?.customer_confirmed_at),
      communicationNote: order.communication?.note || '',
      referenceProductId: order.product?.reference_product_id ? String(order.product.reference_product_id) : '',
      referenceModelCode: order.product?.reference_model_code || '',
      referenceProductName: order.product?.reference_product_name || '',
      referenceSku: order.product?.reference_sku || '',
      title: displayTitle,
      categoryName: order.product?.category_name || '',
      baseDescription: order.product?.base_description || '',
      basePrice: Number(order.product?.base_price || 0),
      era: order.product?.era || '',
      material: order.product?.material || '',
      craftsmanship: order.product?.craftsmanship || '',
      colorPalette: order.product?.color_palette || '',
      patternNote: order.product?.pattern_note || '',
      styleAdjustments: order.product?.style_adjustments || '',
      customRequest: order.product?.custom_request || '',
      sizeNote: order.product?.size_note || '',
      measurementNote: order.product?.measurement_note || '',
      quantity: Number(order.product?.quantity || 1),
      accessories: order.product?.accessories || '',
      customizationNote: order.product?.customization_note || '',
      extraPrice: Number(order.product?.extra_price || 0),
      thumbnail: order.product?.thumbnail || '',
      height: order.product?.measurements?.height ?? null,
      weight: order.product?.measurements?.weight ?? null,
      chest: order.product?.measurements?.chest ?? null,
      waist: order.product?.measurements?.waist ?? null,
      hip: order.product?.measurements?.hip ?? null,
      shoulder: order.product?.measurements?.shoulder ?? null,
      sleeveLength: order.product?.measurements?.sleeve_length ?? null,
      topLength: order.product?.measurements?.top_length ?? null,
      bottomLength: order.product?.measurements?.bottom_length ?? null,
      otherMeasurements: order.product?.measurements?.other_measurements || '',
      customerReferenceImagesText: (order.product?.attachments?.customer_reference_images || []).join('\n'),
      fabricImagesText: (order.product?.attachments?.fabric_images || []).join('\n'),
      finalDesignImagesText: (order.product?.attachments?.final_design_images || []).join('\n'),
      tailorNote: order.product?.tailor_note || '',
      quotedPrice: Number(order.pricing?.quoted_price || order.product?.base_price || 0),
      depositAmount: Number(order.pricing?.deposit_amount || 0),
      shippingFee: Number(order.pricing?.shipping_fee || 0),
      paymentMethod: order.finance?.payment_method || 'bank_transfer',
      paymentStatus: order.finance?.payment_status || 'unpaid',
      paidAmount: Number(order.finance?.paid_amount || 0),
      paymentDate: this.toInputDate(order.finance?.payment_date),
      transactionCode: order.finance?.transaction_code || '',
      materialCost: Number(order.finance?.material_cost || 0),
      laborCost: Number(order.finance?.labor_cost || 0),
      accessoryCost: Number(order.finance?.accessory_cost || 0),
      otherCost: Number(order.finance?.other_cost || 0),
      financeNote: order.finance?.note || '',
      receiveMethod: order.shipping?.receive_method || 'home_delivery',
      carrierName: this.normalizeCarrierName(order.shipping?.carrier_name),
      trackingCode: order.shipping?.tracking_code || '',
      labelCode: order.shipping?.label_code || '',
      estimatedDeliveryDate: this.toInputDate(order.shipping?.estimated_delivery_at),
      actualDeliveryDate: this.toInputDate(order.shipping?.actual_delivery_at || order.shipping?.delivered_at),
      shipmentNote: order.shipping?.note || '',
      adminNote: order.admin_note || '',
      cancelReason: order.cancel_reason || '',
    };
    const activeStep = this.activeProgressStatus;
    this.selectedStep =
      this.selectedStep === 'delivered' && activeStep === 'completed'
        ? 'delivered'
        : activeStep;
  }

  private isAutoGeneratedTitle(value?: string | null): boolean {
    return this.autoGeneratedTitlePattern.test(String(value || '').trim());
  }

  private validateBeforeTransition(nextStatus: TailorOrderStatus): string | null {
    const requiredSetupStatuses = new Set<TailorOrderStatus>([
      'sample_confirmed',
      'fitting_adjustment',
      'tailoring',
      'completed',
      'delivered',
    ]);

    if (!requiredSetupStatuses.has(nextStatus)) {
      return null;
    }

    const hasReferenceSample =
      Boolean(String(this.form.referenceProductId || '').trim()) ||
      Boolean(String(this.form.referenceModelCode || '').trim()) ||
      Boolean(String(this.form.referenceProductName || '').trim());

    if (!hasReferenceSample) {
      return 'Vui lòng chọn mẫu gốc trước khi chuyển bước.';
    }

    const quoted = Number(this.form.quotedPrice || 0);
    const base = Number(this.form.basePrice || 0);
    if (quoted <= 0 && base > 0) {
      this.form.quotedPrice = base;
    }

    if (Number(this.form.quotedPrice || 0) <= 0) {
      return 'Vui lòng nhập giá báo trước khi chuyển bước.';
    }

    return null;
  }

  private detectLegacyStatusMode(order: any): boolean {
    const legacyStatuses = new Set(['confirmed_request', 'quoted', 'order_confirmed', 'shipping']);
    const rawStatus = String(order?.status || '').trim();
    if (legacyStatuses.has(rawStatus)) return true;

    const history = Array.isArray(order?.status_history) ? order.status_history : [];
    return history.some(
      (entry: any) =>
        legacyStatuses.has(String(entry?.from || '').trim()) ||
        legacyStatuses.has(String(entry?.to || '').trim()),
    );
  }

  private resolveApiError(error: any, fallback: string): string {
    const firstDetail = error?.error?.errors?.[0];
    if (firstDetail?.field && firstDetail?.message) {
      return `${firstDetail.field}: ${firstDetail.message}`;
    }
    const rawMessage = String(error?.error?.message || '').trim();
    if (rawMessage.includes('Product setup and a quoted price are required before continuing')) {
      return 'Vui lòng chọn mẫu gốc và nhập giá báo trước khi chuyển bước.';
    }
    if (rawMessage.includes('body.status') && rawMessage.includes('must be one of')) {
      return 'Trạng thái chuyển bước chưa tương thích backend.';
    }
    if (rawMessage.includes('Please update shipment details before confirming delivered')) {
      return 'Vui lòng tạo vận đơn trước khi xác nhận đã giao.';
    }
    const transitionMatch = rawMessage.match(
      /Cannot move tailor order from ([a-z_]+) to ([a-z_]+)\.?/i,
    );
    if (transitionMatch) {
      const fromRaw = transitionMatch[1];
      const toRaw = transitionMatch[2];
      const fromLabel =
        this.statusMeta[this.normalizeStatus(fromRaw as TailorOrderStatus)]?.label || fromRaw;
      const toStatus =
        toRaw === 'shipping' ? 'completed' : this.normalizeStatus(toRaw as TailorOrderStatus);
      const toLabel = this.statusMeta[toStatus]?.label || toRaw;
      return `\u004b\u0068\u00f4ng th\u1ec3 chuy\u1ec3n tr\u1ea1ng th\u00e1i t\u1eeb ${fromLabel} sang ${toLabel}.`;
    }
    return rawMessage || fallback;
  }

  private shouldFallbackLegacyStatus(error: any): boolean {
    const details = error?.error?.errors;
    if (!Array.isArray(details)) return false;
    return details.some(
      (item) =>
        String(item?.field || '').trim() === 'body.status' &&
        String(item?.message || '').includes('must be one of'),
    );
  }

  private toLegacyCompatStatus(status: TailorOrderStatus): TailorOrderStatus | string {
    switch (status) {
      case 'created':
        return 'confirmed_request';
      case 'consulted':
        return 'quoted';
      case 'sample_confirmed':
        return 'order_confirmed';
      case 'fitting_adjustment':
        return 'tailoring';
      case 'completed':
        return 'shipping';
      case 'delivered':
        return 'completed';
      default:
        return status;
    }
  }

  private buildUpdatePayload() {
    return {
      customer: {
        customer_code: this.form.customerCode,
        full_name: this.form.fullName,
        phone: this.form.phone,
        email: this.form.email,
        zalo_contact: this.form.zaloContact,
        address: this.form.address,
        customer_note: this.form.customerNote,
      },
      communication: {
        channel: this.form.channel,
        handled_by: this.form.handledBy,
        customer_confirmed_at: this.form.customerConfirmedAt ? new Date(this.form.customerConfirmedAt).toISOString() : null,
        note: this.form.communicationNote,
      },
      product: {
        reference_product_id: Number(this.form.referenceProductId) || null,
        reference_model_code: this.form.referenceModelCode,
        reference_product_name: this.form.referenceProductName,
        reference_sku: this.form.referenceSku,
        title: this.resolveProductTitle(),
        category_name: this.form.categoryName,
        base_description: this.form.baseDescription,
        base_price: Number(this.form.basePrice || 0),
        era: this.form.era,
        material: this.form.material,
        craftsmanship: this.form.craftsmanship,
        color_palette: this.form.colorPalette,
        pattern_note: this.form.patternNote,
        style_adjustments: this.form.styleAdjustments,
        custom_request: this.form.customRequest,
        size_note: this.form.sizeNote,
        measurement_note: this.form.measurementNote,
        extra_price: Number(this.form.extraPrice || 0),
        quantity: Math.max(1, Number(this.form.quantity || 1)),
        accessories: this.form.accessories,
        customization_note: this.form.customizationNote,
        thumbnail: this.form.thumbnail,
        measurements: {
          height: this.toNullableNumber(this.form.height),
          weight: this.toNullableNumber(this.form.weight),
          chest: this.toNullableNumber(this.form.chest),
          waist: this.toNullableNumber(this.form.waist),
          hip: this.toNullableNumber(this.form.hip),
          shoulder: this.toNullableNumber(this.form.shoulder),
          sleeve_length: this.toNullableNumber(this.form.sleeveLength),
          top_length: this.toNullableNumber(this.form.topLength),
          bottom_length: this.toNullableNumber(this.form.bottomLength),
          other_measurements: this.form.otherMeasurements,
        },
        attachments: {
          customer_reference_images: this.toImageList(this.form.customerReferenceImagesText),
          fabric_images: this.toImageList(this.form.fabricImagesText),
          final_design_images: this.toImageList(this.form.finalDesignImagesText),
        },
        tailor_note: this.form.tailorNote,
      },
      pricing: {
        quoted_price: Number(this.form.quotedPrice || 0),
        deposit_amount: Number(this.form.depositAmount || 0),
        shipping_fee: Number(this.form.shippingFee || 0),
      },
      finance: {
        payment_method: this.form.paymentMethod,
        payment_status: this.form.paymentStatus,
        paid_amount: Number(this.form.paidAmount || 0),
        payment_date: this.form.paymentDate ? new Date(this.form.paymentDate).toISOString() : null,
        transaction_code: this.form.transactionCode,
        material_cost: Number(this.form.materialCost || 0),
        labor_cost: Number(this.form.laborCost || 0),
        accessory_cost: Number(this.form.accessoryCost || 0),
        other_cost: Number(this.form.otherCost || 0),
        note: this.form.financeNote,
      },
      shipping: {
        receive_method: this.form.receiveMethod,
        carrier_name: this.form.carrierName,
        tracking_code: this.form.trackingCode,
        label_code: this.form.labelCode,
        estimated_delivery_at: this.form.estimatedDeliveryDate ? new Date(this.form.estimatedDeliveryDate).toISOString() : null,
        actual_delivery_at: this.form.actualDeliveryDate ? new Date(this.form.actualDeliveryDate).toISOString() : null,
        note: this.form.shipmentNote,
      },
      admin_note: this.form.adminNote,
      cancel_reason: this.form.cancelReason,
    };
  }

  private buildPayloadByStep(step: TailorProgressStep) {
    const full = this.buildUpdatePayload();
    const shared = {
      admin_note: full.admin_note,
      cancel_reason: full.cancel_reason,
    };

    switch (step) {
      case 'created':
        return {
          ...shared,
          customer: full.customer,
          communication: full.communication,
        };
      case 'consulted':
        return {
          ...shared,
          communication: full.communication,
          product: {
            reference_product_id: full.product.reference_product_id,
            reference_model_code: full.product.reference_model_code,
            reference_product_name: full.product.reference_product_name,
            reference_sku: full.product.reference_sku,
            title: full.product.title,
            category_name: full.product.category_name,
            base_description: full.product.base_description,
            base_price: full.product.base_price,
            era: full.product.era,
            material: full.product.material,
            craftsmanship: full.product.craftsmanship,
            color_palette: full.product.color_palette,
          },
          pricing: full.pricing,
        };
      case 'sample_confirmed':
        return {
          ...shared,
          product: {
            title: full.product.title,
            material: full.product.material,
            color_palette: full.product.color_palette,
            pattern_note: full.product.pattern_note,
            style_adjustments: full.product.style_adjustments,
            custom_request: full.product.custom_request,
            measurement_note: full.product.measurement_note,
            extra_price: full.product.extra_price,
            quantity: full.product.quantity,
            measurements: full.product.measurements,
            attachments: {
              customer_reference_images: full.product.attachments.customer_reference_images,
              fabric_images: full.product.attachments.fabric_images,
            },
          },
          pricing: full.pricing,
        };
      case 'tailoring':
        return {
          ...shared,
          product: {
            tailor_note: full.product.tailor_note,
            attachments: {
              final_design_images: full.product.attachments.final_design_images,
            },
          },
        };
      case 'fitting_adjustment':
        return {
          ...shared,
          product: {
            custom_request: full.product.custom_request,
            measurement_note: full.product.measurement_note,
            tailor_note: full.product.tailor_note,
            style_adjustments: full.product.style_adjustments,
          },
        };
      case 'completed':
        return {
          ...shared,
          pricing: full.pricing,
          finance: full.finance,
          shipping: {
            receive_method: full.shipping.receive_method,
            carrier_name: full.shipping.carrier_name,
            tracking_code: full.shipping.tracking_code,
            label_code: full.shipping.label_code,
            estimated_delivery_at: full.shipping.estimated_delivery_at,
            note: full.shipping.note,
          },
        };
      case 'delivered':
        return {
          ...shared,
          shipping: full.shipping,
        };
      case 'finalized':
        return shared;
      default:
        return full;
    }
  }

  private normalizeCarrierName(value: unknown): string {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const upper = raw.toUpperCase();
    if (upper === 'GHTK' || upper === 'GHN') return upper;
    return raw;
  }

  private normalizeStatus(value: string | null | undefined): TailorOrderStatus {
    switch (String(value || '').trim()) {
      case 'created':
      case 'consulted':
      case 'sample_confirmed':
      case 'tailoring':
      case 'fitting_adjustment':
      case 'completed':
      case 'delivered':
      case 'cancelled':
        return value as TailorOrderStatus;
      case 'confirmed_request':
        return 'created';
      case 'quoted':
        return 'consulted';
      case 'order_confirmed':
        return 'sample_confirmed';
      case 'shipping':
        return 'completed';
      default:
        return 'created';
    }
  }

  private resolveProductTitle(): string {
    const directTitle = String(this.form.title || '').trim();
    if (directTitle) return directTitle;

    const referenceName = String(this.form.referenceProductName || '').trim();
    if (referenceName) return referenceName;

    const referenceCode = String(this.form.referenceModelCode || '').trim();
    if (referenceCode) return `Mẫu ${referenceCode}`;

    return '';
  }

  private async uploadAttachmentFiles(
    files: File[],
    target: TailorAttachmentTarget,
  ): Promise<void> {
    if (this.uploadingAttachment[target]) return;
    this.uploadingAttachment[target] = true;

    try {
      let urls = await this.uploadImagesWithEndpoint('/tailor-orders/uploads', files);

      if (!urls.length) {
        urls = await this.uploadImagesWithEndpoint('/products/uploads', files);
      }

      if (!urls.length) {
        this.notification.showError('\u004b\u0068\u00f4ng nh\u1eadn \u0111\u01b0\u1ee3c URL \u1ea3nh t\u1eeb Cloudinary.');
        return;
      }

      const merged = [...this.getAttachmentList(target), ...urls];
      this.setAttachmentList(target, Array.from(new Set(merged)));
      this.notification.showSuccess('\u0110\u00e3 t\u1ea3i \u1ea3nh l\u00ean Cloudinary.');
    } catch (error: any) {
      const isNotFound =
        Number(error?.status || 0) === 404 ||
        String(error?.error?.message || '').toLowerCase().includes('not found');

      if (isNotFound) {
        try {
          const fallbackUrls = await this.uploadImagesWithEndpoint('/products/uploads', files);
          if (!fallbackUrls.length) {
            this.notification.showError('\u004b\u0068\u00f4ng nh\u1eadn \u0111\u01b0\u1ee3c URL \u1ea3nh t\u1eeb Cloudinary.');
            return;
          }
          const merged = [...this.getAttachmentList(target), ...fallbackUrls];
          this.setAttachmentList(target, Array.from(new Set(merged)));
          this.notification.showSuccess('\u0110\u00e3 t\u1ea3i \u1ea3nh l\u00ean Cloudinary.');
          return;
        } catch (fallbackError: any) {
          this.notification.showError(
            this.resolveApiError(fallbackError, '\u004b\u0068\u00f4ng th\u1ec3 t\u1ea3i \u1ea3nh l\u00ean Cloudinary.'),
          );
          return;
        }
      }

      this.notification.showError(this.resolveApiError(error, '\u004b\u0068\u00f4ng th\u1ec3 t\u1ea3i \u1ea3nh l\u00ean Cloudinary.'));
    } finally {
      this.uploadingAttachment[target] = false;
    }
  }

  private async uploadImagesWithEndpoint(path: string, files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    const response = await firstValueFrom(
      this.http.post<ApiResponse<{ urls?: string[] }>>(`${this.apiUrl}${path}`, formData),
    );
    return response.data?.urls || [];
  }

  private getAttachmentList(target: TailorAttachmentTarget): string[] {
    switch (target) {
      case 'customer_reference':
        return this.toImageList(this.form.customerReferenceImagesText);
      case 'fabric':
        return this.toImageList(this.form.fabricImagesText);
      case 'final_design':
        return this.toImageList(this.form.finalDesignImagesText);
      default:
        return [];
    }
  }

  private setAttachmentList(target: TailorAttachmentTarget, urls: string[]): void {
    const value = urls.join('\n');
    switch (target) {
      case 'customer_reference':
        this.form.customerReferenceImagesText = value;
        break;
      case 'fabric':
        this.form.fabricImagesText = value;
        break;
      case 'final_design':
        this.form.finalDesignImagesText = value;
        break;
    }
  }

  private getLastReachedProgressStatus(): TailorProgressStep {
    let reached: TailorProgressStep = 'created';
    for (const step of this.progressSteps) {
      if (this.getProgressTimestamp(step) !== null) {
        reached = step;
      }
    }
    return reached;
  }

  private getProgressTimestamp(step: TailorProgressStep): string | null {
    if (!this.selectedOrder) return null;
    switch (step) {
      case 'created':
        return this.selectedOrder.created_at || null;
      case 'consulted':
        return this.selectedOrder.timeline?.consulted_at || this.selectedOrder.timeline?.quoted_at || null;
      case 'sample_confirmed':
        return this.selectedOrder.timeline?.sample_confirmed_at || this.selectedOrder.timeline?.order_confirmed_at || null;
      case 'tailoring':
        return this.selectedOrder.timeline?.tailoring_started_at || null;
      case 'fitting_adjustment':
        return this.selectedOrder.timeline?.fitting_adjustment_at || null;
      case 'completed':
        return this.selectedOrder.timeline?.completed_at || this.selectedOrder.timeline?.shipment_created_at || null;
      case 'delivered':
        return this.selectedOrder.timeline?.delivered_at || this.selectedOrder.shipping?.actual_delivery_at || this.selectedOrder.shipping?.delivered_at || null;
      case 'finalized':
        return this.selectedOrder.timeline?.delivered_at || this.selectedOrder.shipping?.actual_delivery_at || this.selectedOrder.shipping?.delivered_at || null;
      default:
        return null;
    }
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toImageList(raw: string): string[] {
    return String(raw || '')
      .split(/[,\n]/g)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private toInputDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private toInputDateTime(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private createEmptyForm() {
    return {
      customerCode: '',
      fullName: '',
      phone: '',
      email: '',
      zaloContact: '',
      address: '',
      customerNote: '',
      channel: 'zalo',
      handledBy: '',
      customerConfirmedAt: '',
      communicationNote: '',
      referenceProductId: '',
      referenceModelCode: '',
      referenceProductName: '',
      referenceSku: '',
      title: '',
      categoryName: '',
      baseDescription: '',
      basePrice: 0,
      era: '',
      material: '',
      craftsmanship: '',
      colorPalette: '',
      patternNote: '',
      styleAdjustments: '',
      customRequest: '',
      sizeNote: '',
      measurementNote: '',
      quantity: 1,
      accessories: '',
      customizationNote: '',
      extraPrice: 0,
      thumbnail: '',
      height: null,
      weight: null,
      chest: null,
      waist: null,
      hip: null,
      shoulder: null,
      sleeveLength: null,
      topLength: null,
      bottomLength: null,
      otherMeasurements: '',
      customerReferenceImagesText: '',
      fabricImagesText: '',
      finalDesignImagesText: '',
      tailorNote: '',
      quotedPrice: 0,
      depositAmount: 0,
      shippingFee: 0,
      paymentMethod: 'bank_transfer',
      paymentStatus: 'unpaid',
      paidAmount: 0,
      paymentDate: '',
      transactionCode: '',
      materialCost: 0,
      laborCost: 0,
      accessoryCost: 0,
      otherCost: 0,
      financeNote: '',
      receiveMethod: 'home_delivery',
      carrierName: '',
      trackingCode: '',
      labelCode: '',
      estimatedDeliveryDate: '',
      actualDeliveryDate: '',
      shipmentNote: '',
      adminNote: '',
      cancelReason: '',
    };
  }
}


