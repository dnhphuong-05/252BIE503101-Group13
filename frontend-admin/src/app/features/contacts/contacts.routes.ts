import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../models/auth.model';

export const contactsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/contacts.component').then((m) => m.ContactsComponent),
    canActivate: [roleGuard([UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN])],
  },
];
