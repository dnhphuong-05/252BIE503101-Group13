import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService, User } from '../../../services/auth.service';
import { AccountService } from '../../../services/account.service';
import {
  ProfileOverviewComponent,
  ProfileOverviewStats,
} from '../profile-info/components/profile-overview/profile-overview';

type SummaryStats = {
  orders?: number;
  favorites?: number;
  points?: number;
  rent_orders?: number;
  rentOrders?: number;
};

@Component({
  selector: 'app-profile-overview-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ProfileOverviewComponent],
  templateUrl: './profile-overview-page.html',
  styleUrl: './profile-overview-page.css',
})
export class ProfileOverviewPageComponent implements OnInit {
  currentUser: User | null = null;
  stats: ProfileOverviewStats = {
    orders: 0,
    favorites: 0,
    points: 0,
    rentOrders: 0,
  };
  isLoading = false;

  constructor(
    private authService: AuthService,
    private accountService: AccountService,
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      if (user?.loyalty?.total_points) {
        this.stats = { ...this.stats, points: user.loyalty.total_points };
      }
    });
    this.loadSummary();
  }

  loadSummary() {
    this.isLoading = true;
    this.accountService.getSummary().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response?.success && response.data) {
          const summary = response.data;
          const stats = (summary?.stats || {}) as SummaryStats;
          const points = summary?.loyalty?.total_points ?? stats.points ?? 0;
          this.stats = {
            orders: stats.orders ?? 0,
            favorites: stats.favorites ?? 0,
            points,
            rentOrders: stats.rent_orders ?? stats.rentOrders ?? 0,
          };

          const currentUser = this.authService.currentUserValue;
          if (currentUser) {
            this.authService.updateCurrentUser({
              ...currentUser,
              loyalty: {
                ...(currentUser.loyalty || {}),
                total_points: points,
              },
            });
          }
        }
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }
}
