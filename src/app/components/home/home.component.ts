import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { PitchService } from '../../services/pitch.service';
import { PitchSetting } from '../../models/pitch.models';
import { AuthService } from '../../services/auth.service';
import { RealtimeService } from '../../services/realtime.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="home-page">

      <!-- ===== HERO SECTION ===== -->
      <section class="hero-section">
        <!-- Decorative background mesh -->
        <div class="hero-bg">
          <div class="hero-orb hero-orb-1"></div>
          <div class="hero-orb hero-orb-2"></div>
          <div class="hero-orb hero-orb-3"></div>
          <div class="pitch-mesh-grid"></div>
        </div>

        <div class="container hero-container">
          <div class="hero-layout">
            <!-- Right / Main Content -->
            <div class="hero-text-col">
              <!-- Live badge -->
              <div class="hero-live-badge">
                <span class="pulse-dot"></span>
                <span>ملعب النجوم — نظام حجز ذكي ومباشر بالقرية</span>
              </div>

              <h1 class="hero-title">
                احجز موعد مباراتك <br>
                في <span class="grad-text">{{ settingsSignal()?.pitchName || 'ملعب النجوم' }}</span>
              </h1>

              <p class="hero-desc">
                {{ settingsSignal()?.description || 'أفضل أرضية نجيل صناعي معتمد ومجهزة بأقوى كشافات إضاءة ليلية لاستضافة أقوى المباريات والبطولات بين شباب القرية.' }}
              </p>

              <!-- Action buttons -->
              <div class="hero-actions">
                <a routerLink="/schedule" class="btn-hero-primary">
                  <span class="btn-icon">📅</span>
                  <span>استعراض جدول المواعيد</span>
                  <span class="btn-arrow">←</span>
                </a>

                <a *ngIf="!authService.isAuthenticated()" routerLink="/auth" [queryParams]="{mode: 'register'}" class="btn-hero-secondary">
                  <span>📝 سجّل الآن مجاناً</span>
                </a>

                <a *ngIf="authService.isAdmin()" routerLink="/admin" class="btn-hero-admin">
                  <span>👑 لوحة الإدارة</span>
                </a>
              </div>

              <!-- Quick features badges -->
              <div class="hero-features-chips">
                <span class="chip-item">⚡ تحديث فوري مباشر</span>
                <span class="chip-item">🔒 موافقة ومراجعة رسمية</span>
                <span class="chip-item">💡 إضاءة ليلية فائقة</span>
              </div>

              <!-- Notice banner from owner -->
              <div *ngIf="settingsSignal()?.notice" class="owner-notice">
                <div class="notice-icon">📢</div>
                <div class="notice-text">
                  <strong>إشعار من إدارة الملعب:</strong>
                  <p>{{ settingsSignal()?.notice }}</p>
                </div>
              </div>
            </div>

            <!-- Left / Stadium Visual Card -->
            <div class="hero-visual-col">
              <div class="stadium-card-wrapper glass-panel">
                <div class="stadium-img-box">
                  <img src="/stadium-hero.jpg" alt="ملعب النجوم ليلاً" class="stadium-img" />
                  <div class="img-gradient-overlay"></div>
                  
                  <div class="img-top-badges">
                    <span class="badge-live-light">
                      <span class="badge-dot"></span>
                      مضاء بالكامل 💡
                    </span>
                    <span class="badge-rate-pill">
                      {{ settingsSignal()?.hourlyRate || 130 }} ج.م / ساعة
                    </span>
                  </div>

                  <div class="img-bottom-caption">
                    <div class="caption-title">🏟️ ملعب النجوم الرئيسي</div>
                    <div class="caption-sub">نجيل صناعي هولندي 5 نجوم • كشافات LED بيضاء</div>
                  </div>
                </div>

                <div class="stadium-card-footer">
                  <div class="mini-stat">
                    <span class="stat-num">{{ formatHour(settingsSignal()?.openHour ?? 15) }} - {{ formatHour(settingsSignal()?.closeHour ?? 24) }}</span>
                    <span class="stat-lbl">ساعات العمل اليومية</span>
                  </div>
                  <div class="mini-stat-sep"></div>
                  <div class="mini-stat">
                    <span class="stat-num text-green">أسبقية فورية</span>
                    <span class="stat-lbl">نظام قبول الطلبات</span>
                  </div>
                  <div class="mini-stat-sep"></div>
                  <div class="mini-stat">
                    <a routerLink="/schedule" class="btn-mini-book">احجز الآن</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== QUICK STATS STRIP ===== -->
      <section class="stats-strip">
        <div class="container">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon-wrap green">💰</div>
              <div class="stat-info">
                <div class="stat-value">
                  {{ settingsSignal()?.hourlyRate || 130 }}
                  <small> ج.م</small>
                </div>
                <div class="stat-label">سعر الساعة الرسمية</div>
              </div>
            </div>

            <div class="stat-sep"></div>

            <div class="stat-card">
              <div class="stat-icon-wrap gold">⏰</div>
              <div class="stat-info">
                <div class="stat-value">
                  {{ formatHour(settingsSignal()?.openHour ?? 15) }}
                  <small> — </small>
                  {{ formatHour(settingsSignal()?.closeHour ?? 24) }}
                </div>
                <div class="stat-label">أوقات العمل المتاحة</div>
              </div>
            </div>

            <div class="stat-sep"></div>

            <div class="stat-card">
              <div class="stat-icon-wrap blue">🔄</div>
              <div class="stat-info">
                <div class="stat-value">أسبوعي وتثبيت</div>
                <div class="stat-label">خيارات الحجز الدائم</div>
              </div>
            </div>

            <div class="stat-sep"></div>

            <div class="stat-card">
              <div class="stat-icon-wrap purple">⚡</div>
              <div class="stat-info">
                <div class="stat-value">تأكيد بالأسبقية</div>
                <div class="stat-label">عدالة وشفافية كاملة</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== VISUAL GALLERY & ATMOSPHERE ===== -->
      <section class="gallery-section">
        <div class="container">
          <div class="section-header">
            <span class="section-tag">أجواء وتجهيزات الملعب</span>
            <h2>المواصفات القياسية لملعب النجوم</h2>
            <p>أرضية مصممة خصيصاً لمباريات الحماس والتحدي بدون إصابات</p>
          </div>

          <div class="gallery-grid">
            <!-- Showcase Card 1 -->
            <div class="showcase-card glass-panel">
              <div class="showcase-img-box">
                <img src="/stadium-hero.jpg" alt="الملعب تحت الأضواء الكاشفة" class="showcase-img" />
                <div class="showcase-overlay"></div>
                <span class="showcase-tag">💡 إضاءة احترافية</span>
              </div>
              <div class="showcase-body">
                <h3>إضاءة ليلية LED موزعة هندسياً</h3>
                <p>كشافات عالية السطوع تضمن رؤية ممتازة للكرة واللاعبين في جميع أرجاء الملعب بدون أي بقع مظلمة.</p>
                <div class="showcase-features">
                  <span>✓ 8 أعمدة كشافات</span>
                  <span>✓ رؤية واضحة للمسافات</span>
                  <span>✓ تصوير عالي الوضوح</span>
                </div>
              </div>
            </div>

            <!-- Showcase Card 2 -->
            <div class="showcase-card glass-panel">
              <div class="showcase-img-box">
                <img src="/ball-turf.jpg" alt="أرضية نجيل صناعي معتمد" class="showcase-img" />
                <div class="showcase-overlay"></div>
                <span class="showcase-tag">🌿 نجيل معتمد</span>
              </div>
              <div class="showcase-body">
                <h3>أرضية نجيل صناعي فائقة النعومة</h3>
                <p>مبطنة بطبقات رمل سيليكا ومطاط حبيبي متوازن لامتصاص الصدمات وحماية المفاصل وتقليل الاحتكاك.</p>
                <div class="showcase-features">
                  <span>✓ صيانة دورية وتنظيف</span>
                  <span>✓ مرونة ممتازة للكرة</span>
                  <span>✓ تخطيط أبيض دقيق</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== FACILITIES SECTION ===== -->
      <section class="facilities-section">
        <div class="container">
          <div class="section-header">
            <span class="section-tag">مرافق وخدمات</span>
            <h2>كل ما تحتاجه لمباراة مثالية</h2>
            <p>خدمات متكاملة داخل الملعب لراحة جميع الفرق الرياضية</p>
          </div>

          <div class="facilities-grid">
            <div class="facility-card glass-panel">
              <div class="facility-icon">💡</div>
              <h4>كشافات ليلية عالية القوة</h4>
              <p>رؤية مثالية في المباريات الليلية حتى منتصف الليل مع توزيع إضاءة متجانس في كل زاوية.</p>
            </div>

            <div class="facility-card glass-panel">
              <div class="facility-icon">🚿</div>
              <h4>غرف تبديل واستراحة</h4>
              <p>أماكن مخصصة للجلوس وتبديل الملابس مع دورات مياه نظيفة ومياه شرب باردة.</p>
            </div>

            <div class="facility-card glass-panel">
              <div class="facility-icon">⚽</div>
              <h4>كرات أصلية وصدريات</h4>
              <p>توفير كرات مقاس 5 قانونية جاهزة للعب مع صدريات فسفورية لتمييز الفريقين مجاناً.</p>
            </div>

            <div class="facility-card glass-panel">
              <div class="facility-icon">🥤</div>
              <h4>كافتيريا ومشروبات</h4>
              <p>مشروبات غازية، عصائر، مياه مثلجة، وسناكس متاحة طوال ساعات العمل بأسعار مناسبة.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== HOW IT WORKS ===== -->
      <section class="how-section">
        <div class="container">
          <div class="section-header">
            <span class="section-tag">خطوات سهلة</span>
            <h2>كيف يعمل نظام الحجز؟</h2>
            <p>أربع خطوات بسيطة تضمن العدالة والشفافية لجميع شباب القرية</p>
          </div>

          <div class="steps-timeline">
            <div class="step-item">
              <div class="step-left">
                <div class="step-num">١</div>
                <div class="step-line"></div>
              </div>
              <div class="step-body glass-panel">
                <div class="step-emoji">📝</div>
                <div>
                  <h3>سجّل حسابك في المنصة</h3>
                  <p>أدخل اسمك الكامل، رقم هاتفك، وعنوانك بالقرية. يراجع صاحب الملعب هويتك لضمان جدية الحجوزات.</p>
                </div>
              </div>
            </div>

            <div class="step-item">
              <div class="step-left">
                <div class="step-num">٢</div>
                <div class="step-line"></div>
              </div>
              <div class="step-body glass-panel">
                <div class="step-emoji">✅</div>
                <div>
                  <h3>تفعيل الحساب من صاحب الملعب</h3>
                  <p>بمجرد الموافقة على حسابك وتنشيطه، يصبح بإمكانك تصفح المواعيد المتاحة وتقديم طلبات الحجز بسهولة.</p>
                </div>
              </div>
            </div>

            <div class="step-item">
              <div class="step-left">
                <div class="step-num">٣</div>
                <div class="step-line"></div>
              </div>
              <div class="step-body glass-panel">
                <div class="step-emoji">📅</div>
                <div>
                  <h3>اختر اليوم والساعة والمدة</h3>
                  <p>حدد الساعة التي تناسبك وعدد الساعات المطلوبة (ساعة، ساعتان، أو ثلاث ساعات) سواء كان حجزاً أسبوعياً أو ثابتاً.</p>
                </div>
              </div>
            </div>

            <div class="step-item">
              <div class="step-left">
                <div class="step-num">٤</div>
              </div>
              <div class="step-body glass-panel">
                <div class="step-emoji">🎉</div>
                <div>
                  <h3>الموافقة الفورية وتأكيد الموعد</h3>
                  <p>يعتمد صاحب الملعب الطلب حسب أسبقية التقديم، ويتحول الموعد إلى محجوز رسمياً في الجدول أمام الجميع.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- CTA Box -->
          <div class="cta-box glass-panel">
            <div class="cta-text">
              <h3>جاهز لتنظيم مباراتك القادمة؟ 🏆</h3>
              <p>تصفح الساعات المتاحة اليوم واحجز دورك قبل اكتمال المواعيد</p>
            </div>
            <div class="cta-actions">
              <a routerLink="/schedule" class="btn-hero-primary">
                <span>📅 استعرض الجدول الآن</span>
                <span class="btn-arrow">←</span>
              </a>
              <a *ngIf="!authService.isAuthenticated()" routerLink="/auth" [queryParams]="{mode: 'register'}" class="btn-hero-secondary">
                <span>سجّل حساب جديد</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer wave -->
      <footer class="footer-wave">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="rgba(16,185,129,0.06)"></path>
          <path d="M0,55 C480,20 960,70 1440,55 L1440,80 L0,80 Z" fill="rgba(16,185,129,0.03)"></path>
        </svg>
        <div class="footer-content container">
          <div class="footer-brand">
            <span class="footer-logo">⚽ ملعب النجوم</span>
            <p>نظام إدارة وحجز ملاعب كرة القدم الإلكتروني المباشر</p>
          </div>
          <p class="footer-copy">© 2025 ملعب النجوم — جميع الحقوق محفوظة 🏟️</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .home-page {
      overflow-x: hidden;
      min-height: 100vh;
    }

    /* === HERO SECTION === */
    .hero-section {
      position: relative;
      padding: 60px 0 70px;
      overflow: hidden;
      min-height: 600px;
      display: flex;
      align-items: center;
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }

    .hero-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
    }

    .hero-orb-1 {
      width: 650px; height: 650px;
      top: -200px; right: -120px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.16) 0%, transparent 70%);
    }

    .hero-orb-2 {
      width: 450px; height: 450px;
      bottom: -100px; left: -100px;
      background: radial-gradient(circle, rgba(5, 150, 105, 0.12) 0%, transparent 70%);
    }

    .hero-orb-3 {
      width: 320px; height: 320px;
      top: 40%; left: 45%;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%);
    }

    .pitch-mesh-grid {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 50px 50px;
      opacity: 0.6;
    }

    .hero-container {
      position: relative;
      z-index: 2;
    }

    .hero-layout {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 40px;
      align-items: center;
    }

    .hero-text-col {
      text-align: right;
    }

    .hero-live-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.32);
      padding: 6px 18px;
      border-radius: 9999px;
      font-size: 0.88rem;
      color: #34d399;
      font-weight: 700;
      margin-bottom: 24px;
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.15);
      animation: slideDown 0.6s ease;
    }

    .pulse-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 1.8s infinite;
      flex-shrink: 0;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.45; transform: scale(1.35); }
    }

    @keyframes slideDown {
      from { transform: translateY(-16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .hero-title {
      font-size: 3.4rem;
      font-weight: 900;
      line-height: 1.25;
      margin-bottom: 20px;
      animation: slideDown 0.7s ease 0.1s both;
    }

    .grad-text {
      background: linear-gradient(135deg, #34d399 0%, #10b981 40%, #fbbf24 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-desc {
      font-size: 1.15rem;
      color: #94a3b8;
      line-height: 1.8;
      margin-bottom: 32px;
      max-width: 580px;
      animation: slideDown 0.8s ease 0.2s both;
    }

    .hero-actions {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      margin-bottom: 30px;
      animation: slideDown 0.9s ease 0.3s both;
    }

    .btn-hero-primary {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      font-weight: 800;
      font-size: 1.05rem;
      padding: 14px 30px;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 6px 24px rgba(16, 185, 129, 0.42);
      font-family: inherit;
      text-decoration: none;
      position: relative;
      overflow: hidden;
    }

    .btn-hero-primary::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.18), transparent);
      opacity: 0;
      transition: opacity 0.2s;
    }

    .btn-hero-primary:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 32px rgba(16, 185, 129, 0.55);
    }

    .btn-hero-primary:hover::before { opacity: 1; }

    .btn-arrow {
      display: inline-block;
      transition: transform 0.2s;
    }
    .btn-hero-primary:hover .btn-arrow { transform: translateX(-4px); }

    .btn-hero-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.06);
      color: #ffffff;
      font-weight: 700;
      font-size: 1rem;
      padding: 14px 26px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
    }

    .btn-hero-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.25);
      transform: translateY(-2px);
    }

    .btn-hero-admin {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(245, 158, 11, 0.12);
      color: #fbbf24;
      font-weight: 700;
      font-size: 1rem;
      padding: 14px 24px;
      border-radius: 14px;
      border: 1px solid rgba(245, 158, 11, 0.3);
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
    }

    .btn-hero-admin:hover {
      background: rgba(245, 158, 11, 0.2);
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.25);
      transform: translateY(-2px);
    }

    .hero-features-chips {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }

    .chip-item {
      display: inline-flex;
      align-items: center;
      font-size: 0.82rem;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 5px 12px;
      border-radius: 8px;
      font-weight: 600;
    }

    .owner-notice {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 16px 20px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.26);
      border-radius: 14px;
      text-align: right;
    }

    .notice-icon { font-size: 1.4rem; flex-shrink: 0; }
    .notice-text strong { display: block; color: #34d399; font-size: 0.92rem; margin-bottom: 3px; }
    .notice-text p { color: #cbd5e1; font-size: 0.88rem; margin: 0; line-height: 1.5; }

    /* === STADIUM VISUAL CARD === */
    .hero-visual-col {
      animation: slideDown 1s ease 0.3s both;
    }

    .stadium-card-wrapper {
      padding: 10px;
      border-radius: 24px;
      background: rgba(14, 20, 36, 0.85);
      border: 1px solid rgba(16, 185, 129, 0.25);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6), 0 0 30px rgba(16, 185, 129, 0.15);
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .stadium-card-wrapper:hover {
      transform: translateY(-6px) scale(1.01);
      border-color: rgba(16, 185, 129, 0.45);
      box-shadow: 0 28px 60px rgba(0, 0, 0, 0.7), 0 0 45px rgba(16, 185, 129, 0.25);
    }

    .stadium-img-box {
      position: relative;
      border-radius: 18px;
      overflow: hidden;
      aspect-ratio: 16 / 10;
    }

    .stadium-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.6s ease;
    }

    .stadium-card-wrapper:hover .stadium-img {
      transform: scale(1.05);
    }

    .img-gradient-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(6, 11, 20, 0.2) 0%, rgba(6, 11, 20, 0.85) 100%);
      pointer-events: none;
    }

    .img-top-badges {
      position: absolute;
      top: 14px;
      right: 14px;
      left: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 2;
    }

    .badge-live-light {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(6, 11, 20, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 9999px;
    }

    .badge-dot {
      width: 6px; height: 6px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 6px #10b981;
    }

    .badge-rate-pill {
      background: rgba(245, 158, 11, 0.9);
      color: #060b14;
      font-weight: 900;
      font-size: 0.82rem;
      padding: 5px 12px;
      border-radius: 9999px;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
    }

    .img-bottom-caption {
      position: absolute;
      bottom: 14px;
      right: 16px;
      left: 16px;
      z-index: 2;
      text-align: right;
    }

    .caption-title {
      font-size: 1.15rem;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: 2px;
    }

    .caption-sub {
      font-size: 0.82rem;
      color: #94a3b8;
    }

    .stadium-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 12px 6px;
      text-align: center;
    }

    .mini-stat {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .mini-stat-sep {
      width: 1px;
      height: 28px;
      background: rgba(255, 255, 255, 0.08);
    }

    .stat-num {
      font-size: 0.95rem;
      font-weight: 800;
      color: #ffffff;
    }

    .stat-lbl {
      font-size: 0.74rem;
      color: #64748b;
    }

    .btn-mini-book {
      display: inline-block;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      font-weight: 800;
      font-size: 0.82rem;
      padding: 8px 16px;
      border-radius: 10px;
      text-decoration: none;
      transition: all 0.2s;
    }

    .btn-mini-book:hover {
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
      transform: translateY(-2px);
    }

    /* === STATS STRIP === */
    .stats-strip {
      padding: 10px 0 20px;
    }

    .stats-grid {
      display: flex;
      align-items: stretch;
      background: rgba(14, 20, 36, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 20px;
      overflow: hidden;
      backdrop-filter: blur(14px);
    }

    .stat-card {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 22px 24px;
      transition: background 0.2s;
    }

    .stat-card:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .stat-sep {
      width: 1px;
      background: rgba(255, 255, 255, 0.07);
      margin: 16px 0;
    }

    .stat-icon-wrap {
      width: 48px; height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      flex-shrink: 0;
    }

    .stat-icon-wrap.green  { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.25); }
    .stat-icon-wrap.gold   { background: rgba(245, 158, 11, 0.15);  border: 1px solid rgba(245, 158, 11, 0.25); }
    .stat-icon-wrap.blue   { background: rgba(59, 130, 246, 0.15);  border: 1px solid rgba(59, 130, 246, 0.25); }
    .stat-icon-wrap.purple { background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.25); }

    .stat-value {
      font-size: 1.25rem;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.1;
    }

    .stat-value small {
      font-size: 0.75rem;
      font-weight: 600;
      color: #10b981;
    }

    .stat-label {
      font-size: 0.78rem;
      color: #64748b;
      font-weight: 600;
      margin-top: 3px;
    }

    /* === VISUAL GALLERY === */
    .gallery-section {
      padding: 70px 0 50px;
    }

    .section-header {
      text-align: center;
      margin-bottom: 44px;
    }

    .section-tag {
      display: inline-block;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34d399;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 5px 16px;
      border-radius: 9999px;
      margin-bottom: 12px;
      letter-spacing: 0.05em;
    }

    .section-header h2 {
      font-size: 2.2rem;
      font-weight: 900;
      margin-bottom: 10px;
    }

    .section-header p {
      color: #94a3b8;
      font-size: 1rem;
      max-width: 540px;
      margin: 0 auto;
    }

    .gallery-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
    }

    .showcase-card {
      border-radius: 22px;
      overflow: hidden;
      background: rgba(14, 20, 36, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: all 0.35s ease;
    }

    .showcase-card:hover {
      transform: translateY(-6px);
      border-color: rgba(16, 185, 129, 0.35);
      box-shadow: 0 24px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(16, 185, 129, 0.12);
    }

    .showcase-img-box {
      position: relative;
      height: 240px;
      overflow: hidden;
    }

    .showcase-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.6s ease;
    }

    .showcase-card:hover .showcase-img {
      transform: scale(1.06);
    }

    .showcase-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 40%, rgba(14, 20, 36, 0.95) 100%);
    }

    .showcase-tag {
      position: absolute;
      top: 14px;
      right: 14px;
      background: rgba(6, 11, 20, 0.85);
      backdrop-filter: blur(6px);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-weight: 800;
      font-size: 0.78rem;
      padding: 5px 12px;
      border-radius: 8px;
    }

    .showcase-body {
      padding: 24px 26px 28px;
      text-align: right;
    }

    .showcase-body h3 {
      font-size: 1.25rem;
      font-weight: 900;
      color: #ffffff;
      margin-bottom: 8px;
    }

    .showcase-body p {
      color: #94a3b8;
      font-size: 0.9rem;
      line-height: 1.65;
      margin-bottom: 16px;
    }

    .showcase-features {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .showcase-features span {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #34d399;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
    }

    /* === FACILITIES === */
    .facilities-section {
      padding: 50px 0 70px;
    }

    .facilities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
    }

    .facility-card {
      background: rgba(14, 20, 36, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 20px;
      padding: 28px 24px;
      text-align: center;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .facility-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.6), transparent);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .facility-card:hover {
      transform: translateY(-6px);
      border-color: rgba(16, 185, 129, 0.3);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(16, 185, 129, 0.08);
    }

    .facility-card:hover::before { opacity: 1; }

    .facility-icon {
      font-size: 2.2rem;
      margin-bottom: 16px;
      display: inline-block;
      transition: transform 0.3s;
    }

    .facility-card:hover .facility-icon {
      transform: scale(1.15);
    }

    .facility-card h4 {
      font-size: 1.1rem;
      font-weight: 800;
      margin-bottom: 8px;
      color: #ffffff;
    }

    .facility-card p {
      color: #94a3b8;
      font-size: 0.88rem;
      line-height: 1.6;
      margin: 0;
    }

    /* === HOW IT WORKS === */
    .how-section {
      padding: 60px 0;
    }

    .steps-timeline {
      display: flex;
      flex-direction: column;
      gap: 0;
      max-width: 760px;
      margin: 0 auto 50px;
    }

    .step-item {
      display: flex;
      gap: 20px;
      align-items: stretch;
    }

    .step-left {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
    }

    .step-num {
      width: 48px; height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      font-weight: 900;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
      flex-shrink: 0;
      z-index: 1;
    }

    .step-line {
      width: 2px;
      flex: 1;
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.4), rgba(16, 185, 129, 0.1));
      margin: 6px 0;
      min-height: 32px;
    }

    .step-body {
      flex: 1;
      padding: 22px 24px;
      margin-bottom: 16px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      text-align: right;
      transition: all 0.3s ease;
    }

    .step-body:hover {
      transform: translateX(-4px);
      border-color: rgba(16, 185, 129, 0.3);
    }

    .step-emoji {
      font-size: 1.8rem;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .step-body h3 {
      font-size: 1.1rem;
      margin-bottom: 6px;
    }

    .step-body p {
      color: #94a3b8;
      font-size: 0.88rem;
      line-height: 1.65;
      margin: 0;
    }

    /* === CTA BOX === */
    .cta-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.14), rgba(5, 150, 105, 0.08));
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 24px;
      padding: 34px 40px;
      flex-wrap: wrap;
    }

    .cta-text h3 {
      font-size: 1.65rem;
      margin-bottom: 6px;
    }

    .cta-text p {
      color: #cbd5e1;
      font-size: 0.95rem;
      margin: 0;
    }

    .cta-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* === FOOTER === */
    .footer-wave {
      padding-bottom: 30px;
      margin-top: 40px;
    }

    .footer-wave svg {
      width: 100%;
      height: 60px;
      display: block;
      margin-bottom: 20px;
    }

    .footer-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 20px;
    }

    .footer-brand .footer-logo {
      font-size: 1.15rem;
      font-weight: 800;
      color: #ffffff;
      display: block;
      margin-bottom: 2px;
    }

    .footer-brand p {
      font-size: 0.82rem;
      color: #64748b;
      margin: 0;
    }

    .footer-copy {
      color: #64748b;
      font-size: 0.85rem;
      margin: 0;
    }

    /* === RESPONSIVE BREAKPOINTS === */
    @media (max-width: 1024px) {
      .hero-layout {
        grid-template-columns: 1fr;
        gap: 36px;
      }
      .hero-text-col { text-align: center; }
      .hero-desc { margin-left: auto; margin-right: auto; }
      .hero-actions { justify-content: center; }
      .hero-features-chips { justify-content: center; }
      .owner-notice { text-align: right; }
      .stadium-card-wrapper { max-width: 580px; margin: 0 auto; }
    }

    @media (max-width: 768px) {
      .hero-section { padding: 40px 0 50px; min-height: auto; }
      .hero-title { font-size: 2.3rem; }
      .hero-desc { font-size: 1rem; }

      .stats-grid { flex-direction: column; }
      .stat-sep { width: auto; height: 1px; margin: 0 20px; }
      .stat-card { padding: 16px 20px; }

      .gallery-grid { grid-template-columns: 1fr; }
      .facilities-grid { grid-template-columns: 1fr 1fr; }
      .section-header h2 { font-size: 1.8rem; }

      .step-body { flex-direction: column; gap: 8px; }
      .cta-box { flex-direction: column; text-align: center; padding: 24px; }
      .cta-actions { justify-content: center; }
      .footer-content { flex-direction: column; text-align: center; }
    }

    @media (max-width: 480px) {
      .hero-title { font-size: 1.85rem; }
      .facilities-grid { grid-template-columns: 1fr; }
      .btn-hero-primary, .btn-hero-secondary { width: 100%; justify-content: center; }
      .cta-actions { width: 100%; }
      .cta-actions .btn-hero-primary, .cta-actions .btn-hero-secondary { width: 100%; }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  private pitchService = inject(PitchService);
  public authService = inject(AuthService);
  public realtimeService = inject(RealtimeService);

  public settingsSignal = signal<PitchSetting | null>(null);
  private subscriptions = new Subscription();

  ngOnInit(): void {
    this.loadSettings();
    this.subscriptions.add(
      this.realtimeService.settingsUpdated$.subscribe(() => this.loadSettings())
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadSettings(): void {
    this.pitchService.getSettings().subscribe({
      next: (data) => this.settingsSignal.set(data),
      error: () => {}
    });
  }

  formatHour(hour: number): string {
    if (hour === 0 || hour === 24) return '12 ص';
    if (hour < 12) return `${hour} ص`;
    if (hour === 12) return '12 ظ';
    return `${hour - 12} م`;
  }
}
