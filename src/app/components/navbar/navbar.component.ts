import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="navbar-wrapper" [class.scrolled]="isScrolled">
      <div class="container navbar-container">
        <!-- Brand -->
        <a routerLink="/" class="brand-link">
          <div class="brand-icon">
            <span class="ball-emoji">⚽</span>
            <div class="brand-glow"></div>
          </div>
          <div class="brand-text">
            <span class="brand-title">ملعب النجوم</span>
            <span class="brand-subtitle">نظام الحجز الإلكتروني</span>
          </div>
        </a>

        <!-- Desktop Navigation Links -->
        <nav class="nav-links" [class.open]="mobileMenuOpen">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item" (click)="closeMobileMenu()">
            <span class="nav-icon">🏠</span>
            <span>الرئيسية</span>
          </a>
          <a routerLink="/schedule" routerLinkActive="active" class="nav-item" (click)="closeMobileMenu()">
            <span class="nav-icon">📅</span>
            <span>جدول المواعيد</span>
          </a>

          <ng-container *ngIf="authService.isAuthenticated()">
            <a routerLink="/my-bookings" routerLinkActive="active" class="nav-item" (click)="closeMobileMenu()">
              <span class="nav-icon">📋</span>
              <span>حجوزاتي</span>
            </a>
          </ng-container>

          <ng-container *ngIf="authService.isAdmin()">
            <a routerLink="/admin" routerLinkActive="active" class="nav-item nav-admin-item" (click)="closeMobileMenu()">
              <span class="nav-icon">👑</span>
              <span>لوحة الإدارة</span>
              <span class="admin-badge">صاحب الملعب</span>
            </a>
          </ng-container>

          <!-- Mobile only: auth buttons -->
          <div class="mobile-auth-sep" *ngIf="!authService.isAuthenticated()">
            <a routerLink="/auth" [queryParams]="{mode: 'login'}" class="btn-secondary btn-sm mobile-auth-btn" (click)="closeMobileMenu()">تسجيل الدخول</a>
            <a routerLink="/auth" [queryParams]="{mode: 'register'}" class="btn-primary btn-sm mobile-auth-btn" (click)="closeMobileMenu()">حساب جديد</a>
          </div>
        </nav>

        <!-- Right: User Controls + Hamburger -->
        <div class="nav-right">
          <!-- User Controls (desktop) -->
          <div class="nav-auth">
            <ng-container *ngIf="authService.isAuthenticated(); else guestView">
              <div class="user-pill">
                <div class="user-avatar">{{ userInitials }}</div>
                <div class="user-meta">
                  <span class="user-name">{{ authService.currentUser()?.fullName }}</span>
                  <span class="user-role">{{ authService.isAdmin() ? '👑 صاحب الملعب' : '⚽ لاعب مسجل' }}</span>
                </div>
                <button (click)="onLogout()" class="btn-logout" title="تسجيل الخروج">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </button>
              </div>
            </ng-container>

            <ng-template #guestView>
              <div class="guest-buttons">
                <a routerLink="/auth" [queryParams]="{mode: 'login'}" class="btn-secondary btn-sm">تسجيل الدخول</a>
                <a routerLink="/auth" [queryParams]="{mode: 'register'}" class="btn-primary btn-sm">
                  <span>⚽ حساب جديد</span>
                </a>
              </div>
            </ng-template>
          </div>

          <!-- Hamburger (mobile) -->
          <button class="hamburger" (click)="toggleMobileMenu()" [class.open]="mobileMenuOpen" aria-label="قائمة التنقل">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      <!-- Mobile overlay -->
      <div class="mobile-overlay" *ngIf="mobileMenuOpen" (click)="closeMobileMenu()"></div>
    </header>
  `,
  styles: [`
    .navbar-wrapper {
      background: rgba(6, 11, 20, 0.88);
      backdrop-filter: blur(18px) saturate(1.5);
      -webkit-backdrop-filter: blur(18px) saturate(1.5);
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      position: sticky;
      top: 0;
      z-index: 200;
      transition: all 0.3s ease;
    }

    .navbar-wrapper.scrolled {
      background: rgba(6, 11, 20, 0.97);
      border-bottom-color: rgba(16, 185, 129, 0.15);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(16, 185, 129, 0.05);
    }

    .navbar-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 70px;
      gap: 12px;
    }

    /* === Brand === */
    .brand-link {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      flex-shrink: 0;
    }

    .brand-icon {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0.38));
      border: 1px solid rgba(16, 185, 129, 0.32);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .brand-icon:hover {
      border-color: rgba(16, 185, 129, 0.6);
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.35);
    }

    .ball-emoji {
      font-size: 1.5rem;
      display: block;
      transition: transform 0.4s ease;
    }

    .brand-link:hover .ball-emoji {
      transform: rotate(360deg);
    }

    .brand-glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(16,185,129,0.2), transparent 70%);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-size: 1.15rem;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.01em;
      line-height: 1.1;
    }

    .brand-subtitle {
      font-size: 0.72rem;
      color: #10b981;
      font-weight: 600;
      opacity: 0.85;
    }

    /* === Nav Links === */
    .nav-links {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 13px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #94a3b8;
      transition: all 0.2s ease;
      position: relative;
      white-space: nowrap;
    }

    .nav-icon {
      font-size: 1rem;
    }

    .nav-item:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.06);
    }

    .nav-item.active {
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
      font-weight: 700;
    }

    .nav-item.active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 50%;
      transform: translateX(-50%);
      width: 60%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #10b981, transparent);
      border-radius: 9999px;
    }

    .nav-admin-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .admin-badge {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(234, 88, 12, 0.18));
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      font-size: 0.68rem;
      padding: 2px 7px;
      border-radius: 9999px;
      font-weight: 700;
    }

    /* === Right side === */
    .nav-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .nav-auth {}

    .user-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.09);
      padding: 6px 10px 6px 12px;
      border-radius: 13px;
      transition: all 0.2s;
      cursor: default;
    }

    .user-pill:hover {
      border-color: rgba(16, 185, 129, 0.25);
      background: rgba(16, 185, 129, 0.06);
    }

    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      font-weight: 800;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.35);
      flex-shrink: 0;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      text-align: right;
    }

    .user-name {
      font-size: 0.87rem;
      font-weight: 700;
      color: #ffffff;
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    .user-role {
      font-size: 0.68rem;
      color: #94a3b8;
    }

    .btn-logout {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 5px;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .btn-logout:hover {
      color: #f87171;
      background: rgba(239, 68, 68, 0.13);
    }

    .guest-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* === Hamburger === */
    .hamburger {
      display: none;
      flex-direction: column;
      justify-content: space-between;
      width: 28px;
      height: 20px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      gap: 0;
    }

    .hamburger span {
      display: block;
      height: 2px;
      background: #94a3b8;
      border-radius: 2px;
      transition: all 0.3s ease;
      transform-origin: center;
    }

    .hamburger.open span:nth-child(1) { transform: translateY(9px) rotate(45deg); }
    .hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
    .hamburger.open span:nth-child(3) { transform: translateY(-9px) rotate(-45deg); }

    /* === Mobile overlay === */
    .mobile-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 99;
    }

    /* === Mobile Auth === */
    .mobile-auth-sep, .mobile-auth-btn { display: none; }

    /* === RESPONSIVE === */
    @media (max-width: 900px) {
      .hamburger { display: flex; }

      .nav-links {
        position: fixed;
        top: 70px;
        right: 0;
        width: 280px;
        height: calc(100vh - 70px);
        background: rgba(8, 13, 24, 0.97);
        backdrop-filter: blur(20px);
        border-left: 1px solid rgba(255, 255, 255, 0.08);
        flex-direction: column;
        align-items: stretch;
        padding: 20px 16px;
        gap: 6px;
        transform: translateX(100%);
        transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 100;
        overflow-y: auto;
      }

      .nav-links.open {
        transform: translateX(0);
        box-shadow: -8px 0 32px rgba(0,0,0,0.5);
      }

      .mobile-overlay { display: block; }

      .nav-item {
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 1rem;
      }

      .nav-item.active::after { display: none; }

      .mobile-auth-sep {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255,255,255,0.08);
      }

      .mobile-auth-btn {
        display: flex;
        justify-content: center;
        width: 100%;
        font-size: 0.95rem;
      }

      .guest-buttons { display: none; }
    }

    @media (max-width: 500px) {
      .brand-subtitle { display: none; }
      .user-meta { display: none; }
    }
  `]
})
export class NavbarComponent {
  public authService = inject(AuthService);
  isScrolled = false;
  mobileMenuOpen = false;

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  get userInitials(): string {
    const name = this.authService.currentUser()?.fullName || 'م';
    return name.trim().slice(0, 1);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    document.body.style.overflow = this.mobileMenuOpen ? 'hidden' : '';
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  onLogout(): void {
    this.closeMobileMenu();
    this.authService.logout();
  }
}
