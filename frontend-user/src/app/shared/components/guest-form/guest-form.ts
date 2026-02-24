import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  GuestCustomerService,
  GuestCustomerPayload,
} from '../../../services/guest-customer.service';

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
export class GuestFormComponent {
  @Input() show: boolean = false;
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

  isSubmittingGuest: boolean = false;
  guestSubmitError: string = '';

  constructor(private guestCustomerService: GuestCustomerService) {}

  /**
   * Đóng form
   */
  closeForm(): void {
    this.close.emit();
  }

  /**
   * Xử lý click overlay
   */
  onOverlayClick(): void {
    this.closeForm();
  }

  /**
   * Xử lý submit form
   */
  submitForm(): void {
    // Reset errors
    this.resetErrors();
    this.guestSubmitError = '';

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    // Submit form
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

  /**
   * Validate form
   */
  private validateForm(): boolean {
    let isValid = true;

    // Validate full_name
    if (!this.guestForm.full_name.trim()) {
      this.guestErrors.full_name = 'Họ và tên là bắt buộc';
      isValid = false;
    } else if (this.guestForm.full_name.trim().length < 2) {
      this.guestErrors.full_name = 'Họ và tên phải có ít nhất 2 ký tự';
      isValid = false;
    }

    // Validate phone
    if (!this.guestForm.phone.trim()) {
      this.guestErrors.phone = 'Số điện thoại là bắt buộc';
      isValid = false;
    } else if (!/^(0|\+84)[0-9]{9,10}$/.test(this.guestForm.phone.trim())) {
      this.guestErrors.phone = 'Số điện thoại không hợp lệ';
      isValid = false;
    }

    // Validate email (required)
    if (!this.guestForm.email || !this.guestForm.email.trim()) {
      this.guestErrors.email = 'Email là bắt buộc';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.guestForm.email.trim())) {
      this.guestErrors.email = 'Email không hợp lệ';
      isValid = false;
    }

    // Validate address
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
    }

    return isValid;
  }

  /**
   * Reset errors
   */
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

  /**
   * Reset form
   */
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
    this.resetErrors();
    this.guestSubmitError = '';
  }
}
