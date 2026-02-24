import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header';
import { FooterComponent } from '../../shared/components/footer/footer';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { environment } from '../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent, FooterComponent],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  submitted = false;
  loginError = '';
  isLoading = false;
  googleButtonRendered = false;
  showPassword = false;
  googleClientId = environment.googleClientId || '';
  googleEnabled = !!this.googleClientId;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    // Khởi tạo form với validators
    this.loginForm = this.formBuilder.group({
      phone: ['', [Validators.required, Validators.pattern(/^(0[3|5|7|8|9])+([0-9]{8})$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });

    // Load Google Sign-In
    this.loadGoogleSignIn();
  }

  // Load Google Sign-In API
  loadGoogleSignIn() {
    if (!this.googleEnabled) {
      return;
    }

    const existingScript = document.getElementById('google-gsi-script');
    if (existingScript) {
      this.initializeGoogleSignIn();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.initializeGoogleSignIn();
    };
    document.head.appendChild(script);
  }

  // Khởi tạo Google Sign-In
  initializeGoogleSignIn() {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: (response: any) => this.handleGoogleCallback(response),
        auto_select: false,
      });

      const buttonContainer = document.getElementById('google-button-container');
      if (buttonContainer && !this.googleButtonRendered) {
        google.accounts.id.renderButton(buttonContainer, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: buttonContainer.clientWidth || 320,
        });
        this.googleButtonRendered = true;
      }
    }
  }

  // Xử lý response từ Google
  handleGoogleCallback(response: any) {
    console.log('Google JWT Token:', response.credential);

    // Decode JWT để xem thông tin user
    const userInfo = this.parseJwt(response.credential);
    console.log('User Info:', userInfo);

    this.isLoading = true;
    this.loginError = '';

    // Gửi token lên backend để xác thực
    this.authService.googleLogin(response.credential).subscribe({
      next: (res) => {
        console.log('Đăng nhập Google thành công:', res);
        this.isLoading = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Lỗi đăng nhập Google:', err);
        this.isLoading = false;
        this.loginError =
          err.error?.error?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.';
      },
    });
  }

  // Parse JWT token
  parseJwt(token: string) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  }

  // Getter để truy cập form controls dễ dàng
  get f() {
    return this.loginForm.controls;
  }

  // Chỉ cho phép nhập số
  onlyNumbers(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    // Chỉ cho phép số 0-9
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  // Toggle hiển thị mật khẩu
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
    console.log('Password visibility toggled:', this.showPassword);
  }

  // Không dùng One Tap để tránh cảnh báo FedCM

  // Xử lý submit form
  onSignIn() {
    this.submitted = true;
    this.loginError = '';

    // Dừng nếu form không hợp lệ
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;

    // Gọi API đăng nhập với phone number
    const loginData = {
      phone: this.loginForm.value.phone,
      password: this.loginForm.value.password,
    };

    this.authService.login(loginData).subscribe({
      next: (response) => {
        console.log('Đăng nhập thành công:', response);
        this.isLoading = false;

        // Hiển thị toast notification
        this.toastService.success(`Chào mừng ${response.data.user.fullName}!`);

        // Chuyển hướng về trang chủ sau 500ms
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 500);
      },
      error: (error) => {
        console.error('Lỗi đăng nhập:', error);
        this.isLoading = false;
        this.loginError = error.error?.message || 'Số điện thoại hoặc mật khẩu không đúng';
      },
    });
  }

  switchToSignUp(event: Event) {
    event.preventDefault();
    this.router.navigate(['/register']);
  }
}
