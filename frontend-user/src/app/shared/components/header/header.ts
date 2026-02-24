import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { CartService } from '../../../services/cart.service';
import {
  NotificationItem,
  NotificationService,
} from '../../../services/notification.service';
import { NotificationPanelComponent } from '../notification-panel/notification-panel';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    NotificationPanelComponent,
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent implements OnInit, OnDestroy {
  menuOpen = false;
  searchQuery = '';
  currentUser: any = null;
  showUserMenu = false;
  public showNotificationPanel = false;
  notifications: NotificationItem[] = [];
  notificationsLoading = false;
  notificationsError = '';
  unreadCount = 0;
  private notificationsLoaded = false;
  private userSubscription?: Subscription;
  private cartSubscription?: Subscription;
  private unreadTimer?: ReturnType<typeof setInterval>;
  cartCount = 0;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private notificationService: NotificationService,
    private router: Router,
  ) {}

  ngOnInit() {
    // Subscribe to current user changes
    this.userSubscription = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      if (!user) {
        this.notifications = [];
        this.notificationsLoaded = false;
        this.notificationsError = '';
        this.showNotificationPanel = false;
        this.unreadCount = 0;
        this.stopUnreadPolling();
      } else {
        this.startUnreadPolling();
      }
    });

    this.cartSubscription = this.cartService.itemCount$.subscribe((count) => {
      this.cartCount = count;
    });
  }

  ngOnDestroy() {
    // Cleanup subscription
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
    this.stopUnreadPolling();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const userMenu = target.closest('.user-menu-container');
    const notificationPanel = target.closest('.notification-wrapper');

    if (!userMenu && this.showUserMenu) {
      this.showUserMenu = false;
    }

    if (!notificationPanel && this.showNotificationPanel) {
      this.showNotificationPanel = false;
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  public toggleNotifications = (event?: Event) => {
    event?.preventDefault();
    event?.stopPropagation();
    this.showNotificationPanel = !this.showNotificationPanel;
    if (this.showNotificationPanel && this.currentUser) {
      this.loadNotifications(true);
      this.markAllNotificationsRead();
    }
  };

  onSearchSubmit() {
    const query = this.searchQuery.trim();
    const queryParams = query ? { search: query } : {};
    this.router.navigate(['/products'], { queryParams });
    this.menuOpen = false;
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }

  public goToRegister = () => {
    this.showNotificationPanel = false;
    this.router.navigate(['/register']);
  };

  public goToLogin = () => {
    this.showNotificationPanel = false;
    this.router.navigate(['/login']);
  };

  private loadNotifications(force = false) {
    if (!this.currentUser || this.notificationsLoading) return;
    if (this.notificationsLoaded && !force) return;

    this.notificationsLoading = true;
    this.notificationsError = '';

    const limit = 50;

    this.notificationService
      .getMyNotifications(1, limit)
      .pipe(
        switchMap((first) => {
          const pages = first?.pagination?.pages ?? 1;
          if (pages <= 1) {
            return of(first?.items || []);
          }
          const requests = [];
          for (let page = 2; page <= pages; page += 1) {
            requests.push(this.notificationService.getMyNotifications(page, limit));
          }
          return forkJoin(requests).pipe(
            map((rest) => [first, ...rest].flatMap((res) => res?.items || [])),
          );
        }),
      )
      .subscribe({
        next: (items) => {
          this.notifications = items || [];
          this.notificationsLoaded = true;
        },
        error: (err) => {
          this.notificationsError =
            err?.error?.message || 'Không thể tải thông báo.';
          this.notificationsLoading = false;
        },
        complete: () => {
          this.notificationsLoading = false;
        },
      });
  }

  private refreshUnreadCount() {
    if (!this.currentUser) return;
    this.notificationService.getMyNotifications(1, 1, true).subscribe({
      next: (data) => {
        this.unreadCount = data?.pagination?.total ?? 0;
      },
      error: () => {
        this.unreadCount = 0;
      },
    });
  }

  private startUnreadPolling() {
    if (this.unreadTimer) return;
    this.refreshUnreadCount();
    this.unreadTimer = setInterval(() => {
      if (!this.showNotificationPanel) {
        this.refreshUnreadCount();
      }
    }, 30000);
  }

  private stopUnreadPolling() {
    if (this.unreadTimer) {
      clearInterval(this.unreadTimer);
      this.unreadTimer = undefined;
    }
  }

  private markAllNotificationsRead() {
    if (!this.currentUser || this.unreadCount === 0) return;
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.unreadCount = 0;
        this.notifications = this.notifications.map((item) => ({
          ...item,
          is_read: true,
        }));
      },
      error: () => {},
    });
  }

  onLogout() {
    this.authService.logout();
    this.showUserMenu = false;
  }

  goToCart() {
    if (!this.currentUser) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
      return;
    }
    this.router.navigate(['/cart']);
  }

  getUserAvatar(): string {
    if (this.currentUser?.avatar) {
      return this.currentUser.avatar;
    }
    // Default avatar with first letter of name
    const firstLetter = this.currentUser?.fullName?.charAt(0).toUpperCase() || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=8B2635&color=fff&size=40`;
  }
}
