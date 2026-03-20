import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import {
  AuthState,
  LoginRequest,
  LoginResponse,
  User,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ApiResponse,
} from '../../models';
import { TokenService } from './token.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly PROFILE_URL = `${environment.apiUrl}/me/profile`;

  // Signal-based state
  private readonly authStateSignal = signal<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
  });

  // Computed signals
  public readonly currentUser = computed(() => this.authStateSignal().user);
  public readonly isAuthenticated = computed(() => this.authStateSignal().isAuthenticated);
  public readonly isLoading = computed(() => this.authStateSignal().isLoading);

  constructor(
    private readonly http: HttpClient,
    private readonly tokenService: TokenService,
    private readonly router: Router,
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const accessToken = this.tokenService.getAccessToken();
    const refreshToken = this.tokenService.getRefreshToken();
    const user = this.tokenService.getUser();

    if (accessToken && refreshToken && user) {
      this.authStateSignal.set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
      this.refreshProfile();
    }
  }

  private refreshProfile(): void {
    this.http.get<ApiResponse<User>>(this.PROFILE_URL).subscribe({
      next: (response) => {
        if (response?.success && response.data) {
          const normalizedUser = this.normalizeUser(response.data);
          if (normalizedUser) {
            this.tokenService.setUser(normalizedUser);
            this.authStateSignal.update((state) => ({
              ...state,
              user: normalizedUser,
            }));
          }
        }
      },
      error: () => {
        // Ignore profile refresh errors to avoid breaking existing session
      },
    });
  }

  refreshCurrentUser(): void {
    if (!this.isAuthenticated()) return;
    this.refreshProfile();
  }

  login(credentials: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    this.authStateSignal.update((state) => ({ ...state, isLoading: true }));

    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_URL}/login`, credentials).pipe(
      tap((response) => {
        if (response.success && response.data) {
          const accessToken = response.data.accessToken ?? response.data.token;
          const refreshToken = response.data.refreshToken;
          const user = this.normalizeUser(response.data.user);

          if (accessToken && refreshToken && user) {
            this.setAuthData(user, accessToken, refreshToken);
          }
        }
        this.authStateSignal.update((state) => ({ ...state, isLoading: false }));
      }),
    );
  }

  refreshToken(): Observable<ApiResponse<RefreshTokenResponse>> {
    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const request: RefreshTokenRequest = { refreshToken };
    return this.http
      .post<ApiResponse<RefreshTokenResponse>>(`${this.API_URL}/refresh-token`, request)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            const accessToken = response.data.accessToken ?? response.data.token;
            const newRefreshToken = response.data.refreshToken;

            if (accessToken) {
              this.tokenService.setAccessToken(accessToken);
            }
            if (newRefreshToken) {
              this.tokenService.setRefreshToken(newRefreshToken);
            }

            this.authStateSignal.update((state) => ({
              ...state,
              accessToken: accessToken ?? state.accessToken,
              refreshToken: newRefreshToken ?? state.refreshToken,
            }));
          }
        }),
      );
  }

  logout(): void {
    this.tokenService.clearTokens();
    this.authStateSignal.set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    this.router.navigate(['/auth/login']);
  }

  private setAuthData(user: User, accessToken: string, refreshToken: string): void {
    this.tokenService.setAccessToken(accessToken);
    this.tokenService.setRefreshToken(refreshToken);
    this.tokenService.setUser(user);

    this.authStateSignal.set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  }

  private normalizeUser(user: User | null): User | null {
    if (!user) return null;

    return {
      ...user,
      name:
        user.name ||
        (user as unknown as { fullName?: string }).fullName ||
        (user as unknown as { profile?: { full_name?: string } }).profile?.full_name ||
        '',
    };
  }
}
