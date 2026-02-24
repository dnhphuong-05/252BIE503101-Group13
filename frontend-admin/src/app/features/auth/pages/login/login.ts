import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoginRequest } from '../../../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  protected identifier = '';
  protected password = '';
  protected showPassword = false;
  protected loginError = '';
  protected isLoading = false;

  protected togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private buildCredentials(): LoginRequest {
    const value = this.identifier.trim();
    const isPhone = /^[0-9]{9,12}$/.test(value);
    return isPhone
      ? { phone: value, password: this.password }
      : { email: value, password: this.password };
  }

  protected onSignIn(): void {
    this.loginError = '';
    this.isLoading = true;

    const credentials = this.buildCredentials();

    this.authService.login(credentials).subscribe({
      next: (response) => {
        if (!response.success || !response.data) {
          this.loginError = 'Đăng nhập thất bại';
          this.isLoading = false;
          return;
        }

        const allowedRoles = ['admin', 'staff', 'super_admin'];
        if (!allowedRoles.includes(response.data.user.role)) {
          this.loginError = 'Bạn không có quyền truy cập vào hệ thống quản trị';
          this.isLoading = false;
          return;
        }

        const displayName =
          response.data.user.name ||
          (response.data.user as unknown as { fullName?: string }).fullName ||
          response.data.user.email ||
          response.data.user.phone ||
          'bạn';
        this.notificationService.showSuccess(`Chào mừng ${displayName}!`);
        this.isLoading = false;

        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 500);
      },
      error: (error) => {
        this.isLoading = false;
        this.loginError = error.error?.message || 'Sai tài khoản hoặc mật khẩu';
      },
    });
  }
}
