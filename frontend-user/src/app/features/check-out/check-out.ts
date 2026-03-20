import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AccountService,
  LoyaltyVoucher,
} from '../../services/account.service';
import { CartItem, CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { AddressService } from '../../services/address.service';
import { Address } from '../../services/user.service';
import {
  CheckoutCustomerInfo,
  CheckoutPayload,
  CheckoutService,
} from '../../services/checkout.service';
import {
  AdministrativeOption,
  VietnamAdministrativeService,
} from '../../services/vietnam-administrative.service';
import { ToastService } from '../../services/toast.service';
import { LoginPromptModalComponent } from '../../shared/components/login-prompt-modal/login-prompt-modal';

interface ShippingOption {
  id: string;
  label: string;
  provider: string;
  fee: number;
  eta: string;
}

interface PaymentOption {
  id: 'cod' | 'bank_transfer' | 'vnpay' | 'momo';
  label: string;
  description: string;
}

type GuestFieldKey = 'full_name' | 'phone' | 'email' | 'province' | 'ward' | 'detail';
type NewAddressFieldKey =
  | 'receiver_name'
  | 'phone'
  | 'province'
  | 'ward'
  | 'address_detail';

@Component({
  selector: 'app-check-out',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LoginPromptModalComponent],
  templateUrl: './check-out.html',
  styleUrl: './check-out.css',
})
export class CheckOut implements OnInit, OnDestroy {
  items: CartItem[] = [];
  isLoggedIn = false;
  isBuyNow = false;
  formError = '';
  isPlacingOrder = false;

  addresses: Address[] = [];
  selectedAddress: Address | null = null;
  showAddressModal = false;
  showAddressForm = false;
  newAddress: Address = this.createEmptyAddress();

  guestInfo: CheckoutCustomerInfo = {
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
  newAddressWards: AdministrativeOption[] = [];
  guestProvinceCode = '';
  guestWardCode = '';
  newAddressProvinceCode = '';
  newAddressWardCode = '';
  isLoadingProvinces = false;
  isLoadingGuestWards = false;
  isLoadingNewAddressWards = false;
  administrativeNote = '';

  guestFieldTouched: Record<GuestFieldKey, boolean> = this.createGuestTouchedState();
  newAddressFieldTouched: Record<NewAddressFieldKey, boolean> =
    this.createNewAddressTouchedState();

  shippingOptions: ShippingOption[] = [
    {
      id: 'standard',
      label: 'Tiêu chuẩn',
      provider: 'GHTK',
      fee: 30000,
      eta: 'Dự kiến 3-5 ngày',
    },
    {
      id: 'express',
      label: 'Nhanh',
      provider: 'GHN',
      fee: 50000,
      eta: 'Dự kiến 1-2 ngày',
    },
  ];
  selectedShippingId = 'standard';

  paymentOptions: PaymentOption[] = [
    {
      id: 'cod',
      label: 'Thanh toán khi nhận hàng (COD)',
      description: 'Trả tiền mặt khi nhận hàng',
    },
    {
      id: 'bank_transfer',
      label: 'Thanh toán bằng thẻ Visa',
      description: 'Sử dụng thẻ Visa để thanh toán',
    },
    {
      id: 'vnpay',
      label: 'VNPay',
      description: 'Thanh toán bằng VNPay',
    },
    {
      id: 'momo',
      label: 'Ví MoMo',
      description: 'Thanh toán bằng ví MoMo',
    },
  ];
  paymentMethod: PaymentOption['id'] = 'cod';

  note = '';
  showVoucherModal = false;
  showVoucherLoginPrompt = false;
  isLoadingLoyaltyVouchers = false;
  loyaltyVoucherError = '';
  loyaltyPoints = 0;
  loyaltyTierName = 'Classic';
  loyaltyVouchers: LoyaltyVoucher[] = [];
  selectedVoucher: LoyaltyVoucher | null = null;

  private subscriptions: Subscription[] = [];
  private readonly vietnamPhonePattern = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly fallbackLoyaltyVouchers: LoyaltyVoucher[] = [
    {
      id: 'heritage-ship-30k',
      title: 'Heritage Freeship',
      description: 'Giảm 30.000đ phí vận chuyển khi đạt từ 300 điểm thưởng.',
      required_points: 300,
      discount_type: 'shipping',
      discount_value: 30000,
      tier_name: 'Heritage',
      is_eligible: false,
      points_shortfall: 300,
    },
    {
      id: 'royal-product-100k',
      title: 'Royal Product 100K',
      description: 'Giảm 100.000đ trên giá sản phẩm khi đạt từ 1000 điểm thưởng.',
      required_points: 1000,
      discount_type: 'product',
      discount_value: 100000,
      tier_name: 'Royal',
      is_eligible: false,
      points_shortfall: 1000,
    },
  ];

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private accountService: AccountService,
    private addressService: AddressService,
    private checkoutService: CheckoutService,
    private vietnamAdministrativeService: VietnamAdministrativeService,
    private toastService: ToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.loadAdministrativeOptions();

    this.subscriptions.push(
      this.authService.currentUser$.subscribe((user) => {
        this.isLoggedIn = !!user;
        this.syncLoyaltyFromCurrentUser();
        if (this.isLoggedIn) {
          this.loadAddresses();
        } else {
          this.selectedVoucher = null;
          this.loyaltyVouchers = this.buildFallbackLoyaltyVouchers(0);
        }
      }),
    );

    const buyNowItems = this.cartService.getBuyNowItems();
    if (buyNowItems && buyNowItems.length > 0) {
      this.items = buyNowItems;
      this.isBuyNow = true;
    } else {
      this.isBuyNow = false;
      if (this.isLoggedIn) {
        this.cartService.loadCart().subscribe({
          next: (res) => {
            this.items = res.items;
          },
          error: (err) => {
            console.error('Load cart failed:', err);
          },
        });
      }
    }

    this.subscriptions.push(
      this.cartService.items$.subscribe((items) => {
        if (!this.isBuyNow) {
          this.items = items;
        }
      }),
    );

    if (this.isLoggedIn) {
      this.loadAddresses();
      this.loadLoyaltyVouchers();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  loadAddresses(): void {
    this.addressService.getAddresses().subscribe({
      next: (response) => {
        const raw = response.data as any;
        const list = Array.isArray(raw) ? raw : raw?.addresses || [];
        this.addresses = list;
        this.selectedAddress =
          list.find((addr: Address) => addr.is_default || addr.isDefault) || list[0] || null;
      },
      error: (err) => {
        console.error('Load addresses failed:', err);
      },
    });
  }

  openAddressModal(): void {
    this.showAddressModal = true;
  }

  closeAddressModal(): void {
    this.showAddressModal = false;
  }

  selectAddress(address: Address): void {
    this.selectedAddress = address;
    this.showAddressModal = false;
  }

  openAddressForm(): void {
    this.newAddress = this.createEmptyAddress();
    this.newAddressFieldTouched = this.createNewAddressTouchedState();
    this.newAddressProvinceCode = '';
    this.newAddressWardCode = '';
    this.newAddressWards = [];
    this.showAddressForm = true;
  }

  closeAddressForm(): void {
    this.showAddressForm = false;
  }

  openVoucherModal(): void {
    if (!this.isLoggedIn) {
      this.showVoucherLoginPrompt = true;
      return;
    }

    this.showVoucherModal = true;
    this.loadLoyaltyVouchers();
  }

  closeVoucherModal(): void {
    this.showVoucherModal = false;
  }

  closeVoucherLoginPrompt(): void {
    this.showVoucherLoginPrompt = false;
  }

  continueWithoutVoucher(): void {
    this.showVoucherLoginPrompt = false;
  }

  goToLoginForVoucher(): void {
    this.showVoucherLoginPrompt = false;
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  applyVoucher(voucher: LoyaltyVoucher): void {
    if (!voucher.is_eligible) {
      return;
    }

    this.selectedVoucher = voucher;
    this.showVoucherModal = false;
  }

  removeVoucher(): void {
    this.selectedVoucher = null;
  }

  saveNewAddress(): void {
    if (!this.validateNewAddressForm()) {
      return;
    }

    const payload: Address = {
      receiver_name: this.newAddress.receiver_name?.trim(),
      phone: this.normalizePhone(this.newAddress.phone || ''),
      province: this.newAddress.province?.trim(),
      district: '',
      ward: this.newAddress.ward?.trim(),
      address_detail: this.newAddress.address_detail?.trim(),
      note: (this.newAddress.note || '').trim(),
      is_default: Boolean(this.newAddress.is_default),
    };

    this.addressService.addAddress(payload).subscribe({
      next: () => {
        this.showAddressForm = false;
        this.loadAddresses();
        this.toastService.success('Đã lưu địa chỉ mới.');
      },
      error: (err) => {
        console.error('Add address failed:', err);
        this.toastService.error('Không thể lưu địa chỉ. Vui lòng thử lại.');
      },
    });
  }

  setDefaultAddress(address: Address): void {
    const addressId = (address.address_id || address._id || '').toString().trim();
    if (!addressId) return;

    this.addressService.setDefaultAddress(addressId).subscribe({
      next: () => {
        this.loadAddresses();
      },
      error: (err) => {
        console.error('Set default address failed:', err);
      },
    });
  }

  onGuestProvinceChange(provinceCode: string): void {
    this.guestProvinceCode = provinceCode;
    this.guestWardCode = '';
    this.guestWards = [];
    this.guestInfo.address.province = this.getOptionNameByCode(this.provinces, provinceCode);
    this.guestInfo.address.district = '';
    this.guestInfo.address.ward = '';
    this.guestFieldTouched.province = true;
    this.guestFieldTouched.ward = false;

    if (!provinceCode) {
      return;
    }

    this.loadGuestWards(provinceCode);
  }

  onGuestWardChange(wardCode: string): void {
    this.guestWardCode = wardCode;
    this.guestInfo.address.ward = this.getOptionNameByCode(this.guestWards, wardCode);
    this.guestFieldTouched.ward = true;
  }

  onNewAddressProvinceChange(provinceCode: string): void {
    this.newAddressProvinceCode = provinceCode;
    this.newAddressWardCode = '';
    this.newAddressWards = [];
    this.newAddress.province = this.getOptionNameByCode(this.provinces, provinceCode);
    this.newAddress.district = '';
    this.newAddress.ward = '';
    this.newAddressFieldTouched.province = true;
    this.newAddressFieldTouched.ward = false;

    if (!provinceCode) {
      return;
    }

    this.loadNewAddressWards(provinceCode);
  }

  onNewAddressWardChange(wardCode: string): void {
    this.newAddressWardCode = wardCode;
    this.newAddress.ward = this.getOptionNameByCode(this.newAddressWards, wardCode);
    this.newAddressFieldTouched.ward = true;
  }

  markGuestFieldTouched(field: GuestFieldKey): void {
    this.guestFieldTouched[field] = true;
  }

  markNewAddressFieldTouched(field: NewAddressFieldKey): void {
    this.newAddressFieldTouched[field] = true;
  }

  getGuestFieldError(field: GuestFieldKey): string {
    if (!this.guestFieldTouched[field]) {
      return '';
    }

    const fullName = this.guestInfo.full_name.trim();
    const phone = this.normalizePhone(this.guestInfo.phone);
    const email = (this.guestInfo.email || '').trim();
    const province = this.guestInfo.address.province.trim();
    const ward = this.guestInfo.address.ward.trim();
    const detail = (this.guestInfo.address.detail || this.guestInfo.address.address_detail || '').trim();

    switch (field) {
      case 'full_name':
        if (!fullName) return 'Vui lòng nhập họ và tên.';
        if (fullName.length < 2) return 'Họ tên cần có ít nhất 2 ký tự.';
        return '';
      case 'phone':
        if (!phone) return 'Vui lòng nhập số điện thoại.';
        if (!this.vietnamPhonePattern.test(phone)) {
          return 'Số điện thoại chưa đúng định dạng Việt Nam.';
        }
        return '';
      case 'email':
        if (!email) return 'Vui lòng nhập email để nhận thông tin theo dõi đơn hàng.';
        if (!this.emailPattern.test(email)) return 'Email chưa đúng định dạng.';
        return '';
      case 'province':
        return province ? '' : 'Vui lòng chọn tỉnh/thành phố.';
      case 'ward':
        return ward ? '' : 'Vui lòng chọn xã/phường/đặc khu.';
      case 'detail':
        if (!detail) return 'Vui lòng nhập địa chỉ chi tiết.';
        if (detail.length < 6) return 'Địa chỉ chi tiết cần có ít nhất 6 ký tự.';
        return '';
      default:
        return '';
    }
  }

  getNewAddressFieldError(field: NewAddressFieldKey): string {
    if (!this.newAddressFieldTouched[field]) {
      return '';
    }

    const receiverName = (this.newAddress.receiver_name || '').trim();
    const phone = this.normalizePhone(this.newAddress.phone || '');
    const province = (this.newAddress.province || '').trim();
    const ward = (this.newAddress.ward || '').trim();
    const detail = (this.newAddress.address_detail || '').trim();

    switch (field) {
      case 'receiver_name':
        if (!receiverName) return 'Vui lòng nhập người nhận.';
        if (receiverName.length < 2) return 'Tên người nhận cần có ít nhất 2 ký tự.';
        return '';
      case 'phone':
        if (!phone) return 'Vui lòng nhập số điện thoại.';
        if (!this.vietnamPhonePattern.test(phone)) {
          return 'Số điện thoại chưa đúng định dạng Việt Nam.';
        }
        return '';
      case 'province':
        return province ? '' : 'Vui lòng chọn tỉnh/thành phố.';
      case 'ward':
        return ward ? '' : 'Vui lòng chọn xã/phường/đặc khu.';
      case 'address_detail':
        if (!detail) return 'Vui lòng nhập địa chỉ chi tiết.';
        if (detail.length < 6) return 'Địa chỉ chi tiết cần có ít nhất 6 ký tự.';
        return '';
      default:
        return '';
    }
  }

  hasGuestFieldError(field: GuestFieldKey): boolean {
    return Boolean(this.getGuestFieldError(field));
  }

  hasNewAddressFieldError(field: NewAddressFieldKey): boolean {
    return Boolean(this.getNewAddressFieldError(field));
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

  getNewAddressWardPlaceholder(): string {
    if (!this.newAddressProvinceCode) {
      return 'Chọn tỉnh/thành phố trước';
    }

    if (this.isLoadingNewAddressWards) {
      return 'Đang tải xã/phường/đặc khu...';
    }

    return 'Chọn xã/phường/đặc khu';
  }

  get selectedShipping(): ShippingOption {
    return (
      this.shippingOptions.find((option) => option.id === this.selectedShippingId) ||
      this.shippingOptions[0]
    );
  }

  get subtotal(): number {
    return this.productOriginalSubtotal - this.productDiscountAmount;
  }

  get productOriginalSubtotal(): number {
    return this.items.reduce(
      (sum, item) => sum + this.getItemOriginalUnitPrice(item) * item.quantity,
      0,
    );
  }

  get baseProductDiscountAmount(): number {
    return this.items.reduce(
      (sum, item) => sum + this.getItemProductDiscount(item) * item.quantity,
      0,
    );
  }

  get voucherProductDiscountAmount(): number {
    if (this.selectedVoucher?.discount_type !== 'product') {
      return 0;
    }

    const maxProductDiscount = Math.max(0, this.productOriginalSubtotal - this.baseProductDiscountAmount);
    return Math.min(this.selectedVoucher.discount_value, maxProductDiscount);
  }

  get productDiscountAmount(): number {
    return this.baseProductDiscountAmount + this.voucherProductDiscountAmount;
  }

  get shippingFee(): number {
    return this.items.length ? this.selectedShipping.fee : 0;
  }

  get shippingDiscountAmount(): number {
    if (this.selectedVoucher?.discount_type !== 'shipping') {
      return 0;
    }

    return Math.min(this.selectedVoucher.discount_value, this.shippingFee);
  }

  get shippingSubtotal(): number {
    return this.shippingFee - this.shippingDiscountAmount;
  }

  get discountAmount(): number {
    return this.voucherProductDiscountAmount + this.shippingDiscountAmount;
  }

  get total(): number {
    return this.subtotal + this.shippingSubtotal;
  }

  itemKey(item: CartItem): string {
    return item.cart_item_id || `${item.product_id}`;
  }

  getVariantLabel(item: CartItem): string {
    const parts = [];
    if (item.size) parts.push(item.size);
    if (item.color) parts.push(item.color);
    return parts.length ? parts.join(' - ') : 'Mặc định';
  }

  getImageUrl(item: CartItem): string {
    return item.thumbnail_snapshot || 'assets/images/placeholder.jpg';
  }

  itemTotal(item: CartItem): number {
    return item.price_snapshot * item.quantity;
  }

  get voucherButtonLabel(): string {
    return this.selectedVoucher ? 'Đổi voucher' : 'Chọn voucher';
  }

  get appliedVoucherLabel(): string {
    if (!this.selectedVoucher) {
      return '';
    }

    return `${this.selectedVoucher.title} - ${this.formatCurrency(this.getVoucherDiscountPreview(this.selectedVoucher))}`;
  }

  get hasVoucherApplied(): boolean {
    return Boolean(this.selectedVoucher);
  }

  getVoucherDiscountPreview(voucher: LoyaltyVoucher): number {
    if (voucher.discount_type === 'shipping') {
      return Math.min(voucher.discount_value, this.shippingFee);
    }

    const maxProductDiscount = Math.max(0, this.productOriginalSubtotal - this.baseProductDiscountAmount);
    return Math.min(voucher.discount_value, maxProductDiscount);
  }

  getVoucherStatusLabel(voucher: LoyaltyVoucher): string {
    if (voucher.is_eligible) {
      return 'Đủ điểm để nhận voucher';
    }

    return `Chưa đủ điểm để nhận voucher`;
  }

  getVoucherActionLabel(voucher: LoyaltyVoucher): string {
    if (this.selectedVoucher?.id === voucher.id) {
      return 'Đang áp dụng';
    }

    if (voucher.is_eligible) {
      return 'Áp dụng';
    }

    return `Thiếu ${voucher.points_shortfall.toLocaleString('vi-VN')} điểm`;
  }

  formatCurrency(value: number): string {
    return `${Math.max(0, Number(value) || 0).toLocaleString('vi-VN')}đ`;
  }

  formatAddress(address: Address): string {
    const parts = [address.address_detail || address.address, address.ward, address.province]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean);
    return parts.join(', ');
  }

  buildCustomerInfoFromAddress(address: Address): CheckoutCustomerInfo {
    const normalizedPhone = this.normalizePhone(address.phone || '');
    const detail = (address.address_detail || address.address || '').toString();

    return {
      full_name: address.receiver_name || address.recipientName || '',
      phone: normalizedPhone,
      email: this.authService.currentUserValue?.email || '',
      address: {
        province: (address.province || '').toString().trim(),
        district: '',
        ward: (address.ward || '').toString().trim(),
        detail: detail.trim(),
      },
    };
  }

  placeOrder(): void {
    if (this.isPlacingOrder) return;
    this.formError = '';

    if (!this.items.length) {
      this.formError = 'Không có sản phẩm để thanh toán.';
      return;
    }

    if (this.isLoggedIn) {
      if (!this.selectedAddress) {
        this.formError = 'Vui lòng chọn địa chỉ nhận hàng.';
        return;
      }
    } else if (!this.validateGuestCheckoutForm()) {
      this.formError = 'Vui lòng kiểm tra lại thông tin giao hàng.';
      return;
    }

    const payload: CheckoutPayload = {
      shipping_provider: this.selectedShipping.provider,
      shipping_method: this.selectedShipping.id,
      shipping_fee: this.shippingFee,
      discount_amount: this.discountAmount,
      loyalty_voucher_id: this.selectedVoucher?.id || null,
      payment_method: this.paymentMethod,
      note: this.note,
    };

    if (this.isLoggedIn) {
      const rawAddressId = (this.selectedAddress?.address_id || '').toString().trim();
      const rawObjectId = (this.selectedAddress?._id || '').toString().trim();

      if (rawAddressId) {
        payload.address_id = rawAddressId;
      } else if (rawObjectId && rawObjectId !== '[object Object]') {
        payload.address_id = rawObjectId;
      } else if (this.selectedAddress) {
        payload.customer_info = this.buildCustomerInfoFromAddress(this.selectedAddress);
      }
    } else {
      const trimmedFullName = this.guestInfo.full_name.trim();
      const normalizedPhone = this.normalizePhone(this.guestInfo.phone);
      const normalizedEmail = (this.guestInfo.email || '').trim();
      const trimmedProvince = this.guestInfo.address.province.trim();
      const trimmedWard = this.guestInfo.address.ward.trim();
      const trimmedDetail = (
        this.guestInfo.address.detail ||
        this.guestInfo.address.address_detail ||
        ''
      ).trim();

      payload.customer_info = {
        full_name: trimmedFullName,
        phone: normalizedPhone,
        email: normalizedEmail,
        address: {
          province: trimmedProvince,
          district: '',
          ward: trimmedWard,
          detail: trimmedDetail,
        },
      };
    }

    if (this.isBuyNow) {
      payload.items = this.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        size: item.size ?? null,
        color: item.color ?? null,
      }));
    } else if (!this.isLoggedIn) {
      payload.items = this.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        size: item.size ?? null,
        color: item.color ?? null,
      }));
    }

    this.isPlacingOrder = true;
    this.checkoutService.createCheckout(payload).subscribe({
      next: (res) => {
        const orderCode = res?.data?.order?.order_code || res?.data?.order?.orderCode || '';
        const buyNowProductId = this.isBuyNow ? this.getPrimaryProductId() : '';

        if (this.isBuyNow) {
          this.cartService.clearBuyNowItems();
        } else {
          this.cartService.refreshCart();
        }

        this.toastService.success(
          orderCode ? `Đặt hàng thành công! Mã đơn: ${orderCode}` : 'Đặt hàng thành công!',
        );
        if (buyNowProductId) {
          this.router.navigate(['/products', buyNowProductId]);
          return;
        }

        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Checkout failed:', err);
        if (err?.error?.errors) {
          console.log('Checkout validation errors:', err.error.errors);
        }

        const apiMessage = err?.error?.message;
        const apiErrors = Array.isArray(err?.error?.errors) ? err.error.errors : [];

        if (apiErrors.length > 0) {
          const detail = apiErrors.map((error: any) => error.message).join(', ');
          this.formError = apiMessage ? `${apiMessage}: ${detail}` : detail;
        } else {
          this.formError = apiMessage || 'Có lỗi khi đặt hàng. Vui lòng thử lại.';
        }

        this.isPlacingOrder = false;
      },
      complete: () => {
        this.isPlacingOrder = false;
      },
    });
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  private loadLoyaltyVouchers(): void {
    if (!this.isLoggedIn) {
      return;
    }

    this.isLoadingLoyaltyVouchers = true;
    this.loyaltyVoucherError = '';

    this.accountService.getLoyaltyVouchers().subscribe({
      next: (response) => {
        const loyalty = response?.data?.loyalty || {};
        const points = Math.max(0, Number(loyalty.total_points) || 0);
        this.loyaltyPoints = points;
        this.loyaltyTierName = loyalty.tier_name || this.resolveTierName(points);
        this.loyaltyVouchers =
          response?.data?.vouchers?.length
            ? response.data.vouchers
            : this.buildFallbackLoyaltyVouchers(points);
        this.syncSelectedVoucherFromLatestData();
        this.isLoadingLoyaltyVouchers = false;
        this.updateCurrentUserPoints(points);
      },
      error: (error) => {
        console.error('Load loyalty vouchers failed:', error);
        const fallbackPoints = Math.max(0, Number(this.authService.currentUserValue?.loyalty?.total_points) || 0);
        this.loyaltyPoints = fallbackPoints;
        this.loyaltyTierName = this.resolveTierName(fallbackPoints);
        this.loyaltyVouchers = this.buildFallbackLoyaltyVouchers(fallbackPoints);
        this.syncSelectedVoucherFromLatestData();
        this.loyaltyVoucherError = 'Không tải được dữ liệu voucher. Đang dùng điểm hiện có để hiển thị tạm.';
        this.isLoadingLoyaltyVouchers = false;
      },
    });
  }

  private loadAdministrativeOptions(): void {
    this.isLoadingProvinces = true;

    this.subscriptions.push(
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
            'Theo mô hình hành chính 2 cấp áp dụng từ 01/07/2025, checkout dùng Tỉnh/Thành phố và Xã/Phường/Đặc khu.';
          this.syncGuestSelectionsFromCurrentValue();
        },
        error: (error) => {
          console.error('Load provinces failed:', error);
          this.isLoadingProvinces = false;
          this.administrativeNote =
            'Không tải được danh mục tỉnh, thành phố. Vui lòng thử lại sau.';
        },
      }),
    );
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
            this.guestInfo.address.ward = this.getOptionNameByCode(wards, selectedCode);
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

  private loadNewAddressWards(provinceCode: string, existingWardName = ''): void {
    this.isLoadingNewAddressWards = true;

    this.vietnamAdministrativeService.getWardsByProvinceCode(provinceCode).subscribe({
      next: (wards) => {
        this.newAddressWards = wards;
        this.isLoadingNewAddressWards = false;

        if (existingWardName) {
          const selectedCode = this.findOptionCodeByName(wards, existingWardName);
          this.newAddressWardCode = selectedCode;
          if (selectedCode) {
            this.newAddress.ward = this.getOptionNameByCode(wards, selectedCode);
          }
        }
      },
      error: (error) => {
        console.error('Load new address wards failed:', error);
        this.newAddressWards = [];
        this.isLoadingNewAddressWards = false;
      },
    });
  }

  private syncGuestSelectionsFromCurrentValue(): void {
    const provinceCode = this.findOptionCodeByName(this.provinces, this.guestInfo.address.province);
    if (!provinceCode) {
      return;
    }

    this.guestProvinceCode = provinceCode;
    this.loadGuestWards(provinceCode, this.guestInfo.address.ward);
  }

  private validateGuestCheckoutForm(): boolean {
    this.guestFieldTouched = {
      full_name: true,
      phone: true,
      email: true,
      province: true,
      ward: true,
      detail: true,
    };

    return (
      !this.getGuestFieldError('full_name') &&
      !this.getGuestFieldError('phone') &&
      !this.getGuestFieldError('email') &&
      !this.getGuestFieldError('province') &&
      !this.getGuestFieldError('ward') &&
      !this.getGuestFieldError('detail')
    );
  }

  private validateNewAddressForm(): boolean {
    this.newAddressFieldTouched = {
      receiver_name: true,
      phone: true,
      province: true,
      ward: true,
      address_detail: true,
    };

    return (
      !this.getNewAddressFieldError('receiver_name') &&
      !this.getNewAddressFieldError('phone') &&
      !this.getNewAddressFieldError('province') &&
      !this.getNewAddressFieldError('ward') &&
      !this.getNewAddressFieldError('address_detail')
    );
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\s+/g, '').trim();
  }

  private createEmptyAddress(): Address {
    return {
      receiver_name: '',
      phone: '',
      province: '',
      district: '',
      ward: '',
      address_detail: '',
      note: '',
      is_default: false,
    };
  }

  private createGuestTouchedState(): Record<GuestFieldKey, boolean> {
    return {
      full_name: false,
      phone: false,
      email: false,
      province: false,
      ward: false,
      detail: false,
    };
  }

  private createNewAddressTouchedState(): Record<NewAddressFieldKey, boolean> {
    return {
      receiver_name: false,
      phone: false,
      province: false,
      ward: false,
      address_detail: false,
    };
  }

  private syncLoyaltyFromCurrentUser(): void {
    const points = Math.max(0, Number(this.authService.currentUserValue?.loyalty?.total_points) || 0);
    this.loyaltyPoints = points;
    this.loyaltyTierName = this.resolveTierName(points);
    if (!this.loyaltyVouchers.length) {
      this.loyaltyVouchers = this.buildFallbackLoyaltyVouchers(points);
    }
  }

  private updateCurrentUserPoints(points: number): void {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      return;
    }

    this.authService.updateCurrentUser({
      ...currentUser,
      loyalty: {
        ...(currentUser.loyalty || {}),
        total_points: points,
      },
    });
  }

  private resolveTierName(points: number): string {
    if (points >= 1000) {
      return 'Royal';
    }

    if (points >= 300) {
      return 'Heritage';
    }

    return 'Classic';
  }

  private buildFallbackLoyaltyVouchers(points: number): LoyaltyVoucher[] {
    const normalizedPoints = Math.max(0, Number(points) || 0);
    return this.fallbackLoyaltyVouchers.map((voucher) => ({
      ...voucher,
      is_eligible: normalizedPoints >= voucher.required_points,
      points_shortfall:
        normalizedPoints >= voucher.required_points ? 0 : voucher.required_points - normalizedPoints,
    }));
  }

  private syncSelectedVoucherFromLatestData(): void {
    if (!this.selectedVoucher) {
      return;
    }

    const latest = this.loyaltyVouchers.find((voucher) => voucher.id === this.selectedVoucher?.id) || null;
    if (!latest?.is_eligible) {
      this.selectedVoucher = null;
      return;
    }

    this.selectedVoucher = latest;
  }

  private getItemOriginalUnitPrice(item: CartItem): number {
    const originalPrice = Number(item.original_price_snapshot);
    if (Number.isFinite(originalPrice) && originalPrice > 0) {
      return originalPrice;
    }

    const productDiscount = this.getItemProductDiscount(item);
    return item.price_snapshot + productDiscount;
  }

  private getItemProductDiscount(item: CartItem): number {
    const snapshotDiscount = Number(item.product_discount_snapshot);
    if (Number.isFinite(snapshotDiscount) && snapshotDiscount > 0) {
      return snapshotDiscount;
    }

    const originalPrice = Number(item.original_price_snapshot);
    if (Number.isFinite(originalPrice) && originalPrice > item.price_snapshot) {
      return originalPrice - item.price_snapshot;
    }

    return 0;
  }

  private getPrimaryProductId(): string {
    const productId = this.items[0]?.product_id;
    if (productId === null || productId === undefined) {
      return '';
    }

    return String(productId).trim();
  }

  private getOptionNameByCode(options: AdministrativeOption[], code: string): string {
    return options.find((item) => item.code === code)?.name || '';
  }

  private findOptionCodeByName(options: AdministrativeOption[], name: string): string {
    const normalizedTarget = this.normalizeLocationName(name);
    if (!normalizedTarget) {
      return '';
    }

    return (
      options.find((item) => this.normalizeLocationName(item.name) === normalizedTarget)?.code || ''
    );
  }

  private normalizeLocationName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(tp|tp\.|thanh pho|tinh|xa|phuong|dac khu)\b/gi, ' ')
      .replace(/[^a-z0-9]+/gi, ' ')
      .trim()
      .toLowerCase();
  }
}
