import { Routes } from '@angular/router';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/product-list').then((m) => m.ProductListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/product-editor/product-editor').then((m) => m.ProductEditorComponent),
  },
  {
    path: 'reviews',
    loadComponent: () =>
      import('./pages/product-reviews').then((m) => m.ProductReviewsComponent),
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./pages/product-editor/product-editor').then((m) => m.ProductEditorComponent),
  },
];
