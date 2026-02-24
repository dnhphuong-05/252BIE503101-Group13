import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../../core/services/notification.service';
import { NotificationType } from '../../../../models';

@Component({
  selector: 'app-toast-stack',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-stack.html',
  styleUrl: './toast-stack.css',
})
export class ToastStackComponent {
  private readonly notification = inject(NotificationService);

  protected readonly toasts = this.notification.toasts;
  protected readonly NotificationType = NotificationType;

  protected dismiss(id?: string): void {
    if (!id) return;
    this.notification.dismiss(id);
  }
}
