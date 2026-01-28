import { Routes } from '@angular/router';
import { UserLayoutComponent } from './layouts/user-layout/user-layout';
import { HomeComponent } from './features/home/home';
import { LoginComponent } from './features/account/login';
import { RegisterComponent } from './features/account/register';
import { ProductsComponent } from './features/products/products';
import { AboutComponent } from './features/about/about';
import { BlogComponent } from './features/blog/blog';
import { ContactComponent } from './features/contact/contact';
import { ServicesComponent } from './features/services/services';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    component: UserLayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'home', component: HomeComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'services', component: ServicesComponent },
      { path: 'about', component: AboutComponent },
      { path: 'blog', component: BlogComponent },
      { path: 'contact', component: ContactComponent },
    ],
  },
];
