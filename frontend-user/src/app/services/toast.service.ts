import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toasts: Array<{ message: string; type: 'success' | 'error' | 'info'; id: number }> = [];
  private nextId = 0;

  success(message: string, duration: number = 3000) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 3000) {
    this.show(message, 'error', duration);
  }

  info(message: string, duration: number = 3000) {
    this.show(message, 'info', duration);
  }

  private show(message: string, type: 'success' | 'error' | 'info', duration: number) {
    const toast = { message, type, id: this.nextId++ };
    this.toasts.push(toast);

    // Tạo toast element
    const toastElement = document.createElement('div');
    toastElement.className = `toast toast-${type}`;
    toastElement.textContent = message;
    toastElement.style.cssText = `
      position: fixed;
      top: ${20 + this.toasts.length * 70}px;
      right: 20px;
      padding: 15px 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
      min-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;

    // Thêm animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    if (!document.head.querySelector('#toast-animations')) {
      style.id = 'toast-animations';
      document.head.appendChild(style);
    }

    document.body.appendChild(toastElement);

    // Tự động xóa sau duration
    setTimeout(() => {
      toastElement.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        document.body.removeChild(toastElement);
        const index = this.toasts.findIndex((t) => t.id === toast.id);
        if (index > -1) {
          this.toasts.splice(index, 1);
        }
      }, 300);
    }, duration);
  }
}
