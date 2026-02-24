import { Routes } from '@angular/router';
import { UserLayoutComponent } from './layouts/user-layout/user-layout';
import { HomeComponent } from './features/home/home';
import { LoginComponent } from './features/account/login';
import { RegisterComponent } from './features/account/register';
import { ProductsComponent } from './features/products/products';
import { ProductDetailComponent } from './features/product-detail/product-detail';
import { Cart } from './features/cart/cart';
import { CheckOut } from './features/check-out/check-out';
import { RentalCheckout } from './features/rental-checkout/rental-checkout';
import { AboutComponent } from './features/about/about';
import { BlogComponent } from './features/blog/blog';
import { BlogDetailComponent } from './features/blog-detail/blog-detail';
import { ContactComponent } from './features/contact/contact';
import { ServicesComponent } from './features/services/services';
import { ProfileLayoutComponent } from './features/profile/profile-layout/profile-layout';
import { ProfileInfoComponent } from './features/profile/profile-info/profile-info';
import { ProfileOverviewPageComponent } from './features/profile/profile-overview-page/profile-overview-page';
import { ProfileMeasurementsComponent } from './features/profile/profile-measurements/profile-measurements';
import { ProfileReviewsCommentsComponent } from './features/profile/profile-reviews-comments/profile-reviews-comments';
import { ProfileOrdersComponent } from './features/profile/profile-orders/profile-orders';
import { ProfileAddressesComponent } from './features/profile/profile-addresses/profile-addresses';
import { ProfileWalletComponent } from './features/profile/profile-wallet/profile-wallet';
import { ProfileRecentlyViewedComponent } from './features/profile/profile-recently-viewed/profile-recently-viewed';
import { ProfileChangePasswordComponent } from './features/profile/profile-change-password/profile-change-password';
import { ProfileRentalsComponent } from './features/profile/profile-rentals/profile-rentals';

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
      { path: 'products/:id', component: ProductDetailComponent },
      { path: 'cart', component: Cart },
      { path: 'check-out', component: CheckOut },
      { path: 'rental-checkout', component: RentalCheckout },
      { path: 'services', component: ServicesComponent },
      { path: 'about', component: AboutComponent },
      { path: 'blog', component: BlogComponent },
      { path: 'blog/:slug', component: BlogDetailComponent },
      { path: 'contact', component: ContactComponent },
      {
        path: 'profile',
        component: ProfileLayoutComponent,
        children: [
          { path: '', redirectTo: 'overview', pathMatch: 'full' },
          { path: 'overview', component: ProfileOverviewPageComponent },
          { path: 'info', component: ProfileInfoComponent },
          { path: 'measurements', component: ProfileMeasurementsComponent },
          { path: 'reviews-comments', component: ProfileReviewsCommentsComponent },
          { path: 'orders', component: ProfileOrdersComponent },
          { path: 'rentals', component: ProfileRentalsComponent },
          { path: 'addresses', component: ProfileAddressesComponent },
          { path: 'wallet', component: ProfileWalletComponent },
          { path: 'recently-viewed', component: ProfileRecentlyViewedComponent },
          { path: 'security', component: ProfileChangePasswordComponent },
          { path: 'change-password', component: ProfileChangePasswordComponent },
        ],
      },
    ],
  },
];
