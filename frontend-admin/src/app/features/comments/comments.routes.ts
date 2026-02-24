import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { UserRole } from '../../models/auth.model';

export const COMMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/comment-moderation/comment-moderation').then(
        (m) => m.CommentModerationComponent,
      ),
    canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN])],
  },
];
