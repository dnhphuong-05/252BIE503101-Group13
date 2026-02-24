import { Injectable, signal } from '@angular/core';
import { ToastMessage, NotificationType } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly toastsSignal = signal<ToastMessage[]>([]);
  public readonly toasts = this.toastsSignal.asReadonly();

  showSuccess(message: string, title?: string, duration: number = 3000): void {
    this.show({
      type: NotificationType.SUCCESS,
      title,
      message,
      duration,
      dismissible: true,
    });
  }

  showError(message: string, title?: string, duration: number = 5000): void {
    this.show({
      type: NotificationType.ERROR,
      title,
      message,
      duration,
      dismissible: true,
    });
  }

  showWarning(message: string, title?: string, duration: number = 4000): void {
    this.show({
      type: NotificationType.WARNING,
      title,
      message,
      duration,
      dismissible: true,
    });
  }

  showInfo(message: string, title?: string, duration: number = 3000): void {
    this.show({
      type: NotificationType.INFO,
      title,
      message,
      duration,
      dismissible: true,
    });
  }

  private show(toast: ToastMessage): void {
    const id = this.generateId();
    const toastWithId = { ...toast, id };

    this.toastsSignal.update((toasts) => [...toasts, toastWithId]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, toast.duration);
    }
  }

  dismiss(id: string): void {
    this.toastsSignal.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  dismissAll(): void {
    this.toastsSignal.set([]);
  }

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
