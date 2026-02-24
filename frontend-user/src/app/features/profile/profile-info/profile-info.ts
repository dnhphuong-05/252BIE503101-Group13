import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, User } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ProfileService } from '../../../services/profile.service';
import { ApiResponse, ProfileUpdateData } from '../../../services/user.service';

import { BasicInfoFormComponent } from './components/basic-info-form/basic-info-form';

@Component({
  selector: 'app-profile-info',
  standalone: true,
  imports: [
    CommonModule,
    BasicInfoFormComponent,
  ],
  templateUrl: './profile-info.html',
  styleUrl: './profile-info.css',
})
export class ProfileInfoComponent implements OnInit {
  currentUser: User | null = null;
  isLoading = false;

  constructor(
    private authService: AuthService,
    private profileService: ProfileService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
  }

  // Save profile handler
  onSaveProfile(profileData: ProfileUpdateData) {
    this.isLoading = true;
    this.profileService.updateProfile(profileData).subscribe({
      next: (response: ApiResponse<User>) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.toastService.success('Cập nhật thông tin thành công!');
          // Update current user in auth service
          this.authService.updateCurrentUser(response.data);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.toastService.error(error.error?.message || 'Cập nhật thất bại');
      },
    });
  }

  // Upload avatar handler
  onUploadAvatar(file: File) {
    this.isLoading = true;
    this.toastService.info('Đang upload avatar...');

    this.profileService.uploadAvatar(file).subscribe({
      next: (response: ApiResponse<{ avatar: string }>) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.toastService.success('Upload avatar thành công!');
          // Update current user avatar
          if (this.currentUser) {
            this.currentUser.avatar = response.data.avatar;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          }
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.toastService.error(
          error.error?.message || 'Upload avatar thất bại. Vui lòng kiểm tra cấu hình Cloudinary',
        );
      },
    });
  }
}
