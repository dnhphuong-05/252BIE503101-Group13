import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../../models';
import { Subscription, filter } from 'rxjs';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles?: UserRole[];
  badge?: number;
  children?: MenuItem[];
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent implements AfterViewInit, OnDestroy {
  public readonly isCollapsed = input.required<boolean>();
  public readonly toggleCollapse = output<void>();
  @ViewChild('sidebarRef') private sidebarRef?: ElementRef<HTMLElement>;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private navEventsSub?: Subscription;
  protected readonly currentUser = this.authService.currentUser;

  private readonly menuSections: MenuSection[] = [
    {
      label: 'Home',
      items: [
        { label: 'Dashboard', icon: 'fas fa-home', route: '/dashboard' },
        {
          label: 'Notifications',
          icon: 'fas fa-bell',
          route: '/notifications',
          roles: [UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN],
        },
      ],
    },
    {
      label: 'Orders',
      items: [
        { label: 'Sales orders', icon: 'fas fa-shopping-bag', route: '/orders/sales' },
        { label: 'Tailor orders', icon: 'fas fa-ruler-combined', route: '/orders/tailor' },
        { label: 'Rent orders', icon: 'fas fa-calendar', route: '/orders/rent' },
        { label: 'Return orders', icon: 'fas fa-undo', route: '/orders/returns' },
      ],
    },
    {
      label: 'Products',
      items: [
        { label: 'All products', icon: 'fas fa-box', route: '/products' },
        { label: 'New product', icon: 'fas fa-circle-plus', route: '/products/new' },
        { label: 'Ratings & reviews', icon: 'fas fa-star', route: '/products/reviews' },
      ],
    },
    {
      label: 'Blog',
      items: [
        { label: 'Posts', icon: 'fas fa-book', route: '/blog/posts' },
        { label: 'New post', icon: 'fas fa-pen-to-square', route: '/blog/posts/new' },
        { label: 'Comments', icon: 'fas fa-comments', route: '/comments' },
      ],
    },
    {
      label: 'Contact',
      items: [
        {
          label: 'Inbox',
          icon: 'fas fa-inbox',
          route: '/contacts',
          roles: [UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN],
        },
      ],
    },
    {
      label: 'Users',
      items: [
        {
          label: 'User list',
          icon: 'fas fa-users',
          route: '/users',
          roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
        },
        {
          label: 'Guest customers',
          icon: 'fas fa-user-clock',
          route: '/users/guests',
          roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
        },
        {
          label: 'Roles & Permissions',
          icon: 'fas fa-shield-alt',
          route: '/users/roles',
          roles: [UserRole.SUPER_ADMIN],
        },
      ],
    },
  ];

  protected readonly openGroups = signal(new Set<string>());

  protected readonly visibleSections = computed(() => {
    const user = this.currentUser();
    if (!user) return [];

    return this.menuSections
      .map((section) => {
        const filteredItems = section.items
          .map((item) => {
            if (item.roles && !item.roles.includes(user.role)) {
              return null;
            }
            if (item.children?.length) {
              const filteredChildren = item.children.filter((child) => {
                if (!child.roles) return true;
                return child.roles.includes(user.role);
              });
              return { ...item, children: filteredChildren };
            }
            return item;
          })
          .filter(Boolean) as MenuItem[];

        return { ...section, items: filteredItems };
      })
      .filter((section) => section.items.length > 0);
  });

  protected toggleGroup(label: string): void {
    const next = new Set(this.openGroups());
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    this.openGroups.set(next);
  }

  protected isGroupOpen(label: string): boolean {
    return this.openGroups().has(label);
  }

  protected isRouteActive(route: string): boolean {
    const current = this.normalizePath(this.router.url);
    const target = this.normalizePath(route);

    if (current === target) {
      return true;
    }

    // Keep list menu item active while viewing its detail page.
    if (target.startsWith('/orders/') || target === '/contacts') {
      return current.startsWith(`${target}/`);
    }

    // Keep user list active on /users/:id but avoid matching other user submodules.
    if (target === '/users') {
      return (
        current.startsWith('/users/') &&
        !current.startsWith('/users/guests') &&
        !current.startsWith('/users/roles')
      );
    }

    // Keep guest customers item active on /users/guests/:id
    if (target === '/users/guests') {
      return current.startsWith('/users/guests/');
    }

    return false;
  }

  protected onSidebarScroll(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem('admin_sidebar_scroll_top', String(target.scrollTop));
    } catch {
      return;
    }
  }

  ngAfterViewInit(): void {
    this.restoreSidebarScroll();
    this.scrollActiveItemIntoView();
    this.navEventsSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => this.scrollActiveItemIntoView(), 0);
      });
  }

  ngOnDestroy(): void {
    this.navEventsSub?.unsubscribe();
  }

  private restoreSidebarScroll(): void {
    const host = this.sidebarRef?.nativeElement;
    if (!host) return;
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem('admin_sidebar_scroll_top');
      const scrollTop = raw ? Number(raw) : 0;
      if (!Number.isNaN(scrollTop) && scrollTop > 0) {
        host.scrollTop = scrollTop;
      }
    } catch {
      return;
    }
  }

  private scrollActiveItemIntoView(): void {
    const host = this.sidebarRef?.nativeElement;
    if (!host) return;

    const active = host.querySelector<HTMLElement>('.nav-item.active, .nav-child.active');
    if (!active) return;

    const hostRect = host.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const isAbove = activeRect.top < hostRect.top + 88;
    const isBelow = activeRect.bottom > hostRect.bottom - 20;
    if (!isAbove && !isBelow) return;

    active.scrollIntoView({ block: 'center', inline: 'nearest' });
  }

  private normalizePath(path: string): string {
    const [withoutQuery] = String(path || '').split(/[?#]/);
    const normalized = withoutQuery.replace(/\/+$/, '');
    return normalized || '/';
  }
}
