import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  GuestCustomerPayload,
  GuestCustomerService,
} from '../../../services/guest-customer.service';
import {
  AdministrativeOption,
  VietnamAdministrativeService,
} from '../../../services/vietnam-administrative.service';

export interface GuestFormData {
  full_name: string;
  phone: string;
  email: string;
  address: {
    province: string;
    ward: string;
    detail: string;
  };
}

export interface GuestFormErrors {
  full_name: string;
  phone: string;
  email: string;
  address: {
    province: string;
    ward: string;
    detail: string;
  };
}

@Component({
  selector: 'app-guest-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guest-form.html',
  styleUrl: './guest-form.css',
})
export class GuestFormComponent implements OnInit {
  @Input() show = false;
  @Input() productName?: string;
  @Input() quantity?: number;
  @Input() selectedSize?: string;
  @Input() selectedColor?: string;

  @Output() close = new EventEmitter<void>();
  @Output() submitSuccess = new EventEmitter<any>();

  guestForm: GuestFormData = {
    full_name: '',
    phone: '',
    email: '',
    address: {
      province: '',
      ward: '',
      detail: '',
    },
  };

  guestErrors: GuestFormErrors = {
    full_name: '',
    phone: '',
    email: '',
    address: {
      province: '',
      ward: '',
      detail: '',
    },
  };

  provinces: AdministrativeOption[] = [];
  wards: AdministrativeOption[] = [];
  provinceCode = '';
  wardCode = '';
  isLoadingProvinces = false;
  isLoadingWards = false;
  administrativeNote = '';

  isSubmittingGuest = false;
  guestSubmitError = '';

  private readonly vietnamPhonePattern = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(
    private guestCustomerService: GuestCustomerService,
    private vietnamAdministrativeService: VietnamAdministrativeService,
  ) {}

  ngOnInit(): void {
    this.loadAdministrativeOptions();
  }

  closeForm(): void {
    this.close.emit();
  }

  onOverlayClick(): void {
    this.closeForm();
  }

  onProvinceChange(provinceCode: string): void {
    this.provinceCode = provinceCode;
    this.wardCode = '';
    this.wards = [];
    this.guestForm.address.province = this.getOptionNameByCode(this.provinces, provinceCode);
    this.guestForm.address.ward = '';
    this.guestErrors.address.province = '';
    this.guestErrors.address.ward = '';

    if (!provinceCode) {
      return;
    }

    this.loadWards(provinceCode);
  }

  onWardChange(wardCode: string): void {
    this.wardCode = wardCode;
    this.guestForm.address.ward = this.getOptionNameByCode(this.wards, wardCode);
    this.guestErrors.address.ward = '';
  }

  getProvincePlaceholder(): string {
    return this.isLoadingProvinces ? 'Đang tải tỉnh/thành phố...' : 'Chọn tỉnh/thành phố';
  }

  getWardPlaceholder(): string {
    if (!this.provinceCode) {
      return 'Chọn tỉnh/thành phố trước';
    }

    if (this.isLoadingWards) {
      return 'Đang tải xã/phường/đặc khu...';
    }

    return 'Chọn xã/phường/đặc khu';
  }

  showWardHint(): boolean {
    return Boolean(this.provinceCode && !this.isLoadingWards && !this.wards.length);
  }

  submitForm(): void {
    this.resetErrors();
    this.guestSubmitError = '';

    if (!this.validateForm()) {
      return;
    }

    this.isSubmittingGuest = true;

    const payload: GuestCustomerPayload = {
      full_name: this.guestForm.full_name.trim(),
      phone: this.guestForm.phone.trim(),
      email: this.guestForm.email.trim(),
      address: {
        province: this.guestForm.address.province.trim(),
        district: '',
        ward: this.guestForm.address.ward.trim(),
        detail: this.guestForm.address.detail.trim(),
      },
    };

    this.guestCustomerService.createGuestCustomer(payload).subscribe({
      next: (response) => {
        this.isSubmittingGuest = false;
        this.submitSuccess.emit(response.data);
        this.resetForm();
      },
      error: (error) => {
        this.isSubmittingGuest = false;
        this.guestSubmitError = error.error?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
        console.error('Error creating guest customer:', error);
      },
    });
  }

  private validateForm(): boolean {
    let isValid = true;

    if (!this.guestForm.full_name.trim()) {
      this.guestErrors.full_name = 'Họ và tên là bắt buộc';
      isValid = false;
    } else if (this.guestForm.full_name.trim().length < 2) {
      this.guestErrors.full_name = 'Họ và tên phải có ít nhất 2 ký tự';
      isValid = false;
    }

    if (!this.guestForm.phone.trim()) {
      this.guestErrors.phone = 'Số điện thoại là bắt buộc';
      isValid = false;
    } else if (!this.vietnamPhonePattern.test(this.guestForm.phone.trim())) {
      this.guestErrors.phone = 'Số điện thoại chưa đúng định dạng Việt Nam';
      isValid = false;
    }

    if (!this.guestForm.email || !this.guestForm.email.trim()) {
      this.guestErrors.email = 'Email là bắt buộc';
      isValid = false;
    } else if (!this.emailPattern.test(this.guestForm.email.trim())) {
      this.guestErrors.email = 'Email không hợp lệ';
      isValid = false;
    }

    if (!this.guestForm.address.province.trim()) {
      this.guestErrors.address.province = 'Tỉnh/Thành phố là bắt buộc';
      isValid = false;
    }

    if (!this.guestForm.address.ward.trim()) {
      this.guestErrors.address.ward = 'Xã/Phường/Đặc khu là bắt buộc';
      isValid = false;
    }

    if (!this.guestForm.address.detail.trim()) {
      this.guestErrors.address.detail = 'Địa chỉ chi tiết là bắt buộc';
      isValid = false;
    } else if (this.guestForm.address.detail.trim().length < 6) {
      this.guestErrors.address.detail = 'Địa chỉ chi tiết phải có ít nhất 6 ký tự';
      isValid = false;
    }

    return isValid;
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
          'Theo mô hình hành chính 2 cấp áp dụng từ 01/07/2025, form đặt hàng dùng Tỉnh/Thành phố và Xã/Phường/Đặc khu.';
        this.syncSelectionsFromCurrentValue();
      },
      error: (error) => {
        console.error('Load provinces failed:', error);
        this.isLoadingProvinces = false;
        this.administrativeNote =
          'Không tải được danh mục tỉnh, thành phố. Vui lòng thử lại sau.';
      },
    });
  }

  private loadWards(provinceCode: string, existingWardName = ''): void {
    this.isLoadingWards = true;

    this.vietnamAdministrativeService.getWardsByProvinceCode(provinceCode).subscribe({
      next: (wards) => {
        this.wards = wards;
        this.isLoadingWards = false;

        if (existingWardName) {
          const selectedCode = this.findOptionCodeByName(wards, existingWardName);
          this.wardCode = selectedCode;
          if (selectedCode) {
            this.guestForm.address.ward = this.getOptionNameByCode(wards, selectedCode);
          }
        }
      },
      error: (error) => {
        console.error('Load wards failed:', error);
        this.wards = [];
        this.isLoadingWards = false;
      },
    });
  }

  private syncSelectionsFromCurrentValue(): void {
    const provinceCode = this.findOptionCodeByName(this.provinces, this.guestForm.address.province);
    if (!provinceCode) {
      return;
    }

    this.provinceCode = provinceCode;
    this.loadWards(provinceCode, this.guestForm.address.ward);
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

  private resetErrors(): void {
    this.guestErrors = {
      full_name: '',
      phone: '',
      email: '',
      address: {
        province: '',
        ward: '',
        detail: '',
      },
    };
  }

  private resetForm(): void {
    this.guestForm = {
      full_name: '',
      phone: '',
      email: '',
      address: {
        province: '',
        ward: '',
        detail: '',
      },
    };
    this.provinceCode = '';
    this.wardCode = '';
    this.wards = [];
    this.resetErrors();
    this.guestSubmitError = '';
  }
}
