import { Routes } from '@angular/router';

export const ORDERS_ROUTES: Routes = [
  {
    path: 'sales',
    loadComponent: () => import('./pages/order-list/order-list').then((m) => m.OrderListComponent),
    data: { view: 'sales' },
  },
  {
    path: 'rent',
    loadComponent: () => import('./pages/order-list/order-list').then((m) => m.OrderListComponent),
    data: { view: 'rent' },
  },
  {
    path: 'returns',
    loadComponent: () => import('./pages/order-list/order-list').then((m) => m.OrderListComponent),
    data: { view: 'returns' },
  },
  {
    path: '',
    redirectTo: 'sales',
    pathMatch: 'full',
  },
];
