import { Component, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class TopbarComponent {
  public readonly toggleSidebar = output<void>();

  private readonly authService = inject(AuthService);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly userMenuOpen = signal(false);
  protected readonly createMenuOpen = signal(false);
  protected searchQuery = '';

  protected userInitials(): string {
    const user = this.currentUser();
    if (!user) return '';

    const source = user.name?.trim() || user.email?.trim() || user.phone?.trim();
    if (!source) return '';

    const parts = source.split(/\s+/).filter(Boolean);
    const initials = parts.length > 1 ? parts.slice(0, 2).map((part) => part[0]) : [source[0]];

    return initials.join('').toUpperCase().slice(0, 2);
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
    this.createMenuOpen.set(false);
  }

  protected toggleCreateMenu(): void {
    this.createMenuOpen.update((open) => !open);
    this.userMenuOpen.set(false);
  }

  protected closeMenus(): void {
    this.userMenuOpen.set(false);
    this.createMenuOpen.set(false);
  }

  protected handleSearch(): void {
    if (this.searchQuery.trim()) {
      console.log('Searching for:', this.searchQuery);
    }
  }

  protected handleLogout(): void {
    this.authService.logout();
    this.userMenuOpen.set(false);
  }
}
