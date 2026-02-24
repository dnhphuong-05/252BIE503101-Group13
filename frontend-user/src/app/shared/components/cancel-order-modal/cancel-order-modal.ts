import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CancelReasonOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-cancel-order-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancel-order-modal.html',
  styleUrl: './cancel-order-modal.css',
})
export class CancelOrderModalComponent implements OnChanges {
  @Input() show = false;
  @Input() orderCode = '';
  @Input() loading = false;

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<string>();

  reasons: CancelReasonOption[] = [
    { value: 'Đặt nhầm sản phẩm', label: 'Đặt nhầm sản phẩm' },
    { value: 'Muốn đổi sản phẩm/size/màu', label: 'Muốn đổi sản phẩm/size/màu' },
    { value: 'Thay đổi phương thức thanh toán', label: 'Thay đổi phương thức thanh toán' },
    { value: 'Tìm được giá tốt hơn', label: 'Tìm được giá tốt hơn' },
    { value: 'other', label: 'Lý do khác' },
  ];

  selectedReason = '';
  customReason = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['show']?.currentValue) {
      this.selectedReason = '';
      this.customReason = '';
    }
  }

  get finalReason(): string {
    if (this.selectedReason === 'other') {
      return this.customReason.trim();
    }
    return this.selectedReason.trim();
  }

  get canSubmit(): boolean {
    return this.finalReason.length > 0 && !this.loading;
  }

  onClose(): void {
    if (this.loading) return;
    this.close.emit();
  }

  onSubmit(): void {
    if (!this.canSubmit) return;
    this.submit.emit(this.finalReason);
  }
}
