import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AccountService, AccountSettingsResponse } from '../../../../core/services/account.service';

interface AdminSettings {
  emailNotifications: boolean;
  orderNotifications: boolean;
  returnNotifications: boolean;
  contactNotifications: boolean;
  compactTable: boolean;
  reduceMotion: boolean;
  language: 'en' | 'vi';
  timezone: string;
  startPage: 'dashboard' | 'orders/list' | 'orders/rent' | 'notifications';
  autoRefreshSeconds: number;
  enableTwoFactor: boolean;
  sessionTimeout: '15 minutes' | '30 minutes' | '60 minutes';
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class SettingsComponent {
  private readonly authService = inject(AuthService);
  private readonly accountService = inject(AccountService);
  private readonly toast = inject(NotificationService);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly settings = signal<AdminSettings>(this.defaultSettings());
  private readonly savedSettings = signal<AdminSettings | null>(null);

  protected readonly unreadChannels = computed(() => {
    const next = this.settings();
    return [
      next.emailNotifications,
      next.orderNotifications,
      next.returnNotifications,
      next.contactNotifications,
    ].filter(Boolean).length;
  });

  protected readonly summary = computed(() => {
    const next = this.settings();
    return [
      {
        icon: 'fas fa-bell',
        label: 'Active channels',
        value: `${this.unreadChannels()} / 4`,
      },
      {
        icon: 'fas fa-sync',
        label: 'Auto refresh',
        value: `${next.autoRefreshSeconds}s`,
      },
      {
        icon: 'fas fa-clock',
        label: 'Session timeout',
        value: next.sessionTimeout,
      },
    ];
  });

  constructor() {
    this.loadSettings();
  }

  protected updateSetting<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]): void {
    this.settings.update((current) => ({ ...current, [key]: value }));
  }

  protected resetSettings(): void {
    const saved = this.savedSettings();
    this.settings.set(saved ? { ...saved } : this.defaultSettings());
    this.toast.showInfo('Settings form reset.');
  }

  protected saveSettings(): void {
    if (this.isSaving()) return;
    this.isSaving.set(true);

    const current = this.settings();
    this.accountService
      .updateSettings({
        email_notifications: current.emailNotifications,
        order_notifications: current.orderNotifications,
        return_notifications: current.returnNotifications,
        contact_notifications: current.contactNotifications,
        compact_table: current.compactTable,
        reduce_motion: current.reduceMotion,
        language: current.language,
        timezone: current.timezone,
        start_page: current.startPage,
        auto_refresh_seconds: current.autoRefreshSeconds,
        enable_two_factor: current.enableTwoFactor,
        session_timeout: current.sessionTimeout,
      })
      .subscribe({
        next: (response) => {
          if (response.data) {
            const mapped = this.mapSettings(response.data);
            this.settings.set(mapped);
            this.savedSettings.set(mapped);
          }
          this.toast.showSuccess(response.message || 'Settings saved.');
        },
        error: (error) => {
          this.toast.showError(error?.error?.message || 'Unable to save settings.');
        },
        complete: () => {
          this.isSaving.set(false);
        },
      });
  }

  protected signOut(): void {
    this.authService.logout();
  }

  private loadSettings(): void {
    this.isLoading.set(true);
    this.accountService.getSettings().subscribe({
      next: (response) => {
        if (!response.data) return;
        const mapped = this.mapSettings(response.data);
        this.settings.set(mapped);
        this.savedSettings.set(mapped);
      },
      error: (error) => {
        this.toast.showError(error?.error?.message || 'Unable to load settings.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  private mapSettings(value: AccountSettingsResponse): AdminSettings {
    return {
      emailNotifications: Boolean(value.email_notifications),
      orderNotifications: Boolean(value.order_notifications),
      returnNotifications: Boolean(value.return_notifications),
      contactNotifications: Boolean(value.contact_notifications),
      compactTable: Boolean(value.compact_table),
      reduceMotion: Boolean(value.reduce_motion),
      language: value.language || 'en',
      timezone: value.timezone || 'Asia/Bangkok',
      startPage: value.start_page || 'dashboard',
      autoRefreshSeconds: Number(value.auto_refresh_seconds) || 45,
      enableTwoFactor: Boolean(value.enable_two_factor),
      sessionTimeout: value.session_timeout || '30 minutes',
    };
  }

  private defaultSettings(): AdminSettings {
    return {
      emailNotifications: true,
      orderNotifications: true,
      returnNotifications: true,
      contactNotifications: true,
      compactTable: false,
      reduceMotion: false,
      language: 'en',
      timezone: 'Asia/Bangkok',
      startPage: 'dashboard',
      autoRefreshSeconds: 45,
      enableTwoFactor: false,
      sessionTimeout: '30 minutes',
    };
  }
}
