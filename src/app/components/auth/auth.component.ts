import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <div class="container auth-container">
        <div class="auth-wrapper">

          <!-- Right: Visual / Benefits Card (Desktop) -->
          <div class="auth-showcase-card glass-panel">
            <div class="showcase-img-wrap">
              <img src="/stadium-hero.jpg" alt="ملعب النجوم" class="showcase-img" />
              <div class="showcase-gradient"></div>
              <div class="showcase-badge">
                <span class="live-dot"></span>
                <span>نظام الحجز الذكي المباشر ⚡</span>
              </div>
            </div>

            <div class="showcase-info">
              <h2>انضم إلى لاعبي <span class="text-green">ملعب النجوم</span></h2>
              <p>احجز ساعتك المفضلة وتابع مواعيد مبارياتك مع أصدقائك في القرية بكل سهولة وشفافية.</p>

              <div class="benefits-list">
                <div class="benefit-item">
                  <div class="benefit-icon">⚽</div>
                  <div>
                    <strong>حجز فوري ومباشر</strong>
                    <p>المواعيد المحجوزة تقفل في الحال لمنع أي تضارب أو ازدواجية.</p>
                  </div>
                </div>

                <div class="benefit-item">
                  <div class="benefit-icon">🔄</div>
                  <div>
                    <strong>تثبيت المواعيد الأسبوعية</strong>
                    <p>إمكانية طلب تثبيت موعد أسبوعي ثابت لفريقك طوال الشهر.</p>
                  </div>
                </div>

                <div class="benefit-item">
                  <div class="benefit-icon">💡</div>
                  <div>
                    <strong>إضاءة ليلية ونجيل معتمد</strong>
                    <p>أفضل ملعب بالقرية مجهز بكشافات ليد عالية ومرافق متكاملة.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Left: Auth Form Card -->
          <div class="auth-card glass-panel">
            <!-- Toggle Tabs -->
            <div class="auth-tabs">
              <button 
                type="button" 
                class="tab-btn" 
                [class.active]="isLoginMode" 
                (click)="setMode(true)">
                <span class="tab-icon">🔑</span>
                <span>تسجيل الدخول</span>
              </button>
              <button 
                type="button" 
                class="tab-btn" 
                [class.active]="!isLoginMode" 
                (click)="setMode(false)">
                <span class="tab-icon">⚽</span>
                <span>تسجيل لاعب جديد</span>
              </button>
            </div>

            <!-- Alert messages -->
            <div *ngIf="errorMessage" class="alert-box alert-error">
              <span class="alert-icon">⚠️</span>
              <span>{{ errorMessage }}</span>
            </div>

            <div *ngIf="successMessage" class="alert-box alert-success">
              <span class="alert-icon">✅</span>
              <span>{{ successMessage }}</span>
            </div>

            <!-- Registration Success Pending Confirmation Banner -->
            <div *ngIf="registeredPending" class="pending-activation-card">
              <div class="pending-icon">⏳</div>
              <h3>تم تسجيل حسابك بنجاح!</h3>
              <p>
                وفقاً للائحة الملعب، يظل حسابك <strong>غير نشط</strong> حتى يتم مراجعته وتأكيده من قبل <strong>صاحب الملعب</strong> لضمان جدية المواعيد.
              </p>
              <div class="pending-fields">
                <div>👤 <strong>الاسم:</strong> {{ registerData.fullName }}</div>
                <div>📱 <strong>الهاتف:</strong> {{ registerData.phoneNumber }}</div>
                <div>📍 <strong>العنوان:</strong> {{ registerData.address }}</div>
              </div>
              <p class="pending-note">
                سيقوم صاحب الملعب بتفعيل حسابك قريباً لتتمكن من حجز الحصص مباشرة.
              </p>
              <button type="button" class="btn-primary btn-block" (click)="setMode(true)">
                الذهاب لتسجيل الدخول 🔑
              </button>
            </div>

            <!-- LOGIN FORM -->
            <form *ngIf="isLoginMode && !registeredPending" (ngSubmit)="onLogin()" class="auth-form">
              <div class="form-header">
                <h2>مرحباً بك مجدداً 🏟️</h2>
                <p>سجل دخولك للاطلاع على جدول الحصص وحجز المواعيد</p>
              </div>

              <div class="form-group">
                <label class="form-label">اسم المستخدم أو البريد الإلكتروني</label>
                <div class="input-wrap">
                  <span class="input-icon">👤</span>
                  <input 
                    type="text" 
                    class="form-input with-icon" 
                    [(ngModel)]="loginData.usernameOrEmail" 
                    name="usernameOrEmail" 
                    required 
                    placeholder="أدخل اسم المستخدم أو الإيميل" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">كلمة المرور</label>
                <div class="input-wrap">
                  <span class="input-icon">🔒</span>
                  <input 
                    type="password" 
                    class="form-input with-icon" 
                    [(ngModel)]="loginData.password" 
                    name="password" 
                    required 
                    placeholder="••••••••" />
                </div>
              </div>

              <button type="submit" class="btn-primary btn-block" [disabled]="loading">
                <span *ngIf="loading">جاري تسجيل الدخول... ⏳</span>
                <span *ngIf="!loading">تسجيل الدخول الآن 🚀</span>
              </button>

              <!-- Quick Admin Login Demo Button -->
              <div class="quick-admin-demo">
                <span>هل أنت صاحب الملعب للتجربة؟</span>
                <button type="button" class="btn-demo" (click)="fillAdminCredentials()">
                  👑 تعبئة بيانات صاحب الملعب (Admin)
                </button>
              </div>
            </form>

            <!-- REGISTER FORM -->
            <form *ngIf="!isLoginMode && !registeredPending" (ngSubmit)="onRegister()" class="auth-form">
              <div class="form-header">
                <h2>تسجيل عضوية لاعب جديدة ⚽</h2>
                <p>أدخل بياناتك بالقرية ليتم اعتماد حسابك من قبل صاحب الملعب</p>
              </div>

              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">الاسم الكامل *</label>
                  <input 
                    type="text" 
                    class="form-input" 
                    [(ngModel)]="registerData.fullName" 
                    name="fullName" 
                    required 
                    placeholder="محمد أحمد إبراهيم" />
                </div>

                <div class="form-group">
                  <label class="form-label">اسم المستخدم *</label>
                  <input 
                    type="text" 
                    class="form-input" 
                    [(ngModel)]="registerData.username" 
                    name="username" 
                    required 
                    placeholder="mohamed_ahmed" />
                </div>
              </div>

              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">البريد الإلكتروني *</label>
                  <input 
                    type="email" 
                    class="form-input" 
                    [(ngModel)]="registerData.email" 
                    name="email" 
                    required 
                    placeholder="mohamed@example.com" />
                </div>

                <div class="form-group">
                  <label class="form-label">رقم الهاتف *</label>
                  <input 
                    type="tel" 
                    class="form-input" 
                    [(ngModel)]="registerData.phoneNumber" 
                    name="phoneNumber" 
                    required 
                    placeholder="01012345678" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">العنوان (بالقرية / الشارع) *</label>
                <input 
                  type="text" 
                  class="form-input" 
                  [(ngModel)]="registerData.address" 
                  name="address" 
                  required 
                  placeholder="القرية - الحارة القبلية بجوار مدرسة القرية" />
              </div>

              <div class="form-group">
                <label class="form-label">كلمة المرور *</label>
                <input 
                  type="password" 
                  class="form-input" 
                  [(ngModel)]="registerData.password" 
                  name="password" 
                  required 
                  placeholder="6 أحرف على الأقل" />
              </div>

              <div class="notice-callout">
                <span class="notice-icon">ℹ️</span>
                <p>
                  <strong>ملاحظة هامة:</strong> بمجرد التسجيل يظل الحساب بانتظار موافقة صاحب الملعب لتأكيد رقم الهاتف والاسم.
                </p>
              </div>

              <button type="submit" class="btn-primary btn-block" [disabled]="loading">
                <span *ngIf="loading">جاري إرسال البيانات... ⏳</span>
                <span *ngIf="!loading">إنشاء الحساب وإرساله للتأكيد 📋</span>
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      padding: 50px 0 70px;
      min-height: calc(100vh - 74px);
      display: flex;
      align-items: center;
    }

    .auth-container {
      width: 100%;
    }

    .auth-wrapper {
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      gap: 32px;
      align-items: stretch;
      max-width: 1100px;
      margin: 0 auto;
    }

    /* === SHOWCASE CARD === */
    .auth-showcase-card {
      border-radius: 24px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border: 1px solid rgba(16, 185, 129, 0.22);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.5);
    }

    .showcase-img-wrap {
      position: relative;
      height: 220px;
      overflow: hidden;
    }

    .showcase-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.6s ease;
    }

    .auth-showcase-card:hover .showcase-img {
      transform: scale(1.05);
    }

    .showcase-gradient {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(6, 11, 20, 0.2) 0%, rgba(14, 20, 36, 0.95) 100%);
    }

    .showcase-badge {
      position: absolute;
      top: 16px;
      right: 16px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(6, 11, 20, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 9999px;
    }

    .live-dot {
      width: 6px;
      height: 6px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 6px #10b981;
    }

    .showcase-info {
      padding: 24px 28px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .showcase-info h2 {
      font-size: 1.55rem;
      font-weight: 900;
      margin-bottom: 8px;
      color: #ffffff;
    }

    .text-green {
      color: #34d399;
    }

    .showcase-info > p {
      color: #94a3b8;
      font-size: 0.92rem;
      line-height: 1.6;
      margin-bottom: 24px;
    }

    .benefits-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: auto;
    }

    .benefit-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 12px 16px;
      border-radius: 14px;
      transition: all 0.2s;
    }

    .benefit-item:hover {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.25);
    }

    .benefit-icon {
      font-size: 1.4rem;
      flex-shrink: 0;
    }

    .benefit-item strong {
      display: block;
      color: #ffffff;
      font-size: 0.92rem;
      margin-bottom: 2px;
    }

    .benefit-item p {
      color: #94a3b8;
      font-size: 0.82rem;
      margin: 0;
      line-height: 1.45;
    }

    /* === AUTH CARD === */
    .auth-card {
      padding: 34px;
      border-radius: 24px;
      background: rgba(14, 20, 36, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
    }

    .auth-tabs {
      display: flex;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 14px;
      padding: 5px;
      margin-bottom: 26px;
      gap: 6px;
    }

    .tab-btn {
      flex: 1;
      padding: 11px 16px;
      background: none;
      border: none;
      color: #94a3b8;
      font-weight: 700;
      font-size: 0.92rem;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.25s ease;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .tab-btn.active {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0.15));
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    }

    .form-header {
      margin-bottom: 22px;
      text-align: right;
    }

    .form-header h2 {
      font-size: 1.5rem;
      font-weight: 900;
      margin-bottom: 6px;
    }

    .form-header p {
      color: #94a3b8;
      font-size: 0.88rem;
    }

    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      right: 14px;
      font-size: 1.1rem;
      pointer-events: none;
      color: #64748b;
    }

    .form-input.with-icon {
      padding-right: 42px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .btn-block {
      width: 100%;
      padding: 14px;
      font-size: 1rem;
      margin-top: 14px;
      font-weight: 800;
    }

    .notice-callout {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 18px;
    }

    .notice-callout .notice-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .notice-callout p {
      color: #cbd5e1;
      font-size: 0.82rem;
      margin: 0;
      line-height: 1.5;
    }

    .pending-activation-card {
      text-align: center;
      padding: 24px 16px;
    }

    .pending-icon {
      font-size: 3rem;
      margin-bottom: 12px;
    }

    .pending-activation-card h3 {
      font-size: 1.4rem;
      font-weight: 900;
      color: #34d399;
      margin-bottom: 10px;
    }

    .pending-activation-card p {
      color: #cbd5e1;
      font-size: 0.92rem;
      line-height: 1.6;
      margin-bottom: 18px;
    }

    .pending-fields {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      padding: 14px;
      text-align: right;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.88rem;
      margin-bottom: 16px;
    }

    .pending-note {
      color: #fbbf24 !important;
      font-size: 0.85rem !important;
    }

    .quick-admin-demo {
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .quick-admin-demo span {
      font-size: 0.82rem;
      color: #64748b;
    }

    .btn-demo {
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      font-weight: 700;
      font-size: 0.82rem;
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }

    .btn-demo:hover {
      background: rgba(245, 158, 11, 0.22);
      transform: translateY(-1px);
    }

    /* === RESPONSIVE === */
    @media (max-width: 900px) {
      .auth-wrapper {
        grid-template-columns: 1fr;
      }
      .auth-showcase-card {
        display: none;
      }
      .auth-card {
        max-width: 580px;
        margin: 0 auto;
        padding: 24px;
      }
    }

    @media (max-width: 480px) {
      .grid-2 {
        grid-template-columns: 1fr;
      }
      .quick-admin-demo {
        flex-direction: column;
        align-items: stretch;
      }
      .btn-demo {
        width: 100%;
        text-align: center;
      }
    }
  `]
})
export class AuthComponent implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoginMode = true;
  loading = false;
  errorMessage = '';
  successMessage = '';
  registeredPending = false;

  loginData = {
    usernameOrEmail: '',
    password: ''
  };

  registerData = {
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    address: '',
    password: ''
  };

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/schedule']);
      return;
    }

    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'register') {
        this.isLoginMode = false;
      } else {
        this.isLoginMode = true;
      }
    });
  }

  setMode(isLogin: boolean): void {
    this.isLoginMode = isLogin;
    this.errorMessage = '';
    this.successMessage = '';
    this.registeredPending = false;
  }

  onLogin(): void {
    if (!this.loginData.usernameOrEmail || !this.loginData.password) {
      this.errorMessage = 'يرجى إدخال اسم المستخدم وكلمة المرور';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.login(this.loginData).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.user.role === 'Admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/schedule']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'فشل تسجيل الدخول. يرجى التحقق من البيانات أو الانتظار حتى يتم تفعيل حسابك.';
      }
    });
  }

  onRegister(): void {
    if (!this.registerData.fullName || !this.registerData.username || !this.registerData.email || !this.registerData.phoneNumber || !this.registerData.address || !this.registerData.password) {
      this.errorMessage = 'يرجى إدخال جميع الحقول المطلوبة';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.register(this.registerData).subscribe({
      next: () => {
        this.loading = false;
        this.registeredPending = true;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'فشل تسجيل الحساب، قد يكون اسم المستخدم أو الإيميل مستخدماً بالفعل.';
      }
    });
  }

  fillAdminCredentials(): void {
    this.loginData.usernameOrEmail = 'admin';
    this.loginData.password = 'Admin@123456';
  }
}
