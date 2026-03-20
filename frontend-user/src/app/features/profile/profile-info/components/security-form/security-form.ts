import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PasswordChangeData } from '../../../../../services/user.service';

const passwordComplexPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

@Component({
  selector: 'app-security-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './security-form.html',
  styleUrl: './security-form.css',
})
export class SecurityFormComponent implements OnInit {
  @Output() changePassword = new EventEmitter<PasswordChangeData>();

  passwordForm!: FormGroup;
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  isChangingPassword = false;

  constructor(private formBuilder: FormBuilder) {}

  ngOnInit() {
    this.initializeForm();
  }

  initializeForm() {
    this.passwordForm = this.formBuilder.group(
      {
        oldPassword: ['', [Validators.required, Validators.minLength(6)]],
        newPassword: [
          '',
          [Validators.required, Validators.minLength(6), Validators.pattern(passwordComplexPattern)],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      },
    );
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');

    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  toggleOldPassword() {
    this.showOldPassword = !this.showOldPassword;
  }

  toggleNewPassword() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  togglePasswordChange() {
    this.isChangingPassword = !this.isChangingPassword;
    if (!this.isChangingPassword) {
      this.passwordForm.reset();
    }
  }

  onSubmit() {
    if (this.passwordForm.valid) {
      const passwordData = {
        oldPassword: this.passwordForm.value.oldPassword,
        newPassword: this.passwordForm.value.newPassword,
      };
      this.changePassword.emit(passwordData);
      this.isChangingPassword = false;
      this.passwordForm.reset();
    }
  }

  getPasswordStrength(): string {
    const password = this.passwordForm.get('newPassword')?.value || '';
    if (password.length === 0) return '';
    if (password.length < 6) return 'weak';

    let strength = 0;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength >= 3) return 'strong';
    if (strength >= 2) return 'medium';
    return 'weak';
  }

  getPasswordStrengthLabel(): string {
    const strength = this.getPasswordStrength();
    switch (strength) {
      case 'strong':
        return 'Mạnh';
      case 'medium':
        return 'Trung bình';
      case 'weak':
        return 'Yếu';
      default:
        return '';
    }
  }
}
