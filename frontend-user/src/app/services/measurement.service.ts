import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Measurements } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class MeasurementService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getMeasurements(): Observable<ApiResponse<Measurements>> {
    return this.http.get<ApiResponse<Measurements>>(`${this.apiUrl}/me/measurements`);
  }

  updateMeasurements(measurements: Measurements): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/me/measurements`, measurements);
  }
}
