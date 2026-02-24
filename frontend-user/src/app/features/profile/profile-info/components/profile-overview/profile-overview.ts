import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { User } from '../../../../../services/auth.service';

export interface ProfileOverviewStats {
  orders: number;
  favorites: number;
  points: number;
  rentOrders: number;
}

@Component({
  selector: 'app-profile-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile-overview.html',
  styleUrl: './profile-overview.css',
})
export class ProfileOverviewComponent {
  @Input() currentUser: User | null = null;
  @Input() stats: ProfileOverviewStats = {
    orders: 0,
    favorites: 0,
    points: 0,
    rentOrders: 0,
  };

  getUserAvatar(): string {
    if (this.currentUser?.avatar || this.currentUser?.profile?.avatar) {
      return this.currentUser.avatar || this.currentUser.profile?.avatar || '';
    }
    const firstLetter = this.currentUser?.fullName?.charAt(0).toUpperCase() || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=8B2635&color=fff&size=400`;
  }

  getInitials(): string {
    if (!this.currentUser?.fullName) return 'U';
    const names = this.currentUser.fullName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0][0].toUpperCase();
  }

  getMembershipTier(): string {
    const points = this.stats?.points || 0;
    if (points >= 1000) return 'Royal';
    if (points >= 300) return 'Heritage';
    return 'Classic';
  }
}
