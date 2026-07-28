import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../config/config.token';

export interface User {
  id: string;
  username: string;
  fullName: string;
  roleId: string | null;
  branchId: string | null;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private config = inject(APP_CONFIG);
  private apiUrl = `${this.config.apiUrl}/api/auth`;

  /** Signal to track login status reactively */
  isLoggedIn = signal<boolean>(this.checkToken());

  /** Signal to store current user details */
  currentUser = signal<User | null>(this.getUserFromStorage());

  constructor() {}

  login(credentials: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        sessionStorage.setItem('token', res.access_token);
        sessionStorage.setItem('user', JSON.stringify(res.user));
        this.isLoggedIn.set(true);
        this.currentUser.set(res.user);
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
     this.router.navigate(['/login']);
  }

  private checkToken(): boolean {
    return !!sessionStorage.getItem('token');
  }

  private getUserFromStorage(): User | null {
    const userJson = sessionStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }
}
