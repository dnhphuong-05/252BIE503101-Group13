import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationItem } from '../../../services/notification.service';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notification-panel.html',
  styleUrl: './notification-panel.css',
})

export class NotificationPanelComponent {
  @Input() show = false;
  @Input() title = 'Thông Báo';
  @Input() emptyMessage = 'Đăng nhập để xem Thông báo';
  @Input() isLoggedIn = false;
  @Input() notifications: NotificationItem[] = [];
  @Input() isLoading = false;
  @Input() error = '';

  @Output() register = new EventEmitter<void>();
  @Output() login = new EventEmitter<void>();

  onRegister(): void {
    this.register.emit();
  }

  onLogin(): void {
    this.login.emit();
  }
}
