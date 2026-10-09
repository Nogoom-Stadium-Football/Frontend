import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly tokenKey = 'pitch_auth_token';
  private readonly userKey = 'pitch_auth_user';

  private readonly tokenSignal = signal<string | null>(this.getStoredToken());
  private readonly currentUserSignal = signal<UserProfile | null>(this.getStoredUser());

  public readonly token = this.tokenSignal.asReadonly();
  public readonly currentUser = this.currentUserSignal.asReadonly();
  public readonly isAuthenticated = computed(() => !!this.tokenSignal() && !!this.currentUserSignal());
  public readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'Admin');

  constructor(private http: HttpClient) {}

  register(data: RegisterRequest): Observable<{ message: string; userId: number; isActive: boolean }> {
    return this.http.post<{ message: string; userId: number; isActive: boolean }>(`${this.apiUrl}/register`, data);
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((res) => {
        this.setSession(res.token, res.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
  }

  refreshProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        this.currentUserSignal.set(user);
        localStorage.setItem(this.userKey, JSON.stringify(user));
      })
    );
  }

  private setSession(token: string, user: UserProfile): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.tokenSignal.set(token);
    this.currentUserSignal.set(user);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private getStoredUser(): UserProfile | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  }
}
