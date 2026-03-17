import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Product, ProductService } from '../../services/product.service';
import { AddressService } from '../../services/address.service';
import { Address } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import {
  GuestCustomerPayload,
  GuestCustomerService,
} from '../../services/guest-customer.service';
import {
  CreateRentOrderPayload,
  RentOrderService,
} from '../../services/rent-order.service';
import {
  AdministrativeOption,
  VietnamAdministrativeService,
} from '../../services/vietnam-administrative.service';
import { ToastService } from '../../services/toast.service';
import { RentalSuccessModal } from '../../shared/components/rental-success-modal/rental-success-modal';

@Component({
  selector: 'app-rental-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RentalSuccessModal],
  templateUrl: './rental-checkout.html',
  styleUrl: './rental-checkout.css',
})
export class RentalCheckout implements OnInit, OnDestroy {
  product = {
    id: '',
    name: 'Sản phẩm thuê',
    sku: '',
    thumbnail: 'assets/images/placeholder.jpg',
    color: '',
    size: '',
    rentPricePerDay: 0,
    depositAmount: 0,
    quantity: 1,
    inStock: true,
  };

  rawProduct: Product | null = null;

  addresses: Address[] = [];
  selectedAddress: Address | null = null;
  defaultAddress = {
    receiver: 'Chưa có địa chỉ',
    phone: '',
    address: 'Vui lòng thêm địa chỉ giao hàng.',
  };

  storeInfo = {
    name: 'Phúc Heritage',
    address: '12 Trần Phú, Thành phố Hồ Chí Minh',
    hours: '08:30 - 20:30 (T2 - CN)',
  };

  deliveryMethod: 'ship' | 'pickup' = 'ship';
  paymentMethod: 'momo' | 'vnpay' = 'momo';
  agreeTerms = false;
  showTerms = false;
  showSuccessModal = false;
  formError = '';
  isSubmitting = false;
  isLoggedIn = false;

  guestForm: GuestCustomerPayload = {
    full_name: '',
    phone: '',
    email: '',
    address: {
      province: '',
      district: '',
      ward: '',
      detail: '',
    },
  };

  provinces: AdministrativeOption[] = [];
  guestWards: AdministrativeOption[] = [];
  guestProvinceCode = '';
  guestWardCode = '';
  isLoadingProvinces = false;
  isLoadingGuestWards = false;
  administrativeNote = '';

  minDays = 1;
  maxDays = 30;
  shippingFeeShip = 30000;
  discountAmount = 0;
  private readonly vietnamPhonePattern = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private today = new Date();
  startDate = this.toDateInputValue(this.today);
  endDate = this.toDateInputValue(this.addDays(this.today, 1));

  paymentOptions = [
    {
      id: 'bank',
      label: 'Chuyển khoản',
      description: 'Khuyến nghị để giữ cọc chắc chắn',
      recommended: true,
    },
    {
      id: 'vnpay',
      label: 'Ví/QR',
      description: 'Thanh toán nhanh qua QR/VNPay',
      recommended: false,
    },
    {
      id: 'cod',
      label: 'COD (trả cọc khi nhận)',
      description: 'Thanh toán cọc khi nhận hàng',
      recommended: false,
    },
  ] as const;

  onlinePaymentOptions = [
    {
      id: 'momo',
      label: 'Ví MoMo',
      description: 'Thanh toán cọc nhanh qua ví MoMo',
      badge: 'MOMO',
      recommended: false,
    },
    {
      id: 'vnpay',
      label: 'VNPay',
      description: 'Thanh toán cọc qua VNPay, QR hoặc thẻ ngân hàng',
      badge: 'VNPAY',
      recommended: false,
    },
  ] as const;

  rentOrderResult: {
    orderCode: string;
    startDate: string;
    endDate: string;
    rentFeeExpected: number;
    depositPaid: number;
    status: 'booked' | 'pending' | 'ongoing' | 'returned' | 'closed' | 'cancelled' | 'violated';
  } | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private addressService: AddressService,
    private authService: AuthService,
    private guestCustomerService: GuestCustomerService,
    private rentOrderService: RentOrderService,
    private vietnamAdministrativeService: VietnamAdministrativeService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadAdministrativeOptions();

    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      this.isLoggedIn = !!user;
      if (user) this.loadAddresses();
    });

    const rentalState = this.getRentalState();
    if (rentalState) {
      this.applyRentalState(rentalState);
    }

    const productId =
      rentalState?.productId || this.route.snapshot.queryParamMap.get('productId');
    if (productId) {
      this.loadProduct(productId.toString(), rentalState);
    } else if (!rentalState) {
      this.router.navigate(['/products']);
    }

    if (this.authService.isLoggedIn()) {
      this.isLoggedIn = true;
      this.loadAddresses();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get minStartDate(): string {
    return this.toDateInputValue(this.today);
  }

  get minEndDate(): string {
    const start = this.parseDate(this.startDate) || this.today;
    return this.toDateInputValue(this.addDays(start, 1));
  }

  get maxEndDate(): string {
    const start = this.parseDate(this.startDate) || this.today;
    return this.toDateInputValue(this.addDays(start, this.maxDays));
  }

  get rentalDays(): number {
    const start = this.parseDate(this.startDate);
    const end = this.parseDate(this.endDate);
    if (!start || !end) return 0;
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  get isPeriodValid(): boolean {
    return this.rentalDays >= this.minDays && this.rentalDays <= this.maxDays;
  }

  get rentFeeExpected(): number {
    return this.product.rentPricePerDay * this.rentalDays * this.product.quantity;
  }

  get depositRequired(): number {
    return this.product.depositAmount * this.product.quantity;
  }

  get shippingFee(): number {
    return this.deliveryMethod === 'pickup' ? 0 : this.shippingFeeShip;
  }

  get totalDueToday(): number {
    return Math.max(0, this.depositRequired + this.shippingFee - this.discountAmount);
  }

  get refundExpected(): number {
    return Math.max(0, this.depositRequired - this.rentFeeExpected);
  }

  get periodMessage(): string {
    if (!this.startDate || !this.endDate) {
      return 'Vui lòng chọn ngày nhận và ngày trả.';
    }
    if (!this.rentalDays) {
      return 'Ngày trả phải sau ngày nhận ít nhất 1 ngày.';
    }
    if (this.rentalDays > this.maxDays) {
      return `Thời gian thuê tối đa ${this.maxDays} ngày.`;
    }
    return '';
  }

  formatCurrency(value: number): string {
    return `${value.toLocaleString('vi-VN')}đ`;
  }

  openAddressList(): void {
    this.router.navigate(['/profile/addresses'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  addAddress(): void {
    this.router.navigate(['/profile/addresses'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  onGuestProvinceChange(provinceCode: string): void {
    this.guestProvinceCode = provinceCode;
    this.guestWardCode = '';
    this.guestWards = [];
    this.guestForm.address.province = this.getOptionNameByCode(this.provinces, provinceCode);
    this.guestForm.address.district = '';
    this.guestForm.address.ward = '';

    if (!provinceCode) {
      return;
    }

    this.loadGuestWards(provinceCode);
  }

  onGuestWardChange(wardCode: string): void {
    this.guestWardCode = wardCode;
    this.guestForm.address.ward = this.getOptionNameByCode(this.guestWards, wardCode);
  }

  getProvincePlaceholder(): string {
    return this.isLoadingProvinces ? 'Đang tải tỉnh/thành phố...' : 'Chọn tỉnh/thành phố';
  }

  getGuestWardPlaceholder(): string {
    if (!this.guestProvinceCode) {
      return 'Chọn tỉnh/thành phố trước';
    }

    if (this.isLoadingGuestWards) {
      return 'Đang tải xã/phường/đặc khu...';
    }

    return 'Chọn xã/phường/đặc khu';
  }

  showGuestWardHint(): boolean {
    return Boolean(this.guestProvinceCode && !this.isLoadingGuestWards && !this.guestWards.length);
  }

  openTerms(): void {
    this.showTerms = true;
  }

  closeTerms(): void {
    this.showTerms = false;
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.rentOrderResult = null;
    this.clearStoredRentalState();
    this.navigateToCurrentProductDetail();
  }

  confirmRental(): void {
    if (this.isSubmitting) return;
    this.formError = '';

    if (!this.isPeriodValid) {
      this.formError = 'Vui lòng chọn thời gian thuê hợp lệ.';
      return;
    }

    if (!this.agreeTerms) {
      this.formError = 'Vui lòng đồng ý điều khoản thuê trước khi đặt.';
      return;
    }

    if (this.deliveryMethod === 'ship' && this.isLoggedIn && !this.selectedAddress) {
      this.formError = 'Vui lòng chọn địa chỉ giao hàng.';
      return;
    }

    if (!this.isLoggedIn) {
      const guestError = this.validateGuestForm();
      if (guestError) {
        this.formError = guestError;
        return;
      }

      this.isSubmitting = true;
      const guestPayload = this.buildGuestPayload();
      this.guestCustomerService.createGuestCustomer(guestPayload).subscribe({
        next: (response) => {
          const guestId = response?.data?.guest_id;
          const payload = this.buildRentOrderPayload({ guestId, guest: guestPayload });
          if (!payload) {
            this.formError = 'Thiếu thông tin để tạo đơn thuê.';
            this.isSubmitting = false;
            return;
          }
          this.submitRentOrder(payload);
        },
        error: (error) => {
          console.error('Create guest customer failed:', error);
          this.formError =
            error?.error?.message || 'Không thể lưu thông tin khách. Vui lòng thử lại.';
          this.isSubmitting = false;
        },
      });
      return;
    }

    const payload = this.buildRentOrderPayload();
    if (!payload) {
      this.formError = 'Thiếu thông tin để tạo đơn thuê.';
      return;
    }

    this.isSubmitting = true;
    this.submitRentOrder(payload);
  }

  private submitRentOrder(payload: CreateRentOrderPayload): void {
    this.rentOrderService.createRentOrder(payload).subscribe({
      next: (response) => {
        const data: any = response?.data?.order || response?.data || {};
        const orderCode =
          data?.rent_order_code || data?.rentOrderCode || this.generateFallbackCode();
        this.rentOrderResult = {
          orderCode,
          startDate: data?.rental_period?.start_date || this.startDate,
          endDate: data?.rental_period?.end_date || this.endDate,
          rentFeeExpected: data?.pricing?.rent_fee_expected ?? this.rentFeeExpected,
          depositPaid: data?.payment?.deposit_paid ?? this.totalDueToday,
          status: data?.rent_status || 'booked',
        };
        this.clearStoredRentalState();
        this.toastService.success(`Đặt thuê thành công! Mã đơn: ${orderCode}`);
        this.navigateToCurrentProductDetail();
      },
      error: (error) => {
        console.error('Create rent order failed:', error);
        this.formError =
          error?.error?.message || 'Không thể tạo đơn thuê. Vui lòng thử lại.';
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      },
    });
  }

  private getRentalState(): any {
    const navState = this.router.getCurrentNavigation()?.extras?.state as any;
    if (navState?.rental) return navState.rental;
    if ((history.state as any)?.rental) return (history.state as any).rental;
    return this.getStoredRentalState();
  }

  private getStoredRentalState(): any {
    try {
      return JSON.parse(sessionStorage.getItem('rentalCheckout') || 'null');
    } catch {
      return null;
    }
  }

  private clearStoredRentalState(): void {
    sessionStorage.removeItem('rentalCheckout');
  }

  private applyRentalState(state: any): void {
    if (!state) return;
    this.product = {
      ...this.product,
      id: state.productId || this.product.id,
      name: state.name || this.product.name,
      sku: state.sku || this.product.sku,
      thumbnail: state.thumbnail || this.product.thumbnail,
      rentPricePerDay: state.rentPricePerDay ?? this.product.rentPricePerDay,
      depositAmount: state.depositAmount ?? this.product.depositAmount,
      color: state.color || this.product.color,
      size: state.size || this.product.size,
      quantity: state.quantity || this.product.quantity,
      inStock: state.inStock ?? this.product.inStock,
    };
  }

  private loadProduct(productId: string, state?: any): void {
    this.productService.getProductById(productId).subscribe({
      next: (response) => {
        this.rawProduct = response.data;
        this.setProductFromApi(response.data, state);
      },
      error: (error) => {
        console.error('Load rental product failed:', error);
      },
    });
  }

  private setProductFromApi(product: Product, state?: any): void {
    const image =
      this.resolveImage(product.thumbnail) ||
      this.resolveImage(product.images?.[0]) ||
      this.product.thumbnail;
    const size = state?.size || product.attributes?.sizes?.[0] || product.sizes?.[0] || '';
    const color = state?.color || product.attributes?.colors?.[0] || product.colors?.[0] || '';
    const quantity = state?.quantity || 1;

    this.product = {
      id: product.product_id?.toString() || product.productId || this.product.id,
      name: product.name || this.product.name,
      sku: state?.sku || product.sku || '',
      thumbnail: image,
      rentPricePerDay: product.price_rent || 0,
      depositAmount: product.deposit_amount || 0,
      color,
      size,
      quantity,
      inStock: this.productService.isInStock(product),
    };
  }

  private loadAddresses(): void {
    this.addressService.getAddresses().subscribe({
      next: (response) => {
        const data: any = response?.data;
        const list = Array.isArray(data) ? data : data?.addresses || [];
        this.addresses = list;
        this.selectedAddress =
          list.find((addr: Address) => addr.is_default || addr.isDefault) || list[0] || null;
        this.updateDefaultAddress();
      },
      error: () => {
        this.addresses = [];
        this.selectedAddress = null;
        this.updateDefaultAddress();
      },
    });
  }

  private updateDefaultAddress(): void {
    if (!this.selectedAddress) {
      this.defaultAddress = {
        receiver: 'Chưa có địa chỉ',
        phone: '',
        address: 'Vui lòng thêm địa chỉ giao hàng.',
      };
      return;
    }

    const receiver =
      this.selectedAddress.receiver_name ||
      this.selectedAddress.recipientName ||
      'Người nhận';
    const phone = this.selectedAddress.phone || '';
    const address = this.formatAddress(this.selectedAddress);

    this.defaultAddress = { receiver, phone, address };
  }

  private formatAddress(address: Address): string {
    const parts = [address.address_detail || address.address || '', address.ward || '', address.province || '']
      .map((part) => part.toString().trim())
      .filter(Boolean);
    return parts.join(', ') || 'Chưa có địa chỉ';
  }

  private buildRentOrderPayload(params?: {
    guestId?: string;
    guest?: GuestCustomerPayload;
  }): CreateRentOrderPayload | null {
    if (!this.product.id) return null;

    const currentUser = this.authService.currentUserValue as any;
    const isGuest = !this.isLoggedIn;
    const userId = isGuest ? null : currentUser?.customerId || currentUser?.user_id || null;
    const guestId = isGuest ? params?.guestId || null : null;
    const guest = params?.guest;
    const contactName = isGuest
      ? guest?.full_name || ''
      : this.selectedAddress?.receiver_name ||
        this.selectedAddress?.recipientName ||
        currentUser?.fullName ||
        '';
    const contactPhone = isGuest
      ? guest?.phone || ''
      : this.selectedAddress?.phone || currentUser?.phone || '';
    const contactEmail = isGuest ? guest?.email || null : currentUser?.email || null;

    if (!contactName || !contactPhone) return null;

    if (isGuest && !guestId) return null;

    const addressPayload =
      this.deliveryMethod === 'ship'
        ? isGuest
          ? {
              province: guest?.address?.province || '',
              district: '',
              ward: guest?.address?.ward || '',
              address_detail: guest?.address?.detail || '',
            }
          : {
              province: this.selectedAddress?.province || '',
              district: '',
              ward: this.selectedAddress?.ward || '',
              address_detail:
                this.selectedAddress?.address_detail || this.selectedAddress?.address || '',
            }
        : null;

    const depositPaid = this.totalDueToday;
    const paymentStatus = 'paid';

    return {
      user_id: userId,
      guest_id: guestId,
      customer_info: {
        full_name: contactName,
        phone: contactPhone,
        email: contactEmail,
        delivery_method: this.deliveryMethod,
        address: addressPayload,
      },
      item: {
        product_id: this.product.id,
        sku: this.product.sku || `${this.product.id}`,
        name_snapshot: this.product.name,
        thumbnail_snapshot: this.product.thumbnail,
        rent_price_per_day: this.product.rentPricePerDay,
        deposit_amount: this.product.depositAmount,
        quantity: this.product.quantity,
      },
      rental_period: {
        start_date: new Date(this.startDate).toISOString(),
        end_date: new Date(this.endDate).toISOString(),
        days: this.rentalDays,
      },
      pricing: {
        rent_fee_expected: this.rentFeeExpected,
        deposit_required: this.depositRequired,
        shipping_fee: this.shippingFee,
        discount_amount: this.discountAmount,
        total_due_today: this.totalDueToday,
        refund_expected: this.refundExpected,
      },
      payment: {
        payment_method: this.paymentMethod,
        deposit_paid: depositPaid,
        payment_status: paymentStatus,
        paid_at: depositPaid > 0 ? new Date().toISOString() : null,
      },
      rent_status: 'booked',
      note: '',
    };
  }

  private validateGuestForm(): string | null {
    const name = this.guestForm.full_name?.trim();
    const phone = this.guestForm.phone?.trim();
    const email = this.guestForm.email?.trim();
    const address = this.guestForm.address || {
      province: '',
      district: '',
      ward: '',
      detail: '',
    };

    if (!name || !phone || !address.province?.trim() || !address.ward?.trim() || !address.detail?.trim()) {
      return 'Vui lòng điền đầy đủ thông tin khách thuê.';
    }

    if (!this.vietnamPhonePattern.test(phone)) {
      return 'Số điện thoại chưa đúng định dạng Việt Nam.';
    }

    if (address.detail.trim().length < 6) {
      return 'Địa chỉ chi tiết cần có ít nhất 6 ký tự.';
    }

    if (email && !this.emailPattern.test(email)) {
      return 'Email không hợp lệ.';
    }

    return null;
  }

  private buildGuestPayload(): GuestCustomerPayload {
    return {
      full_name: this.guestForm.full_name.trim(),
      phone: this.guestForm.phone.trim(),
      email: this.guestForm.email?.trim() || '',
      address: {
        province: this.guestForm.address.province.trim(),
        district: '',
        ward: this.guestForm.address.ward.trim(),
        detail: this.guestForm.address.detail.trim(),
      },
    };
  }

  private generateFallbackCode(): string {
    const now = new Date();
    const datePart = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    return `PHUC-RNT-${datePart}0001`;
  }

  private navigateToCurrentProductDetail(): void {
    const productId = String(this.product.id || '').trim();
    if (productId) {
      this.router.navigate(['/products', productId]);
      return;
    }

    this.router.navigate(['/products']);
  }

  private resolveImage(image?: string): string {
    if (!image) return '';
    return image;
  }

  private loadAdministrativeOptions(): void {
    this.isLoadingProvinces = true;

    this.vietnamAdministrativeService.getProvinces().subscribe({
      next: (provinces) => {
        this.provinces = provinces;
        this.isLoadingProvinces = false;

        if (!provinces.length) {
          this.administrativeNote =
            'Không tải được danh mục tỉnh, thành phố. Vui lòng thử lại sau.';
          return;
        }

        this.administrativeNote =
          'Theo mô hình hành chính 2 cấp áp dụng từ 01/07/2025, thông tin thuê dùng Tỉnh/Thành phố và Xã/Phường/Đặc khu.';
        this.syncGuestSelectionsFromCurrentValue();
      },
      error: (error) => {
        console.error('Load provinces failed:', error);
        this.isLoadingProvinces = false;
        this.administrativeNote =
          'Không tải được danh mục tỉnh, thành phố. Vui lòng thử lại sau.';
      },
    });
  }

  private loadGuestWards(provinceCode: string, existingWardName = ''): void {
    this.isLoadingGuestWards = true;

    this.vietnamAdministrativeService.getWardsByProvinceCode(provinceCode).subscribe({
      next: (wards) => {
        this.guestWards = wards;
        this.isLoadingGuestWards = false;

        if (existingWardName) {
          const selectedCode = this.findOptionCodeByName(wards, existingWardName);
          this.guestWardCode = selectedCode;
          if (selectedCode) {
            this.guestForm.address.ward = this.getOptionNameByCode(wards, selectedCode);
          }
        }
      },
      error: (error) => {
        console.error('Load guest wards failed:', error);
        this.guestWards = [];
        this.isLoadingGuestWards = false;
      },
    });
  }

  private syncGuestSelectionsFromCurrentValue(): void {
    const provinceCode = this.findOptionCodeByName(this.provinces, this.guestForm.address.province);
    if (!provinceCode) {
      return;
    }

    this.guestProvinceCode = provinceCode;
    this.loadGuestWards(provinceCode, this.guestForm.address.ward);
  }

  private getOptionNameByCode(options: AdministrativeOption[], code: string): string {
    return options.find((option) => option.code === code)?.name || '';
  }

  private findOptionCodeByName(options: AdministrativeOption[], name: string): string {
    const normalizedName = this.normalizeAdministrativeName(name);
    if (!normalizedName) {
      return '';
    }

    return (
      options.find(
        (option) => this.normalizeAdministrativeName(option.name) === normalizedName,
      )?.code || ''
    );
  }

  private normalizeAdministrativeName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\b(thanh pho|tp\.?|tinh)\b/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private parseDate(value: string): Date | null {
    if (!value) return null;
    const [year, month, day] = value.split('-').map((part) => Number(part));
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }
}
