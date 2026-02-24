import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ReturnReasonOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-return-request-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './return-request-modal.html',
  styleUrl: './return-request-modal.css',
})
export class ReturnRequestModalComponent implements OnChanges {
  @Input() show = false;
  @Input() orderCode = '';
  @Input() loading = false;

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<{ reason: string; note?: string }>();

  reasons: ReturnReasonOption[] = [
    { value: 'Sản phẩm bị lỗi/hư hỏng', label: 'Sản phẩm bị lỗi/hư hỏng' },
    { value: 'Nhận sai sản phẩm/size/màu', label: 'Nhận sai sản phẩm/size/màu' },
    { value: 'Sản phẩm không đúng mô tả', label: 'Sản phẩm không đúng mô tả' },
    { value: 'Không còn nhu cầu', label: 'Không còn nhu cầu' },
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
    this.submit.emit({ reason: this.finalReason });
  }
}
