import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../models';

export const NOTIFICATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/notifications.component').then((m) => m.NotificationsComponent),
    canActivate: [roleGuard([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN])],
  },
];
