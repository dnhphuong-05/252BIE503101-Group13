import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';
import { Address } from '../../../services/user.service';
import { AddressService } from '../../../services/address.service';
import {
  AdministrativeOption,
  VietnamAdministrativeService,
} from '../../../services/vietnam-administrative.service';

type AddressField = 'receiver_name' | 'phone' | 'province' | 'ward' | 'address_detail';

@Component({
  selector: 'app-profile-addresses',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile-addresses.html',
  styleUrl: './profile-addresses.css',
})
export class ProfileAddressesComponent implements OnInit {
  addresses: Address[] = [];
  addressForm: FormGroup;
  showForm = false;
  isSaving = false;
  editingAddress: Address | null = null;

  provinces: AdministrativeOption[] = [];
  wards: AdministrativeOption[] = [];
  selectedProvinceCode = '';
  selectedWardCode = '';
  isLoadingProvinces = false;
  isLoadingWards = false;
  administrativeNote = '';

  private readonly vietnamPhonePattern = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

  constructor(
    private fb: FormBuilder,
    private addressService: AddressService,
    private vietnamAdministrativeService: VietnamAdministrativeService,
    private toastService: ToastService,
  ) {
    this.addressForm = this.fb.group({
      receiver_name: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(this.vietnamPhonePattern)]],
      province: ['', [Validators.required]],
      ward: ['', [Validators.required]],
      address_detail: ['', [Validators.required, Validators.minLength(6)]],
      note: [''],
      is_default: [false],
    });
  }

  ngOnInit(): void {
    this.loadAddresses();
    this.loadAdministrativeOptions();
  }

  openAddForm(): void {
    this.showForm = true;
    this.editingAddress = null;
    this.resetFormState();
  }

  openEdit(address: Address): void {
    this.showForm = true;
    this.editingAddress = address;
    this.resetFormState({
      receiver_name: address.receiver_name || address.recipientName || '',
      phone: address.phone || '',
      province: address.province || '',
      ward: address.ward || '',
      address_detail: address.address_detail || address.address || '',
      note: address.note || '',
      is_default: this.isDefault(address),
    });

    if (this.provinces.length) {
      this.syncSelectionsFromCurrentValue();
    }
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingAddress = null;
    this.resetFormState();
  }

  saveAddress(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValue = this.addressForm.getRawValue();
    const payload = {
      receiver_name: formValue.receiver_name.trim(),
      phone: this.normalizePhone(formValue.phone),
      province: formValue.province.trim(),
      district: '',
      ward: formValue.ward.trim(),
      address_detail: formValue.address_detail.trim(),
      note: (formValue.note || '').trim(),
      is_default: Boolean(formValue.is_default),
    } as Address;

    if (this.editingAddress) {
      const addressId = this.getAddressIdentifier(this.editingAddress);
      if (!addressId) {
        this.toastService.error('Không tìm thấy ID địa chỉ');
        this.isSaving = false;
        return;
      }

      this.addressService.updateAddress(addressId, payload).subscribe({
        next: () => {
          this.toastService.success('Cập nhật địa chỉ thành công');
          this.isSaving = false;
          this.cancelForm();
          this.refreshAddresses();
        },
        error: (error) => {
          this.toastService.error('Cập nhật địa chỉ thất bại');
          this.isSaving = false;
        },
      });
      return;
    }

    this.addressService.addAddress(payload).subscribe({
      next: () => {
        this.toastService.success('Thêm địa chỉ thành công');
        this.isSaving = false;
        this.cancelForm();
        this.refreshAddresses();
      },
      error: (error) => {
        this.toastService.error('Thêm địa chỉ thất bại');
        this.isSaving = false;
      },
    });
  }

  deleteAddress(address: Address): void {
    const addressId = this.getAddressIdentifier(address);
    if (!addressId) {
      this.toastService.error('Không tìm thấy ID địa chỉ');
      return;
    }

    this.toastService.confirm('Bạn có chắc muốn xoá địa chỉ này?', () => {
      this.addressService.deleteAddress(addressId).subscribe({
        next: () => {
          this.toastService.success('Đã xoá địa chỉ.');
          this.refreshAddresses();
        },
        error: () => this.toastService.error('Xoá địa chỉ thất bại.'),
      });
    }, {
      confirmText: 'Xóa địa chỉ',
      confirmVariant: 'danger',
    });
  }

  setDefault(address: Address): void {
    const addressId = this.getAddressIdentifier(address);
    if (!addressId) {
      this.toastService.error('Không tìm thấy ID địa chỉ');
      return;
    }

    this.addressService.setDefaultAddress(addressId).subscribe({
      next: () => {
        this.toastService.success('Đã đặt địa chỉ mặc định');
        this.refreshAddresses();
      },
      error: () => this.toastService.error('Đặt mặc định thất bại'),
    });
  }

  onProvinceChange(provinceCode: string): void {
    this.selectedProvinceCode = provinceCode;
    this.selectedWardCode = '';
    this.wards = [];

    const provinceControl = this.getControl('province');
    const wardControl = this.getControl('ward');

    provinceControl.setValue(this.getOptionNameByCode(this.provinces, provinceCode));
    provinceControl.markAsTouched();
    wardControl.setValue('');
    wardControl.markAsUntouched();

    if (!provinceCode) {
      return;
    }

    this.loadWards(provinceCode);
  }

  onWardChange(wardCode: string): void {
    this.selectedWardCode = wardCode;
    const wardControl = this.getControl('ward');
    wardControl.setValue(this.getOptionNameByCode(this.wards, wardCode));
    wardControl.markAsTouched();
  }

  markControlTouched(field: AddressField): void {
    this.getControl(field).markAsTouched();
  }

  isDefault(address: Address): boolean {
    return Boolean(address.isDefault ?? address.is_default);
  }

  getRecipientName(address: Address): string {
    return address.receiver_name || address.recipientName || 'Chưa cập nhật';
  }

  getAddressLine(address: Address): string {
    const parts = [address.address_detail || address.address || '', address.ward || '', address.province || '']
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean);
    return parts.join(', ') || 'Chưa cập nhật';
  }

  getFieldError(field: AddressField): string {
    const control = this.getControl(field);
    if (!control.touched) {
      return '';
    }

    if (control.hasError('required')) {
      switch (field) {
        case 'receiver_name':
          return 'Vui lòng nhập người nhận.';
        case 'phone':
          return 'Vui lòng nhập số điện thoại.';
        case 'province':
          return 'Vui lòng chọn tỉnh/thành phố.';
        case 'ward':
          return 'Vui lòng chọn xã/phường/đặc khu.';
        case 'address_detail':
          return 'Vui lòng nhập địa chỉ chi tiết.';
      }
    }

    if (field === 'receiver_name' && control.hasError('minlength')) {
      return 'Tên người nhận cần có ít nhất 2 ký tự.';
    }

    if (field === 'phone' && control.hasError('pattern')) {
      return 'Số điện thoại chưa đúng định dạng Việt Nam.';
    }

    if (field === 'address_detail' && control.hasError('minlength')) {
      return 'Địa chỉ chi tiết cần có ít nhất 6 ký tự.';
    }

    return '';
  }

  hasFieldError(field: AddressField): boolean {
    return Boolean(this.getFieldError(field));
  }

  getProvincePlaceholder(): string {
    return this.isLoadingProvinces ? 'Đang tải tỉnh/thành phố...' : 'Chọn tỉnh/thành phố';
  }

  getWardPlaceholder(): string {
    if (!this.selectedProvinceCode) {
      return 'Chọn tỉnh/thành phố trước';
    }

    if (this.isLoadingWards) {
      return 'Đang tải xã/phường/đặc khu...';
    }

    return 'Chọn xã/phường/đặc khu';
  }

  showWardHint(): boolean {
    return Boolean(this.selectedProvinceCode && !this.isLoadingWards && !this.wards.length);
  }

  private getControl(field: AddressField): AbstractControl {
    return this.addressForm.get(field) as AbstractControl;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\s+/g, '').trim();
  }

  private getAddressIdentifier(address: Address | null | undefined): string {
    return String(address?.address_id || address?._id || '').trim();
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
          'Theo mô hình hành chính 2 cấp áp dụng từ 01/07/2025, hồ sơ địa chỉ dùng Tỉnh/Thành phố và Xã/Phường/Đặc khu.';
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
          this.selectedWardCode = selectedCode;
          if (selectedCode) {
            this.getControl('ward').setValue(this.getOptionNameByCode(wards, selectedCode));
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
    if (!this.showForm && !this.editingAddress) {
      return;
    }

    const provinceName = String(this.getControl('province').value || '').trim();
    const wardName = String(this.getControl('ward').value || '').trim();
    const provinceCode = this.findOptionCodeByName(this.provinces, provinceName);

    this.selectedProvinceCode = provinceCode;
    this.selectedWardCode = '';
    this.wards = [];

    if (!provinceCode) {
      return;
    }

    this.loadWards(provinceCode, wardName);
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

  private resetFormState(
    value: {
      receiver_name?: string;
      phone?: string;
      province?: string;
      ward?: string;
      address_detail?: string;
      note?: string;
      is_default?: boolean;
    } = {},
  ): void {
    this.addressForm.reset({
      receiver_name: value.receiver_name || '',
      phone: value.phone || '',
      province: value.province || '',
      ward: value.ward || '',
      address_detail: value.address_detail || '',
      note: value.note || '',
      is_default: value.is_default || false,
    });
    this.addressForm.markAsPristine();
    this.addressForm.markAsUntouched();
    this.selectedProvinceCode = '';
    this.selectedWardCode = '';
    this.wards = [];
  }

  private refreshAddresses(): void {
    this.loadAddresses();
  }

  private loadAddresses(): void {
    this.addressService.getAddresses().subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          const data = response.data;
          this.addresses = Array.isArray(data) ? data : data.addresses || [];
        }
      },
      error: () => {
        this.toastService.error('Không thể tải danh sách địa chỉ');
      },
    });
  }
}
