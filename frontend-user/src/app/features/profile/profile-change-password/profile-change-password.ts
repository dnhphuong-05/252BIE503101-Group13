import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';
import { ProfileService } from '../../../services/profile.service';

@Component({
  selector: 'app-profile-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="change-password-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            <i class="fas fa-shield-alt"></i>
            Bảo mật
          </h1>
          <p class="page-subtitle">Đổi mật khẩu để bảo vệ tài khoản của bạn.</p>
        </div>
      </div>

      <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="password-form">
        <div class="form-group">
          <label>Mật khẩu hiện tại <span class="required">*</span></label>
          <div class="input-wrapper">
            <i class="fas fa-lock"></i>
            <input
              [type]="showCurrentPassword ? 'text' : 'password'"
              formControlName="currentPassword"
              class="form-control"
              placeholder="Nhập mật khẩu hiện tại"
            />
            <button
              type="button"
              class="toggle-password"
              (click)="showCurrentPassword = !showCurrentPassword"
            >
              <i class="fas" [ngClass]="showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Mật khẩu mới <span class="required">*</span></label>
          <div class="input-wrapper">
            <i class="fas fa-lock"></i>
            <input
              [type]="showNewPassword ? 'text' : 'password'"
              formControlName="newPassword"
              class="form-control"
              placeholder="Nhập mật khẩu mới"
            />
            <button
              type="button"
              class="toggle-password"
              (click)="showNewPassword = !showNewPassword"
            >
              <i class="fas" [ngClass]="showNewPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Xác nhận mật khẩu mới <span class="required">*</span></label>
          <div class="input-wrapper">
            <i class="fas fa-lock"></i>
            <input
              [type]="showConfirmPassword ? 'text' : 'password'"
              formControlName="confirmPassword"
              class="form-control"
              placeholder="Nhập lại mật khẩu mới"
            />
            <button
              type="button"
              class="toggle-password"
              (click)="showConfirmPassword = !showConfirmPassword"
            >
              <i class="fas" [ngClass]="showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-save" [disabled]="passwordForm.invalid || isLoading">
          @if (isLoading) {
            <i class="fas fa-spinner fa-spin"></i>
          } @else {
            <i class="fas fa-check"></i>
          }
          <span>Cập nhật mật khẩu</span>
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      .change-password-page {
        animation: fadeIn 0.4s ease-out;
        margin-top: 45px;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .page-header {
        margin-bottom: 32px;
        padding-bottom: 24px;
        border-bottom: 2px solid rgba(139, 38, 53, 0.1);
      }
      .page-title {
        font-family: 'Noto Serif', 'Georgia', serif;
        font-size: 32px;
        font-weight: 700;
        color: #8b2635;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .page-subtitle {
        margin: 6px 0 0;
        font-size: 14px;
        color: #666666;
        font-family: 'Noto Sans', sans-serif;
      }
      .password-form {
        max-width: 500px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .form-group label {
        font-family: 'Noto Serif', 'Georgia', serif;
        font-size: 14px;
        font-weight: 600;
        color: #2c2c2c;
      }
      .required {
        color: #d32f2f;
      }
      .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }
      .input-wrapper > i:first-child {
        position: absolute;
        left: 16px;
        color: #999999;
        font-size: 16px;
        z-index: 1;
      }
      .form-control {
        width: 100%;
        padding: 14px 48px;
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        font-family: 'Noto Sans', sans-serif;
        font-size: 15px;
        color: #2c2c2c;
        background: #ffffff;
        transition: all 0.3s ease;
      }
      .form-control:focus {
        outline: none;
        border-color: #8b2635;
        box-shadow: 0 0 0 4px rgba(139, 38, 53, 0.1);
      }
      .toggle-password {
        position: absolute;
        right: 12px;
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        color: #999999;
        transition: color 0.3s ease;
      }
      .toggle-password:hover {
        color: #8b2635;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 14px 32px;
        border-radius: 12px;
        font-family: 'Noto Serif', 'Georgia', serif;
        font-size: 15px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .btn-save {
        background: linear-gradient(135deg, #8b2635 0%, #a52a3a 100%);
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(139, 38, 53, 0.3);
        margin-top: 8px;
      }
      .btn-save:hover:not(:disabled) {
        background: linear-gradient(135deg, #a52a3a 0%, #b8314a 100%);
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(139, 38, 53, 0.4);
      }
      .btn-save:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class ProfileChangePasswordComponent {
  passwordForm: FormGroup;
  isLoading = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private toastService: ToastService,
    private profileService: ProfileService,
  ) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  changePassword() {
    if (this.passwordForm.invalid) return;

    this.isLoading = true;
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.toastService.error('Mật khẩu xác nhận không khớp');
      this.isLoading = false;
      return;
    }
    this.profileService.changePassword({ oldPassword: currentPassword, newPassword }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.toastService.success('Đổi mật khẩu thành công!');
          this.passwordForm.reset();
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.toastService.error(error.error?.message || 'Đổi mật khẩu thất bại');
      },
    });
  }
}
