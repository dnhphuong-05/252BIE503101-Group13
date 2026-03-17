import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-rental-success-modal',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './rental-success-modal.html',
  styleUrl: './rental-success-modal.css',
})
export class RentalSuccessModal {
  @Input() show = false;
  @Input() rentOrderCode = 'PHUC-RNT-2602120001';
  @Input() startDate = '2026-02-20';
  @Input() endDate = '2026-02-22';
  @Input() rentFeeExpected = 90000;
  @Input() depositPaid = 150000;
  @Input() status:
    | 'booked'
    | 'pending'
    | 'ongoing'
    | 'returned'
    | 'closed'
    | 'cancelled'
    | 'violated' = 'booked';

  @Output() closed = new EventEmitter<void>();

  constructor(private toastService: ToastService) {}

  get statusLabel(): string {
    switch (this.status) {
      case 'booked':
        return 'Đã đặt lịch';
      case 'pending':
        return 'Chờ xác nhận';
      case 'ongoing':
        return 'Đang thuê';
      case 'returned':
        return 'Đã trả';
      case 'closed':
        return 'Đã hoàn tất';
      case 'cancelled':
        return 'Đã hủy';
      case 'violated':
        return 'Có vi phạm';
      default:
        return 'Chờ xác nhận';
    }
  }

  formatCurrency(value: number): string {
    return `${value.toLocaleString('vi-VN')}đ`;
  }

  formatDate(value: string): string {
    if (!value) return '--';
    const date = new Date(value);
    return date.toLocaleDateString('vi-VN');
  }

  closeModal(): void {
    this.closed.emit();
  }

  copyOrderCode(): void {
    if (!this.rentOrderCode) return;
    navigator.clipboard
      ?.writeText(this.rentOrderCode)
      .then(() => {
        this.toastService.success('Đã sao chép mã đơn thuê.');
      })
      .catch(() => undefined);
  }
}
