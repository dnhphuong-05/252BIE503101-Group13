import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';
import { Measurements } from '../../../services/user.service';
import { MeasurementService } from '../../../services/measurement.service';

@Component({
  selector: 'app-profile-measurements',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-measurements.html',
  styleUrl: './profile-measurements.css',
})
export class ProfileMeasurementsComponent implements OnInit {
  measurementsForm: FormGroup;
  isSaving = false;
  lastMeasuredAt: string | null = null;

  constructor(
    private fb: FormBuilder,
    private measurementService: MeasurementService,
    private toastService: ToastService,
  ) {
    this.measurementsForm = this.fb.group({
      neck: [''],
      shoulder: [''],
      chest: [''],
      waist: [''],
      hip: [''],
      sleeve: [''],
      arm: [''],
      back_length: [''],
      leg_length: [''],
    });
  }

  ngOnInit() {
    this.loadMeasurements();
  }

  saveMeasurements() {
    this.isSaving = true;
    const payload = this.measurementsForm.value as Measurements;
    this.measurementService.updateMeasurements(payload).subscribe({
      next: () => {
        this.toastService.success('Cập nhật số đo thành công');
        this.isSaving = false;
        this.loadMeasurements();
      },
      error: () => {
        this.toastService.error('Cập nhật số đo thất bại');
        this.isSaving = false;
      },
    });
  }

  private formatDate(value: string | Date): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${date.getFullYear()}`;
  }

  private loadMeasurements() {
    this.measurementService.getMeasurements().subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          const data = response.data;
          this.measurementsForm.patchValue({
            neck: data.neck ?? '',
            shoulder: data.shoulder ?? '',
            chest: data.chest ?? '',
            waist: data.waist ?? '',
            hip: data.hip ?? '',
            sleeve: data.sleeve ?? '',
            arm: data.arm ?? '',
            back_length: data.back_length ?? '',
            leg_length: data.leg_length ?? '',
          });
          const measuredAt = data.measured_at || data.updatedAt;
          if (measuredAt) {
            this.lastMeasuredAt = this.formatDate(measuredAt);
          }
        }
      },
      error: () => {
        this.toastService.error('Không thể tải số đo hiện tại');
      },
    });
  }
}
