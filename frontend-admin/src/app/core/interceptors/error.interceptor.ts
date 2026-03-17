import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const router = inject(Router);
  const authService = inject(AuthService);
  const shouldSkipToast =
    req.url.includes('/tailor-orders') || req.headers.get('x-skip-error-toast') === '1';

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        errorMessage =
          error.error?.message || `Error Code: ${error.status}\nMessage: ${error.message}`;

        // Handle specific error codes
        switch (error.status) {
          case 401:
            errorMessage = 'Unauthorized. Please login again.';
            authService.logout();
            break;
          case 403:
            errorMessage = 'Access forbidden. You do not have permission.';
            router.navigate(['/forbidden']);
            break;
          case 404:
            errorMessage = 'Resource not found.';
            break;
          case 500:
            errorMessage = 'Internal server error. Please try again later.';
            break;
        }
      }

      if (!shouldSkipToast) {
        notificationService.showError(errorMessage);
      }
      return throwError(() => error);
    }),
  );
};
