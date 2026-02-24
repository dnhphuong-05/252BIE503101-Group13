import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      _id: string;
      customerId?: string;
      email: string;
      fullName: string;
      phone?: string | null;
      provider?: string;
      role: string;
      avatar?: string;
      gender?: string | null;
      birthday?: string | null;
      height?: number | null;
      weight?: number | null;
      loyalty?: {
        total_points?: number;
      } | null;
      profile?: {
        full_name?: string;
        avatar?: string;
        gender?: string | null;
        birthday?: string | null;
        height?: number | null;
        weight?: number | null;
      } | null;
    };
  };
}

export interface User {
  _id: string;
  customerId?: string;
  email: string;
  fullName: string;
  phone?: string | null;
  provider?: string;
  role: string;
  avatar?: string;
  gender?: string | null;
  birthday?: string | null;
  height?: number | null;
  weight?: number | null;
  loyalty?: {
    total_points?: number;
  } | null;
  profile?: {
    full_name?: string;
    avatar?: string;
    gender?: string | null;
    birthday?: string | null;
    height?: number | null;
    weight?: number | null;
  } | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  public currentUser$: Observable<User | null>; // Alias for consistency

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null,
    );
    this.currentUser = this.currentUserSubject.asObservable();
    this.currentUser$ = this.currentUser; // Expose as currentUser$
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // Đăng nhập
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, {
        phone: credentials.phone,
        password: credentials.password,
      })
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            // Lưu token
            localStorage.setItem('token', response.data.token);
            // Lưu thông tin user
            localStorage.setItem('currentUser', JSON.stringify(response.data.user));
            this.currentUserSubject.next(response.data.user);
          }
        }),
      );
  }

  // Đăng ký
  register(data: RegisterRequest): Observable<AuthResponse> {
    // KHÔNG tự động login sau khi register
    // User phải đăng nhập lại bằng phone + password
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data);
  }

  // Đăng nhập Google
  googleLogin(googleToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/google`, { token: googleToken }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('currentUser', JSON.stringify(response.data.user));
          this.currentUserSubject.next(response.data.user);
        }
      }),
    );
  }

  // Đăng xuất
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // Kiểm tra đã đăng nhập chưa
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Lấy token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Lấy thông tin user hiện tại
  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/me`);
  }

  // Update current user data (for profile updates)
  updateCurrentUser(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }
}
