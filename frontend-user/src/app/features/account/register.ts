import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header';
import { FooterComponent } from '../../shared/components/footer/footer';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent, FooterComponent],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  submitted = false;
  registerError = '';
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.registerForm = this.formBuilder.group(
      {
        fullName: ['', [Validators.required, Validators.minLength(2)]],
        phone: ['', [Validators.required, Validators.pattern(/^(0[3|5|7|8|9])+([0-9]{8})$/)]],
        email: ['', [Validators.required, Validators.email]],
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
          ],
        ],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  // Custom validator để kiểm tra mật khẩu khớp
  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  // Getter để truy cập form controls dễ dàng
  get f() {
    return this.registerForm.controls;
  }

  // Chỉ cho phép nhập số
  onlyNumbers(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  // Toggle hiển thị mật khẩu
  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  onSignUp() {
    this.submitted = true;
    this.registerError = '';

    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;

    const registerData = {
      fullName: this.registerForm.value.fullName,
      phone: this.registerForm.value.phone,
      email: this.registerForm.value.email,
      password: this.registerForm.value.password,
      confirmPassword: this.registerForm.value.confirmPassword, // Thêm confirmPassword
    };

    this.authService.register(registerData).subscribe({
      next: (response) => {
        console.log('Đăng ký thành công:', response);
        this.isLoading = false;

        // Hiển thị toast notification góc trên phải
        this.toastService.success('Bạn đã đăng ký thành công!');

        // Chuyển sang trang đăng nhập sau 1.5 giây
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (error) => {
        console.error('Lỗi đăng ký:', error);
        this.isLoading = false;
        this.registerError = error.error?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      },
    });
  }

  switchToSignIn(event: Event) {
    event.preventDefault();
    this.router.navigate(['/login']);
  }
}
