import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-success-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-success-modal.html',
  styleUrl: './order-success-modal.css',
})
export class OrderSuccessModalComponent {
  @Input() show: boolean = false;
  @Input() orderCode: string = '';
  @Input() trackingUrl: string = '';
  @Input() total: number = 0;
  @Input() emailSent: boolean = false;

  @Output() close = new EventEmitter<void>();

  closeModal(): void {
    this.close.emit();
  }

  onOverlayClick(): void {
    // Không đóng khi click overlay - user phải click nút
  }

  copyOrderCode(): void {
    navigator.clipboard.writeText(this.orderCode).then(() => {
      alert('Đã sao chép mã đơn hàng!');
    });
  }

  goToTracking(): void {
    if (this.trackingUrl) {
      window.open(this.trackingUrl, '_blank');
    }
  }
}
