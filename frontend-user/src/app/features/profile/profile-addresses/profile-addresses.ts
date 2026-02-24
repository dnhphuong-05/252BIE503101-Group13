import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';
import { Address } from '../../../services/user.service';
import { AddressService } from '../../../services/address.service';

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
  provinces: string[] = [
    'TP. Hà Nội',
    'TP. Huế',
    'Quảng Ninh',
    'Cao Bằng',
    'Lạng Sơn',
    'Lai Châu',
    'Điện Biên',
    'Sơn La',
    'Thanh Hóa',
    'Nghệ An',
    'Hà Tĩnh',
    'Tuyên Quang',
    'Lào Cai',
    'Thái Nguyên',
    'Phú Thọ',
    'Bắc Ninh',
    'Hưng Yên',
    'TP. Hải Phòng',
    'Ninh Bình',
    'Quảng Trị',
    'TP. Đà Nẵng',
    'Quảng Ngãi',
    'Gia Lai',
    'Khánh Hòa',
    'Lâm Đồng',
    'Đắk Lắk',
    'TP. Hồ Chí Minh',
    'Đồng Nai',
    'Tây Ninh',
    'TP. Cần Thơ',
    'Vĩnh Long',
    'Đồng Tháp',
    'Cà Mau',
    'An Giang',
  ];

  constructor(
    private fb: FormBuilder,
    private addressService: AddressService,
    private toastService: ToastService,
  ) {
    this.addressForm = this.fb.group({
      receiver_name: ['', [Validators.required, Validators.minLength(2)]],
      phone: [
        '',
        [Validators.required, Validators.pattern(/^(0[3|5|7|8|9])+([0-9]{8})$/)],
      ],
      province: ['', [Validators.required]],
      ward: ['', [Validators.required]],
      address_detail: ['', [Validators.required, Validators.minLength(6)]],
      note: [''],
      is_default: [false],
    });
  }

  ngOnInit() {
    this.loadAddresses();
  }

  openAddForm() {
    this.showForm = true;
    this.editingAddress = null;
    this.addressForm.reset({ is_default: false });
  }

  openEdit(address: Address) {
    this.showForm = true;
    this.editingAddress = address;
    this.addressForm.patchValue({
      receiver_name: address.receiver_name || address.recipientName || '',
      phone: address.phone || '',
      province: address.province || '',
      ward: address.ward || '',
      address_detail: address.address_detail || address.address || '',
      note: address.note || '',
      is_default: this.isDefault(address),
    });
  }

  cancelForm() {
    this.showForm = false;
    this.editingAddress = null;
    this.addressForm.reset({ is_default: false });
  }

  saveAddress() {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const payload = { ...this.addressForm.value, district: '' } as Address;

    if (this.editingAddress) {
      const addressId = this.editingAddress._id || this.editingAddress.address_id;
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
        error: () => {
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
      error: () => {
        this.toastService.error('Thêm địa chỉ thất bại');
        this.isSaving = false;
      },
    });
  }

  deleteAddress(address: Address) {
    const addressId = address._id || address.address_id;
    if (!addressId) {
      this.toastService.error('Không tìm thấy ID địa chỉ');
      return;
    }
    if (!confirm('Bạn có chắc muốn xoá địa chỉ này?')) return;
    this.addressService.deleteAddress(addressId).subscribe({
      next: () => {
        this.toastService.success('Đã xoá địa chỉ');
        this.refreshAddresses();
      },
      error: () => this.toastService.error('Xoá địa chỉ thất bại'),
    });
  }

  setDefault(address: Address) {
    const addressId = address._id || address.address_id;
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

  isDefault(address: Address): boolean {
    return Boolean(address.isDefault ?? address.is_default);
  }

  getRecipientName(address: Address): string {
    return address.receiver_name || address.recipientName || 'Chưa cập nhật';
  }

  getAddressLine(address: Address): string {
    const detail = address.address_detail || address.address || '';
    const ward = address.ward ? `, ${address.ward}` : '';
    const district = address.district ? `, ${address.district}` : '';
    const province = address.province ? `, ${address.province}` : '';
    const combined = `${detail}${ward}${district}${province}`.trim();
    return combined || 'Chưa cập nhật';
  }

  private refreshAddresses() {
    this.loadAddresses();
  }

  private loadAddresses() {
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
