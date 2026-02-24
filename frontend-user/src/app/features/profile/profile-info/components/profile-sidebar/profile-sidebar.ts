import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { User } from '../../../../../services/auth.service';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  badge?: number;
}

@Component({
  selector: 'app-profile-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-sidebar.html',
  styleUrl: './profile-sidebar.css',
})
export class ProfileSidebarComponent {
  @Input() currentUser: User | null = null;
  @Input() activeTab: string = 'overview';

  menuItems: MenuItem[] = [
    {
      id: 'overview',
      label: 'Tổng quan',
      icon: 'fa-home',
    },
    {
      id: 'account',
      label: 'Thông tin cơ bản',
      icon: 'fa-user',
    },
    {
      id: 'security',
      label: 'Bảo mật',
      icon: 'fa-shield-alt',
    },
    {
      id: 'measurements',
      label: 'Số đo',
      icon: 'fa-ruler-combined',
    },
    {
      id: 'addresses',
      label: 'Địa chỉ',
      icon: 'fa-map-marker-alt',
    },
  ];

  constructor(private router: Router) {}

  getUserAvatar(): string {
    if (this.currentUser?.avatar) {
      return this.currentUser.avatar;
    }
    const firstLetter = this.currentUser?.fullName?.charAt(0).toUpperCase() || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=8B2635&color=fff&size=200`;
  }

  onMenuClick(menuId: string): void {
    // Emit event or use router to navigate
    // For now, we'll handle it in the parent component
  }
}
