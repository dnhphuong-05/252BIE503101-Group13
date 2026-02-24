import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { User } from '../../../../../services/auth.service';
import { ProfileUpdateData } from '../../../../../services/user.service';

@Component({
  selector: 'app-basic-info-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './basic-info-form.html',
  styleUrl: './basic-info-form.css',
})
export class BasicInfoFormComponent implements OnInit {
  @Input() currentUser: User | null = null;
  @Output() saveProfile = new EventEmitter<ProfileUpdateData>();
  @Output() uploadAvatar = new EventEmitter<File>();

  profileForm!: FormGroup;
  isEditing = false;
  selectedAvatar: File | null = null;
  avatarPreview: string | null = null;

  constructor(private formBuilder: FormBuilder) {}

  ngOnInit() {
    this.initializeForm();
  }

  ngOnChanges() {
    if (this.currentUser && this.profileForm) {
      this.profileForm.patchValue({
        fullName: this.currentUser.fullName || '',
        email: this.currentUser.email || '',
        phone: this.currentUser.phone || '',
        gender: this.currentUser.gender ?? this.currentUser.profile?.gender ?? '',
        birthday: this.currentUser.birthday ?? this.currentUser.profile?.birthday ?? '',
        height: this.currentUser.height ?? this.currentUser.profile?.height ?? '',
        weight: this.currentUser.weight ?? this.currentUser.profile?.weight ?? '',
      });
    }
  }

  initializeForm() {
    this.profileForm = this.formBuilder.group({
      fullName: [this.currentUser?.fullName || '', [Validators.required, Validators.minLength(2)]],
      email: [{ value: this.currentUser?.email || '', disabled: true }],
      phone: [{ value: this.currentUser?.phone || '', disabled: true }],
      gender: [this.currentUser?.gender ?? this.currentUser?.profile?.gender ?? ''],
      birthday: [this.currentUser?.birthday ?? this.currentUser?.profile?.birthday ?? ''],
      height: [this.currentUser?.height ?? this.currentUser?.profile?.height ?? ''],
      weight: [this.currentUser?.weight ?? this.currentUser?.profile?.weight ?? ''],
    });
  }

  getUserAvatar(): string {
    if (this.avatarPreview) {
      return this.avatarPreview;
    }
    if (this.currentUser?.avatar || this.currentUser?.profile?.avatar) {
      return this.currentUser.avatar || this.currentUser.profile?.avatar || '';
    }
    const firstLetter = this.currentUser?.fullName?.charAt(0).toUpperCase() || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=8B2635&color=fff&size=200`;
  }

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedAvatar = file;

      // Preview
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          this.avatarPreview = result;
        }
      };
      reader.readAsDataURL(file);

      // Emit upload event
      this.uploadAvatar.emit(file);
    }
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      // Reset form if canceling
      this.profileForm.patchValue({
        fullName: this.currentUser?.fullName || '',
        phone: this.currentUser?.phone || '',
        gender: this.currentUser?.gender ?? this.currentUser?.profile?.gender ?? '',
        birthday: this.currentUser?.birthday ?? this.currentUser?.profile?.birthday ?? '',
        height: this.currentUser?.height ?? this.currentUser?.profile?.height ?? '',
        weight: this.currentUser?.weight ?? this.currentUser?.profile?.weight ?? '',
      });
    }
  }

  onSubmit() {
    if (this.profileForm.valid) {
      const formData: ProfileUpdateData = {
        fullName: this.profileForm.value.fullName,
        gender: this.profileForm.value.gender || null,
        birthday: this.profileForm.value.birthday || null,
        height: this.profileForm.value.height || null,
        weight: this.profileForm.value.weight || null,
      };
      this.saveProfile.emit(formData);
      this.isEditing = false;
    }
  }

  formatGender(value?: string | null): string {
    if (!value) return 'Chưa cập nhật';
    const normalized = value.toLowerCase();
    if (normalized === 'male' || normalized === 'nam') return 'Nam';
    if (normalized === 'female' || normalized === 'nu' || normalized === 'nữ') return 'Nữ';
    return 'Khác';
  }

  formatBirthday(value?: string | null): string {
    if (!value) return 'Chưa cập nhật';
    try {
      const date = new Date(value);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}/${date.getFullYear()}`;
    } catch {
      return value;
    }
  }

  formatNumber(value?: number | string | null, unit?: string): string {
    if (value === null || value === undefined || value === '') return 'Chưa cập nhật';
    return unit ? `${value} ${unit}` : `${value}`;
  }
}
