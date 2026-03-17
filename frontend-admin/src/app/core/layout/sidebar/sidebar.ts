import { Component, input, output, inject, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../../models';

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
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent {
  public readonly isCollapsed = input.required<boolean>();
  public readonly toggleCollapse = output<void>();

  private readonly authService = inject(AuthService);
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
        { label: 'Returns & refunds', icon: 'fas fa-undo', route: '/orders/returns' },
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
}
