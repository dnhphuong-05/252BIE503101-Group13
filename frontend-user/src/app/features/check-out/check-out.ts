import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartItem, CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { AddressService } from '../../services/address.service';
import { Address } from '../../services/user.service';
import { CheckoutService, CheckoutPayload, CheckoutCustomerInfo } from '../../services/checkout.service';

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

@Component({
  selector: 'app-check-out',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
  newAddress: Address = {
    receiver_name: '',
    phone: '',
    province: '',
    district: '',
    ward: '',
    address_detail: '',
    note: '',
    is_default: false,
  };

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
      label: 'Chuyển khoản',
      description: 'Chuyển khoản qua ngân hàng',
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
  discountAmount = 0;

  private subscriptions: Subscription[] = [];

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private addressService: AddressService,
    private checkoutService: CheckoutService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();

    this.subscriptions.push(
      this.authService.currentUser$.subscribe((user) => {
        this.isLoggedIn = !!user;
        if (this.isLoggedIn) {
          this.loadAddresses();
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
    this.newAddress = {
      receiver_name: '',
      phone: '',
      province: '',
      district: '',
      ward: '',
      address_detail: '',
      note: '',
      is_default: false,
    };
    this.showAddressForm = true;
  }

  closeAddressForm(): void {
    this.showAddressForm = false;
  }

  saveNewAddress(): void {
    if (!this.newAddress.receiver_name || !this.newAddress.phone) {
      alert('Vui lòng nhập đầy đủ họ tên và số điện thoại.');
      return;
    }
    if (!this.newAddress.province || !this.newAddress.ward || !this.newAddress.address_detail) {
      alert('Vui lòng nhập đầy đủ địa chỉ.');
      return;
    }

    this.addressService.addAddress(this.newAddress).subscribe({
      next: () => {
        this.showAddressForm = false;
        this.loadAddresses();
      },
      error: (err) => {
        console.error('Add address failed:', err);
        alert('Không thể lưu địa chỉ. Vui lòng thử lại.');
      },
    });
  }

  setDefaultAddress(address: Address): void {
    if (!address.address_id) return;
    this.addressService.setDefaultAddress(address.address_id).subscribe({
      next: () => {
        this.loadAddresses();
      },
      error: (err) => {
        console.error('Set default address failed:', err);
      },
    });
  }

  get selectedShipping(): ShippingOption {
    return (
      this.shippingOptions.find((option) => option.id === this.selectedShippingId) ||
      this.shippingOptions[0]
    );
  }

  get subtotal(): number {
    return this.items.reduce((sum, item) => sum + item.price_snapshot * item.quantity, 0);
  }

  get shippingFee(): number {
    return this.items.length ? this.selectedShipping.fee : 0;
  }

  get total(): number {
    return this.subtotal + this.shippingFee - this.discountAmount;
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

  formatAddress(address: Address): string {
    const parts = [
      address.address_detail || address.address,
      address.ward,
      address.district,
      address.province,
    ]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean);
    return parts.join(', ');
  }

  buildCustomerInfoFromAddress(address: Address): CheckoutCustomerInfo {
    const normalizedPhone = (address.phone || '').toString().replace(/\s+/g, '');
    const detail = (address.address_detail || address.address || '').toString();
    return {
      full_name: address.receiver_name || address.recipientName || '',
      phone: normalizedPhone,
      email: this.authService.currentUserValue?.email || '',
      address: {
        province: (address.province || '').toString().trim(),
        district: (address.district || '').toString().trim(),
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
    } else {
      const trimmedFullName = this.guestInfo.full_name.trim();
      const normalizedPhone = this.guestInfo.phone.replace(/\s+/g, '');
      const trimmedProvince = this.guestInfo.address.province.trim();
      const trimmedWard = this.guestInfo.address.ward.trim();
      const trimmedDetail = (
        this.guestInfo.address.detail ||
        this.guestInfo.address.address_detail ||
        ''
      ).trim();

      if (!trimmedFullName || !normalizedPhone) {
        this.formError = 'Vui lòng nhập họ tên và số điện thoại.';
        return;
      }
      if (!trimmedProvince || !trimmedWard || !trimmedDetail) {
        this.formError = 'Vui lòng nhập đầy đủ địa chỉ nhận hàng.';
        return;
      }
    }

    const payload: CheckoutPayload = {
      shipping_provider: this.selectedShipping.provider,
      shipping_method: this.selectedShipping.id,
      shipping_fee: this.shippingFee,
      discount_amount: this.discountAmount,
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
      const normalizedPhone = this.guestInfo.phone.replace(/\s+/g, '');
      const normalizedEmail = (this.guestInfo.email || '').trim();
      const trimmedProvince = this.guestInfo.address.province.trim();
      const trimmedWard = this.guestInfo.address.ward.trim();
      const trimmedDistrict = (this.guestInfo.address.district || '').trim();
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
          district: trimmedDistrict,
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
    console.log('Checkout payload:', payload);
    this.checkoutService.createCheckout(payload).subscribe({
      next: (res) => {
        const orderCode =
          res?.data?.order?.order_code || res?.data?.order?.orderCode || '';
        if (this.isBuyNow) {
          this.cartService.clearBuyNowItems();
        } else {
          this.cartService.refreshCart();
        }
        alert(
          orderCode
            ? `Đặt hàng thành công! Mã đơn: ${orderCode}`
            : 'Đặt hàng thành công!',
        );
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
          const detail = apiErrors.map((e: any) => e.message).join(', ');
          this.formError = apiMessage ? `${apiMessage}: ${detail}` : detail;
        } else {
          this.formError =
            apiMessage || 'Có lỗi khi đặt hàng. Vui lòng thử lại.';
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
}



