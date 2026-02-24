import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Clone request và thêm Authorization header nếu có token
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  // Xử lý response
  return next(req).pipe(
    catchError((error) => {
      // Nếu lỗi 401 (Unauthorized), đăng xuất
      if (error.status === 401) {
        authService.logout();
      }
      return throwError(() => error);
    }),
  );
};
