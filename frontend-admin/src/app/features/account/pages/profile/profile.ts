import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AccountProfileResponse, AccountService } from '../../../../core/services/account.service';

interface ProfileDraft {
  displayName: string;
  phone: string;
  title: string;
  department: string;
  bio: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly accountService = inject(AccountService);
  private readonly toast = inject(NotificationService);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly profile = signal<ProfileDraft>({
    displayName: '',
    phone: '',
    title: '',
    department: '',
    bio: '',
  });
  private readonly profileSource = signal<AccountProfileResponse | null>(null);

  protected readonly accountMeta = computed(() => {
    const user = this.currentUser();
    const source = this.profileSource();
    return {
      role: String(source?.role || user?.role || 'admin')
        .replace(/_/g, ' ')
        .toUpperCase(),
      createdAt: this.formatDate(source?.profile?.created_at || user?.createdAt),
      updatedAt: this.formatDate(
        source?.profile?.updated_at || source?.updatedAt || user?.updatedAt,
      ),
    };
  });

  protected readonly initials = computed(() => {
    const source = (this.profile().displayName || this.currentUser()?.name || 'AD').trim();
    const words = source.split(/\s+/).filter(Boolean);
    return (words[0]?.charAt(0) || 'A') + (words[1]?.charAt(0) || 'D');
  });

  protected readonly profileStrength = computed(() => {
    const user = this.currentUser();
    const source = this.profileSource();
    const draft = this.profile();
    const fields = [
      draft.displayName,
      source?.email || user?.email || '',
      draft.phone,
      draft.title,
      draft.department,
      draft.bio,
    ];
    const complete = fields.filter((item) => item.trim().length > 0).length;
    return Math.round((complete / fields.length) * 100);
  });

  protected readonly quickStats = computed(() => {
    const user = this.currentUser();
    const source = this.profileSource();
    return [
      {
        icon: 'fas fa-user-shield',
        label: 'Role',
        value: this.accountMeta().role,
      },
      {
        icon: 'fas fa-envelope',
        label: 'Email',
        value: source?.email || user?.email || '-',
      },
      {
        icon: 'fas fa-calendar-check',
        label: 'Updated',
        value: this.accountMeta().updatedAt,
      },
    ];
  });

  constructor() {
    this.profile.set(this.buildFallbackProfile());
    this.loadProfile();
  }

  protected onFieldChange(field: keyof ProfileDraft, value: string): void {
    this.profile.update((current) => ({ ...current, [field]: value }));
  }

  protected resetProfile(): void {
    const source = this.profileSource();
    if (source) {
      this.profile.set(this.mapProfileDraft(source));
      this.toast.showInfo('Profile form reset to saved data.');
      return;
    }
    this.profile.set(this.buildFallbackProfile());
    this.toast.showInfo('Profile form reset.');
  }

  protected saveProfile(): void {
    if (this.isSaving()) return;

    const draft = this.profile();
    const fullName = draft.displayName.trim();
    if (!fullName) {
      this.toast.showError('Display name is required.');
      return;
    }

    this.isSaving.set(true);
    const phone = draft.phone.trim();
    this.accountService
      .updateProfile({
        full_name: fullName,
        phone: phone || undefined,
        job_title: draft.title.trim(),
        department: draft.department.trim(),
        bio: draft.bio.trim(),
      })
      .subscribe({
        next: (response) => {
          const data = response.data;
          if (data) {
            this.profileSource.set(data);
            this.profile.set(this.mapProfileDraft(data));
          }
          this.authService.refreshCurrentUser();
          this.toast.showSuccess(response.message || 'Profile updated successfully.');
        },
        error: (error) => {
          this.toast.showError(error?.error?.message || 'Unable to save profile.');
        },
        complete: () => {
          this.isSaving.set(false);
        },
      });
  }

  private loadProfile(): void {
    this.isLoading.set(true);
    this.accountService.getProfile().subscribe({
      next: (response) => {
        const data = response.data;
        if (!data) return;
        this.profileSource.set(data);
        this.profile.set(this.mapProfileDraft(data));
      },
      error: (error) => {
        this.toast.showError(error?.error?.message || 'Unable to load profile.');
      },
      complete: () => {
        this.isLoading.set(false);
      },
    });
  }

  private mapProfileDraft(source: AccountProfileResponse): ProfileDraft {
    return {
      displayName:
        source.profile?.full_name ||
        source.fullName ||
        this.currentUser()?.name ||
        '',
      phone: source.phone || this.currentUser()?.phone || '',
      title: source.profile?.job_title || 'Store Operations Lead',
      department: source.profile?.department || 'Commerce Team',
      bio:
        source.profile?.bio ||
        'Focused on clear execution, quality service, and fast order handling.',
    };
  }

  private buildFallbackProfile(): ProfileDraft {
    const user = this.currentUser();
    return {
      displayName: user?.name || '',
      phone: user?.phone || '',
      title: 'Store Operations Lead',
      department: 'Commerce Team',
      bio: 'Focused on clear execution, quality service, and fast order handling.',
    };
  }

  private formatDate(value: Date | string | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }
}
