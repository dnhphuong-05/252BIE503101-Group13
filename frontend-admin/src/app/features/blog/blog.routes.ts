import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const BLOG_ROUTES: Routes = [
  {
    path: 'posts',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/blog-list/blog-list').then((m) => m.BlogListComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./pages/blog-editor/blog-editor').then((m) => m.BlogEditorComponent),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./pages/blog-editor/blog-editor').then((m) => m.BlogEditorComponent),
      },
    ],
  },
  {
    path: '',
    redirectTo: 'posts',
    pathMatch: 'full',
  },
];
