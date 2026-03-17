import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';

export interface AdministrativeOption {
  code: string;
  name: string;
}

interface ProvinceApiItem {
  province_code?: string | number;
  code?: string | number;
  name?: string;
  province_name?: string;
  province_name_with_type?: string;
}

interface WardApiItem {
  ward_code?: string | number;
  code?: string | number;
  ward_name?: string;
  name?: string;
  ward_name_with_type?: string;
  province_code?: string | number;
}

type ProvinceApiResponse =
  | ProvinceApiItem[]
  | {
      data?: ProvinceApiItem[];
      provinces?: ProvinceApiItem[];
      items?: ProvinceApiItem[];
    };

type WardApiResponse =
  | WardApiItem[]
  | {
      data?: WardApiItem[];
      wards?: WardApiItem[];
      items?: WardApiItem[];
    };

type WardAssetResponse = Record<string, WardApiItem[]>;

@Injectable({
  providedIn: 'root',
})
export class VietnamAdministrativeService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'https://34tinhthanh.com';
  private readonly provincesAssetUrl = 'assets/data/vietnam-provinces-2025.json';
  private readonly wardsAssetUrl = 'assets/data/vietnam-wards-by-province-2025.json';
  private readonly wardsCache = new Map<string, Observable<AdministrativeOption[]>>();

  private readonly fallbackProvinces: AdministrativeOption[] = [
    { code: '91', name: 'An Giang' },
    { code: '24', name: 'Bắc Ninh' },
    { code: '04', name: 'Cao Bằng' },
    { code: '96', name: 'Cà Mau' },
    { code: '52', name: 'Gia Lai' },
    { code: '42', name: 'Hà Tĩnh' },
    { code: '33', name: 'Hưng Yên' },
    { code: '56', name: 'Khánh Hòa' },
    { code: '12', name: 'Lai Châu' },
    { code: '15', name: 'Lào Cai' },
    { code: '68', name: 'Lâm Đồng' },
    { code: '20', name: 'Lạng Sơn' },
    { code: '40', name: 'Nghệ An' },
    { code: '37', name: 'Ninh Bình' },
    { code: '25', name: 'Phú Thọ' },
    { code: '51', name: 'Quảng Ngãi' },
    { code: '22', name: 'Quảng Ninh' },
    { code: '44', name: 'Quảng Trị' },
    { code: '14', name: 'Sơn La' },
    { code: '38', name: 'Thanh Hóa' },
    { code: '92', name: 'Thành phố Cần Thơ' },
    { code: '46', name: 'Thành phố Huế' },
    { code: '01', name: 'Thành phố Hà Nội' },
    { code: '31', name: 'Thành phố Hải Phòng' },
    { code: '79', name: 'Thành phố Hồ Chí Minh' },
    { code: '48', name: 'Thành phố Đà Nẵng' },
    { code: '19', name: 'Thái Nguyên' },
    { code: '08', name: 'Tuyên Quang' },
    { code: '80', name: 'Tây Ninh' },
    { code: '86', name: 'Vĩnh Long' },
    { code: '11', name: 'Điện Biên' },
    { code: '66', name: 'Đắk Lắk' },
    { code: '75', name: 'Đồng Nai' },
    { code: '82', name: 'Đồng Tháp' },
  ];

  private readonly provincesRequest$ = this.http
    .get<ProvinceApiResponse>(`${this.baseUrl}/api/provinces`)
    .pipe(
      map((response) => this.normalizeProvinces(this.extractProvinceItems(response))),
      switchMap((provinces) =>
        provinces.length ? of(provinces) : this.loadProvincesFromAsset(),
      ),
      catchError(() => this.loadProvincesFromAsset()),
      shareReplay(1),
    );

  getProvinces(): Observable<AdministrativeOption[]> {
    return this.provincesRequest$;
  }

  getWardsByProvinceCode(provinceCode: string): Observable<AdministrativeOption[]> {
    const normalizedCode = provinceCode.trim();
    if (!normalizedCode) {
      return of([]);
    }

    const cachedRequest = this.wardsCache.get(normalizedCode);
    if (cachedRequest) {
      return cachedRequest;
    }

    const request = this.http
      .get<WardApiResponse>(`${this.baseUrl}/api/wards`, {
        params: new HttpParams().set('province_code', normalizedCode),
      })
      .pipe(
        map((response) => this.normalizeWards(this.extractWardItems(response))),
        switchMap((wards) => (wards.length ? of(wards) : this.loadWardsFromAsset(normalizedCode))),
        catchError(() => this.loadWardsFromAsset(normalizedCode)),
        shareReplay(1),
      );

    this.wardsCache.set(normalizedCode, request);
    return request;
  }

  private extractProvinceItems(response: ProvinceApiResponse): ProvinceApiItem[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.data || response.provinces || response.items || [];
  }

  private extractWardItems(response: WardApiResponse): WardApiItem[] {
    if (Array.isArray(response)) {
      return response;
    }

    return response.data || response.wards || response.items || [];
  }

  private loadProvincesFromAsset(): Observable<AdministrativeOption[]> {
    return this.http.get<ProvinceApiItem[]>(this.provincesAssetUrl).pipe(
      map((response) => this.normalizeProvinces(this.extractProvinceItems(response))),
      catchError(() => of(this.fallbackProvinces)),
    );
  }

  private loadWardsFromAsset(provinceCode: string): Observable<AdministrativeOption[]> {
    return this.http.get<WardAssetResponse>(this.wardsAssetUrl).pipe(
      map((response) => {
        const wards = Array.isArray(response?.[provinceCode]) ? response[provinceCode] : [];
        return this.normalizeWards(wards);
      }),
      catchError(() => of([])),
    );
  }

  private normalizeProvinces(items: ProvinceApiItem[]): AdministrativeOption[] {
    return items
      .map((item) => ({
        code: String(item.province_code ?? item.code ?? '').trim(),
        name: this.cleanName(item.name || item.province_name || item.province_name_with_type || ''),
      }))
      .filter((item) => item.code && item.name)
      .sort((left, right) => left.name.localeCompare(right.name, 'vi'));
  }

  private normalizeWards(items: WardApiItem[]): AdministrativeOption[] {
    return items
      .map((item) => ({
        code: String(item.ward_code ?? item.code ?? '').trim(),
        name: this.cleanName(item.ward_name || item.name || item.ward_name_with_type || ''),
      }))
      .filter((item) => item.code && item.name)
      .sort((left, right) => left.name.localeCompare(right.name, 'vi'));
  }

  private cleanName(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }
}
