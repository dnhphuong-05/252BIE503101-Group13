import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../models/auth.model';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/user-list/user-list').then((m) => m.UserListComponent),
    canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN])],
  },
  {
    path: 'guests',
    loadComponent: () => import('./pages/guest-list/guest-list').then((m) => m.GuestListComponent),
    canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN])],
  },
  {
    path: 'roles',
    loadComponent: () => import('./pages/roles/roles').then((m) => m.RolesComponent),
    canActivate: [roleGuard([UserRole.SUPER_ADMIN])],
  },
];
