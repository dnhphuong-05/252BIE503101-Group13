import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AdminShellComponent } from './core/layout/admin-shell/admin-shell';
import { ForbiddenComponent } from './features/auth/pages/forbidden/forbidden';

export const routes: Routes = [
  // Auth routes (no layout)
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Forbidden page (no layout)
  {
    path: 'forbidden',
    component: ForbiddenComponent,
  },

  // Admin routes (with AdminShell layout)
  {
    path: '',
    component: AdminShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('./features/notifications/notifications.routes').then(
            (m) => m.NOTIFICATIONS_ROUTES,
          ),
      },
      {
        path: 'orders',
        loadChildren: () => import('./features/orders/orders.routes').then((m) => m.ORDERS_ROUTES),
      },
      {
        path: 'products',
        loadChildren: () =>
          import('./features/products/products.routes').then((m) => m.PRODUCTS_ROUTES),
      },
      {
        path: 'blog',
        loadChildren: () => import('./features/blog/blog.routes').then((m) => m.BLOG_ROUTES),
      },
      {
        path: 'comments',
        loadChildren: () =>
          import('./features/comments/comments.routes').then((m) => m.COMMENTS_ROUTES),
      },
      {
        path: 'contacts',
        loadChildren: () =>
          import('./features/contacts/contacts.routes').then((m) => m.contactsRoutes),
      },
      {
        path: 'users',
        loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/account/pages/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/account/pages/settings/settings').then((m) => m.SettingsComponent),
      },
      // TODO: Implement vouchers and wallet features
      // {
      //   path: 'vouchers',
      //   loadChildren: () =>
      //     import('./features/vouchers/vouchers.routes').then((m) => m.vouchersRoutes),
      // },
      // {
      //   path: 'wallet',
      //   loadChildren: () => import('./features/wallet/wallet.routes').then((m) => m.walletRoutes),
      // },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // Wildcard redirect
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
