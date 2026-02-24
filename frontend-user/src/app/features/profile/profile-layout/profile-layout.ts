import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, User } from '../../../services/auth.service';

@Component({
  selector: 'app-profile-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './profile-layout.html',
  styleUrl: './profile-layout.css',
})
export class ProfileLayoutComponent implements OnInit {
  currentUser: User | null = null;
  membershipTier: string = 'Classic';
  membershipPoints: number = 0;
  sidebarCollapsed: boolean = false;

  constructor(
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.membershipPoints = user?.loyalty?.total_points || 0;
      this.calculateMembershipTier();
    });
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  calculateMembershipTier() {
    // Classic: < 300 điểm
    // Heritage: 300 - 999 điểm
    // Royal: >= 1000 điểm (hạng cao nhất)
    if (this.membershipPoints >= 1000) {
      this.membershipTier = 'Royal';
    } else if (this.membershipPoints >= 300) {
      this.membershipTier = 'Heritage';
    } else {
      this.membershipTier = 'Classic';
    }
  }

  getUserAvatar(): string {
    if (this.currentUser?.avatar || this.currentUser?.profile?.avatar) {
      return this.currentUser.avatar || this.currentUser.profile?.avatar || '';
    }
    const firstLetter = this.currentUser?.fullName?.charAt(0).toUpperCase() || 'P';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=8B2635&color=fff&size=200`;
  }

  getMembershipIcon(): string {
    switch (this.membershipTier) {
      case 'Royal':
        return 'fa-crown';
      case 'Heritage':
        return 'fa-gem';
      default:
        return 'fa-star';
    }
  }

  getMembershipColor(): string {
    switch (this.membershipTier) {
      case 'Royal':
        return '#D4AF37'; // Gold
      case 'Heritage':
        return '#C0C0C0'; // Silver
      default:
        return '#CD7F32'; // Bronze
    }
  }

  onLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      this.authService.logout();
    }
  }
}
