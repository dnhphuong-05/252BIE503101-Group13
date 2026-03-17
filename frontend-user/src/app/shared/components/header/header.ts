import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import {
  Subject,
  Subscription,
  catchError,
  debounceTime,
  forkJoin,
  map,
  of,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { CartService } from '../../../services/cart.service';
import {
  NotificationItem,
  NotificationService,
} from '../../../services/notification.service';
import { NotificationPanelComponent } from '../notification-panel/notification-panel';
import { Product, ProductService } from '../../../services/product.service';

type SearchSurface = 'desktop' | 'mobile';

interface SearchSuggestionItem {
  label: string;
  type: 'product' | 'category' | 'keyword';
  meta?: string;
}

interface SearchKeyboardOption {
  label: string;
}

const SEARCH_HISTORY_STORAGE_KEY = 'vietphuc.search.history';
const SEARCH_HISTORY_LIMIT = 6;
const SEARCH_SUGGESTION_LIMIT = 6;
const FALLBACK_SEARCH_KEYWORDS = [
  'Áo ngũ thân',
  'Áo tấc',
  'Nhật bình',
  'Áo tứ thân',
  'Hài Nam',
  'Thêu hoa',
  'Phụ kiện Việt phục',
  'Việt phục trẻ em',
];

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
  searchSuggestions: SearchSuggestionItem[] = [];
  searchHistory: string[] = [];
  showSearchDropdown = false;
  isSearchingSuggestions = false;
  activeSearchSurface: SearchSurface | null = null;
  activeSearchOptionIndex = -1;
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
  private readonly destroy$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();
  cartCount = 0;

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private notificationService: NotificationService,
    private productService: ProductService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadSearchHistory();
    this.setupSearchSuggestions();

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
    this.destroy$.next();
    this.destroy$.complete();
    this.searchInput$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const userMenu = target.closest('.user-menu-container');
    const notificationPanel = target.closest('.notification-wrapper');
    const searchShell = target.closest('.search-shell');

    if (!userMenu && this.showUserMenu) {
      this.showUserMenu = false;
    }

    if (!notificationPanel && this.showNotificationPanel) {
      this.showNotificationPanel = false;
    }

    if (!searchShell && this.showSearchDropdown) {
      this.hideSearchDropdown();
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    if (!this.menuOpen && this.activeSearchSurface === 'mobile') {
      this.hideSearchDropdown();
    }
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

  onSearchFocus(surface: SearchSurface) {
    this.activeSearchSurface = surface;
    this.showSearchDropdown = true;
    this.activeSearchOptionIndex = -1;

    const query = this.searchQuery.trim();
    if (!query) {
      this.searchSuggestions = [];
      return;
    }

    this.searchInput$.next(query);
  }

  onSearchQueryChange(value: string) {
    this.searchQuery = value;
    this.activeSearchOptionIndex = -1;

    if (!this.activeSearchSurface) {
      return;
    }

    this.showSearchDropdown = true;
    const query = value.trim();

    if (!query) {
      this.isSearchingSuggestions = false;
      this.searchSuggestions = [];
      return;
    }

    this.searchInput$.next(query);
  }

  onSearchKeydown(event: KeyboardEvent) {
    if (!this.hasSearchDropdownContent) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.onSearchSubmit();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        this.hideSearchDropdown();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveActiveSearchOption(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveActiveSearchOption(-1);
      return;
    }

    if (event.key === 'Enter') {
      const selectedOption = this.visibleSearchOptions[this.activeSearchOptionIndex];
      if (selectedOption) {
        event.preventDefault();
        this.applySuggestedSearch(selectedOption.label);
        return;
      }

      this.onSearchSubmit();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.hideSearchDropdown();
    }
  }

  onSearchSubmit(term: string = this.searchQuery) {
    const query = term.trim();

    if (query) {
      this.searchQuery = query;
      this.persistSearchHistory(query);
    }

    const queryParams = query ? { search: query } : {};
    this.hideSearchDropdown();
    this.router.navigate(['/products'], { queryParams });
    this.menuOpen = false;
  }

  applySuggestedSearch(term: string) {
    this.searchQuery = term;
    this.onSearchSubmit(term);
  }

  isSearchSurfaceOpen(surface: SearchSurface): boolean {
    return this.showSearchDropdown && this.activeSearchSurface === surface;
  }

  get filteredSearchHistory(): string[] {
    const query = this.normalizeSearchText(this.searchQuery);
    if (!query) {
      return this.searchHistory.slice(0, SEARCH_HISTORY_LIMIT);
    }

    return this.searchHistory
      .filter((term) => this.normalizeSearchText(term).includes(query))
      .slice(0, SEARCH_HISTORY_LIMIT);
  }

  get hasSearchDropdownContent(): boolean {
    return (
      this.isSearchingSuggestions ||
      this.searchSuggestions.length > 0 ||
      this.filteredSearchHistory.length > 0 ||
      this.searchQuery.trim().length > 0
    );
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

  get visibleSearchOptions(): SearchKeyboardOption[] {
    return [
      ...this.searchSuggestions.map((item) => ({ label: item.label })),
      ...this.filteredSearchHistory.map((item) => ({ label: item })),
    ];
  }

  isSearchOptionActive(section: 'suggestion' | 'history', index: number): boolean {
    return this.activeSearchOptionIndex === this.getSearchOptionIndex(section, index);
  }

  private setupSearchSuggestions() {
    this.searchInput$
      .pipe(
        map((value) => value.trim()),
        debounceTime(180),
        tap((query) => {
          this.isSearchingSuggestions = query.length > 0;
        }),
        switchMap((query) => {
          if (!query) {
            return of({ query, suggestions: [] as SearchSuggestionItem[] });
          }

          return this.productService
            .getAllProducts({
              search: query,
              limit: SEARCH_SUGGESTION_LIMIT,
              status: 'active',
            })
            .pipe(
              map((response) => ({
                query,
                suggestions: this.buildSearchSuggestions(query, response?.data?.items || []),
              })),
              catchError(() =>
                of({
                  query,
                  suggestions: this.buildSearchSuggestions(query, []),
                }),
              ),
            );
        }),
        takeUntil(this.destroy$),
      )
        .subscribe(({ query, suggestions }) => {
          if (query === this.searchQuery.trim()) {
            this.searchSuggestions = suggestions;
            this.activeSearchOptionIndex = -1;
          }
          this.isSearchingSuggestions = false;
        });
  }

  private buildSearchSuggestions(query: string, products: Product[]): SearchSuggestionItem[] {
    const normalizedQuery = this.normalizeSearchText(query);
    const seen = new Set<string>();
    const suggestions: SearchSuggestionItem[] = [];

    const pushSuggestion = (
      label: string | undefined,
      type: SearchSuggestionItem['type'],
      meta?: string,
    ) => {
      const trimmed = String(label || '').trim();
      if (!trimmed) {
        return;
      }

      const normalized = this.normalizeSearchText(trimmed);
      if (!normalized || normalized === normalizedQuery || seen.has(normalized)) {
        return;
      }

      seen.add(normalized);
      suggestions.push({ label: trimmed, type, meta });
    };

    products.forEach((product) => {
      if (this.matchesSearchQuery(product.name, normalizedQuery)) {
        pushSuggestion(product.name, 'product', product.category_name || 'Sản phẩm');
      }
    });

    products.forEach((product) => {
      const relatedTerms = [
        product.category_name,
        product.category,
        ...(product.categories || []),
        ...(product.tags || []),
      ];

      relatedTerms.forEach((term) => {
        if (this.matchesSearchQuery(term, normalizedQuery)) {
          pushSuggestion(term, 'category', 'Liên quan');
        }
      });
    });

    FALLBACK_SEARCH_KEYWORDS.forEach((keyword) => {
      if (this.matchesSearchQuery(keyword, normalizedQuery)) {
        pushSuggestion(keyword, 'keyword', 'Gợi ý');
      }
    });

    return suggestions.slice(0, SEARCH_SUGGESTION_LIMIT);
  }

  private matchesSearchQuery(term: string | undefined, query: string): boolean {
    if (!term || !query) {
      return false;
    }

    return this.normalizeSearchText(term).includes(query);
  }

  private normalizeSearchText(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private loadSearchHistory() {
    if (!this.canUseBrowserStorage()) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(parsed)) {
        this.searchHistory = [];
        return;
      }

      this.searchHistory = parsed
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .slice(0, SEARCH_HISTORY_LIMIT);
    } catch {
      this.searchHistory = [];
    }
  }

  private persistSearchHistory(term: string) {
    const query = term.trim();
    if (!query) {
      return;
    }

    const normalizedQuery = this.normalizeSearchText(query);
    this.searchHistory = [
      query,
      ...this.searchHistory.filter(
        (item) => this.normalizeSearchText(item) !== normalizedQuery,
      ),
    ].slice(0, SEARCH_HISTORY_LIMIT);

    if (!this.canUseBrowserStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(
        SEARCH_HISTORY_STORAGE_KEY,
        JSON.stringify(this.searchHistory),
      );
    } catch {}
  }

  private hideSearchDropdown() {
    this.showSearchDropdown = false;
    this.activeSearchSurface = null;
    this.isSearchingSuggestions = false;
    this.activeSearchOptionIndex = -1;
  }

  private canUseBrowserStorage(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  private moveActiveSearchOption(direction: -1 | 1) {
    const optionCount = this.visibleSearchOptions.length;
    if (!optionCount) {
      return;
    }

    if (!this.showSearchDropdown) {
      this.showSearchDropdown = true;
    }

    const nextIndex =
      this.activeSearchOptionIndex < 0
        ? direction > 0
          ? 0
          : optionCount - 1
        : (this.activeSearchOptionIndex + direction + optionCount) % optionCount;

    this.activeSearchOptionIndex = nextIndex;
    this.scrollActiveSearchOptionIntoView();
  }

  private getSearchOptionIndex(section: 'suggestion' | 'history', index: number): number {
    if (section === 'suggestion') {
      return index;
    }

    return this.searchSuggestions.length + index;
  }

  private scrollActiveSearchOptionIntoView() {
    if (typeof document === 'undefined' || this.activeSearchOptionIndex < 0) {
      return;
    }

    requestAnimationFrame(() => {
      const activeOption = document.querySelector<HTMLElement>(
        `.search-shell.is-open [data-search-option-index="${this.activeSearchOptionIndex}"]`,
      );

      activeOption?.scrollIntoView({
        block: 'nearest',
      });
    });
  }
}
