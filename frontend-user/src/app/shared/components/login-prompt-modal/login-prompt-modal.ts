import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-prompt-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login-prompt-modal.html',
  styleUrl: './login-prompt-modal.css',
})
export class LoginPromptModalComponent {
  @Input() show: boolean = false;
  @Input() title: string = 'Đăng nhập để nhận ưu đãi?';
  @Input() message: string = 'Bạn có muốn đăng nhập để nhận thêm voucher và điểm tích luỹ không?';

  @Output() close = new EventEmitter<void>();
  @Output() continueAsGuest = new EventEmitter<void>();
  @Output() goToLogin = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }

  onContinueAsGuest() {
    this.continueAsGuest.emit();
  }

  onGoToLogin() {
    this.goToLogin.emit();
  }
}
