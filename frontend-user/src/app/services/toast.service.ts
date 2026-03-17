import { Injectable } from '@angular/core';

type ToastType = 'success' | 'error' | 'info' | 'warning';
type ToastActionVariant = 'primary' | 'ghost' | 'danger';

interface ToastAction {
  label: string;
  callback?: () => void;
  variant?: ToastActionVariant;
  closeOnClick?: boolean;
}

interface ToastOptions {
  title?: string;
  duration?: number;
  dismissible?: boolean;
  actions?: ToastAction[];
}

interface ConfirmToastOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: Exclude<ToastActionVariant, 'ghost'>;
  onCancel?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private nextId = 0;
  private container: HTMLDivElement | null = null;
  private readonly activeToasts = new Map<
    number,
    { element: HTMLDivElement; timeoutId: ReturnType<typeof setTimeout> | null }
  >();
  private styleInjected = false;

  success(message: string, duration = 3200): number {
    return this.show(message, 'success', { duration, title: 'Thành công' });
  }

  error(message: string, duration = 4000): number {
    return this.show(message, 'error', { duration, title: 'Có lỗi xảy ra' });
  }

  info(message: string, duration = 3200): number {
    return this.show(message, 'info', { duration, title: 'Thông báo' });
  }

  warning(message: string, duration = 3600): number {
    return this.show(message, 'warning', { duration, title: 'Lưu ý' });
  }

  confirm(message: string, onConfirm: () => void, options: ConfirmToastOptions = {}): number {
    return this.show(message, 'warning', {
      title: options.title || 'Xác nhận thao tác',
      duration: 0,
      dismissible: false,
      actions: [
        {
          label: options.cancelText || 'Hủy',
          variant: 'ghost',
          callback: options.onCancel,
        },
        {
          label: options.confirmText || 'Xác nhận',
          variant: options.confirmVariant || 'primary',
          callback: onConfirm,
        },
      ],
    });
  }

  private show(message: string, type: ToastType, options: ToastOptions): number {
    if (typeof document === 'undefined') {
      return -1;
    }

    const id = this.nextId++;
    const duration = options.duration ?? 3200;
    const container = this.ensureContainer();
    const toast = this.createToastElement(id, message, type, options);

    container.appendChild(toast);

    const timeoutId =
      duration > 0
        ? setTimeout(() => {
            this.dismiss(id);
          }, duration)
        : null;

    this.activeToasts.set(id, { element: toast, timeoutId });

    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });

    return id;
  }

  private dismiss(id: number): void {
    const record = this.activeToasts.get(id);
    if (!record) {
      return;
    }

    if (record.timeoutId) {
      clearTimeout(record.timeoutId);
    }

    record.element.classList.remove('is-visible');
    record.element.classList.add('is-leaving');

    window.setTimeout(() => {
      record.element.remove();
      this.activeToasts.delete(id);

      if (!this.activeToasts.size) {
        this.container?.classList.remove('has-items');
      }
    }, 220);
  }

  private createToastElement(
    id: number,
    message: string,
    type: ToastType,
    options: ToastOptions,
  ): HTMLDivElement {
    const toast = document.createElement('div');
    toast.className = `app-toast app-toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');

    const icon = document.createElement('div');
    icon.className = 'app-toast-icon';
    icon.textContent = this.getToastIcon(type);

    const content = document.createElement('div');
    content.className = 'app-toast-content';

    const header = document.createElement('div');
    header.className = 'app-toast-header';

    const title = document.createElement('div');
    title.className = 'app-toast-title';
    title.textContent = options.title || this.getDefaultTitle(type);
    header.appendChild(title);

    const shouldShowCloseButton = options.dismissible === true;
    if (shouldShowCloseButton) {
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'app-toast-close';
      closeButton.setAttribute('aria-label', 'Đóng thông báo');
      closeButton.textContent = '×';
      closeButton.addEventListener('click', () => this.dismiss(id));
      header.appendChild(closeButton);
    }

    const body = document.createElement('div');
    body.className = 'app-toast-message';
    body.textContent = message;

    content.appendChild(header);
    content.appendChild(body);

    if (options.actions?.length) {
      const actions = document.createElement('div');
      actions.className = 'app-toast-actions';

      options.actions.forEach((action) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `app-toast-action ${this.getActionClassName(action.variant)}`;
        button.textContent = action.label;
        button.addEventListener('click', () => {
          try {
            action.callback?.();
          } finally {
            if (action.closeOnClick ?? true) {
              this.dismiss(id);
            }
          }
        });
        actions.appendChild(button);
      });

      content.appendChild(actions);
    }

    toast.appendChild(icon);
    toast.appendChild(content);
    return toast;
  }

  private ensureContainer(): HTMLDivElement {
    this.injectStyles();

    if (!this.container || !document.body.contains(this.container)) {
      this.container = document.createElement('div');
      this.container.className = 'app-toast-stack';
      document.body.appendChild(this.container);
    }

    this.container.classList.add('has-items');
    return this.container;
  }

  private injectStyles(): void {
    if (this.styleInjected || typeof document === 'undefined') {
      return;
    }

    const style = document.createElement('style');
    style.id = 'app-toast-styles';
    style.textContent = `
      .app-toast-stack {
        position: fixed;
        top: 18px;
        right: 18px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: min(344px, calc(100vw - 24px));
        z-index: 12000;
        pointer-events: none;
      }

      .app-toast {
        --toast-accent: #75162d;
        --toast-accent-soft: rgba(117, 22, 45, 0.14);
        --toast-icon-bg: linear-gradient(135deg, #75162d, #8d233f);
        --toast-icon-color: #ffffff;
        --toast-surface: rgba(255, 249, 244, 0.96);
        --toast-border: rgba(117, 22, 45, 0.12);
        pointer-events: auto;
        position: relative;
        display: grid;
        grid-template-columns: 30px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
        padding: 14px 15px;
        border-radius: 18px;
        border: 1px solid var(--toast-border);
        background:
          radial-gradient(circle at top right, rgba(255, 228, 205, 0.5), transparent 35%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 249, 244, 0.96)),
          var(--toast-surface);
        box-shadow:
          0 16px 28px rgba(59, 1, 11, 0.1),
          0 4px 10px rgba(59, 1, 11, 0.05);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        color: #3b010b;
        font-family: 'Noto Sans', sans-serif;
        transform: translate3d(22px, -6px, 0);
        opacity: 0;
        transition: opacity 0.22s ease, transform 0.22s ease;
      }

      .app-toast.is-visible {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }

      .app-toast.is-leaving {
        opacity: 0;
        transform: translate3d(18px, -4px, 0);
      }

      .app-toast-icon {
        width: 30px;
        height: 30px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        font-size: 0.92rem;
        font-weight: 800;
        color: var(--toast-icon-color);
        background: var(--toast-icon-bg);
        box-shadow: 0 8px 18px rgba(59, 1, 11, 0.12);
      }

      .app-toast-success {
        --toast-accent: #1c9b5a;
        --toast-accent-soft: rgba(28, 155, 90, 0.18);
        --toast-icon-bg: linear-gradient(135deg, #15965c, #1fab6d);
        --toast-icon-color: #ffffff;
        --toast-surface: rgba(248, 255, 251, 0.96);
        --toast-border: rgba(28, 155, 90, 0.15);
      }

      .app-toast-error {
        --toast-accent: #cc3c34;
        --toast-accent-soft: rgba(204, 60, 52, 0.18);
        --toast-icon-bg: linear-gradient(135deg, #b42318, #cf3d33);
        --toast-icon-color: #ffffff;
        --toast-surface: rgba(255, 248, 247, 0.96);
        --toast-border: rgba(204, 60, 52, 0.16);
      }

      .app-toast-info {
        --toast-accent: #2a6fd6;
        --toast-accent-soft: rgba(42, 111, 214, 0.18);
        --toast-icon-bg: linear-gradient(135deg, #2a6fd6, #4a86df);
        --toast-icon-color: #ffffff;
        --toast-surface: rgba(248, 251, 255, 0.96);
        --toast-border: rgba(42, 111, 214, 0.14);
      }

      .app-toast-warning {
        --toast-accent: #d17b17;
        --toast-accent-soft: rgba(209, 123, 23, 0.18);
        --toast-icon-bg: linear-gradient(135deg, #d17b17, #e59b3b);
        --toast-icon-color: #ffffff;
        --toast-surface: rgba(255, 252, 246, 0.96);
        --toast-border: rgba(209, 123, 23, 0.16);
      }

      .app-toast-content {
        min-width: 0;
        display: grid;
        gap: 6px;
      }

      .app-toast-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .app-toast-title {
        font-size: 0.98rem;
        font-weight: 800;
        line-height: 1.25;
        color: #4a1020;
      }

      .app-toast-message {
        font-size: 0.88rem;
        line-height: 1.45;
        color: #604854;
        white-space: pre-wrap;
      }

      .app-toast-close {
        width: 24px;
        height: 24px;
        flex: 0 0 auto;
        border: 1px solid transparent;
        border-radius: 999px;
        background: transparent;
        color: #7b3043;
        font-size: 0.9rem;
        line-height: 1;
        cursor: pointer;
        transition: background 0.18s ease, transform 0.18s ease;
      }

      .app-toast-close:hover {
        background: rgba(117, 22, 45, 0.08);
        border-color: rgba(117, 22, 45, 0.08);
        transform: scale(1.04);
      }

      .app-toast-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        padding-top: 4px;
      }

      .app-toast-action {
        min-height: 36px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid transparent;
        font: inherit;
        font-size: 0.84rem;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
      }

      .app-toast-action:hover {
        transform: translateY(-1px);
      }

      .app-toast-action-primary {
        background: linear-gradient(135deg, #75162d, #8d233f);
        color: #ffffff;
        box-shadow: 0 10px 20px rgba(117, 22, 45, 0.18);
      }

      .app-toast-action-danger {
        background: linear-gradient(135deg, #b42318, #cf3d33);
        color: #ffffff;
        box-shadow: 0 10px 20px rgba(180, 35, 24, 0.18);
      }

      .app-toast-action-ghost {
        background: rgba(255, 255, 255, 0.8);
        color: #75162d;
        border-color: rgba(117, 22, 45, 0.18);
      }

      @media (max-width: 640px) {
        .app-toast-stack {
          top: 12px;
          right: 12px;
          left: 12px;
          width: auto;
        }

        .app-toast {
          grid-template-columns: 28px minmax(0, 1fr);
          gap: 9px;
          padding: 12px 12px 12px 14px;
          border-radius: 16px;
        }

        .app-toast-icon {
          width: 28px;
          height: 28px;
          border-radius: 9px;
          font-size: 0.84rem;
        }

        .app-toast-title {
          font-size: 0.92rem;
        }

        .app-toast-message {
          font-size: 0.84rem;
        }

        .app-toast-actions {
          gap: 6px;
        }

        .app-toast-action {
          min-height: 34px;
          padding: 0 13px;
        }
      }
    `;

    document.head.appendChild(style);
    this.styleInjected = true;
  }

  private getToastIcon(type: ToastType): string {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '!';
      case 'warning':
        return '!';
      case 'info':
      default:
        return 'i';
    }
  }

  private getDefaultTitle(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'Thành công';
      case 'error':
        return 'Có lỗi xảy ra';
      case 'warning':
        return 'Lưu ý';
      case 'info':
      default:
        return 'Thông báo';
    }
  }

  private getActionClassName(variant: ToastActionVariant = 'primary'): string {
    return `app-toast-action-${variant}`;
  }
}
