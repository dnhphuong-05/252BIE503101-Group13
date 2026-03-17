import { Routes } from '@angular/router';

export const ORDERS_ROUTES: Routes = [
  {
    path: 'sales/:id',
    loadComponent: () => import('./pages/order-list/order-list').then((m) => m.OrderListComponent),
    data: { view: 'sales', detail: true },
  },
  {
    path: 'sales',
    loadComponent: () => import('./pages/order-list/order-list').then((m) => m.OrderListComponent),
    data: { view: 'sales', detail: false },
  },
  {
    path: 'tailor/:id',
    loadComponent: () =>
      import('./pages/tailor-order-detail/tailor-order-detail').then(
        (m) => m.TailorOrderDetailComponent,
      ),
  },
  {
    path: 'tailor',
    loadComponent: () =>
      import('./pages/tailor-orders/tailor-orders').then((m) => m.TailorOrdersComponent),
  },
  {
    path: 'rent/:id',
    loadComponent: () => import('./pages/order-list/order-list').then((m) => m.OrderListComponent),
    data: { view: 'rent', detail: true },
  },
  {
    path: 'rent',
    loadComponent: () => import('./pages/order-list/order-list').then((m) => m.OrderListComponent),
    data: { view: 'rent', detail: false },
  },
  {
    path: 'returns/:id',
    loadComponent: () => import('./pages/order-list/order-list').then((m) => m.OrderListComponent),
    data: { view: 'returns', detail: true },
  },
  {
    path: 'returns',
    loadComponent: () => import('./pages/order-list/order-list').then((m) => m.OrderListComponent),
    data: { view: 'returns', detail: false },
  },
  {
    path: '',
    redirectTo: 'sales',
    pathMatch: 'full',
  },
];
