import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { RealtimeService } from '../../services/realtime.service';
import { Booking, BookingStatus } from '../../models/booking.models';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="my-bookings-page">
      <div class="container">

        <!-- Page Header -->
        <div class="page-header">
          <div class="header-content">
            <div class="live-status-pill" [class.connected]="realtimeService.isConnectedSignal()">
              <span class="live-pulse"></span>
              <span>{{ realtimeService.isConnectedSignal() ? 'تحديث فوري مباشر (Live Signal)' : 'جاري الاتصال...' }}</span>
            </div>
            <h1>حجوزاتي وسجل مبارياتي</h1>
            <p>متابعة حالة طلبات حجز الملعب والمواعيد المؤكدة الخاصة بك لحظة بلحظة مع خيارات بحث وفلترة متقدمة</p>
          </div>

          <div class="header-actions">
            <a routerLink="/schedule" class="btn-primary">
              <span class="btn-icon">➕</span>
              <span>حجز موعد جديد</span>
            </a>
          </div>
        </div>

        <!-- Alert messages -->
        <div *ngIf="alertMessageSignal()" class="alert-box" [ngClass]="alertTypeSignal()">
          <span>{{ alertMessageSignal() }}</span>
          <button (click)="alertMessageSignal.set('')" class="btn-close">✕</button>
        </div>

        <!-- Stats Metric Strip -->
        <div class="stats-strip glass-panel" *ngIf="bookingsSignal().length > 0">
          <div class="metric-card">
            <div class="metric-icon green">🏆</div>
            <div class="metric-info">
              <span class="metric-value">{{ confirmedCount() }}</span>
              <span class="metric-label">مواعيد مؤكدة</span>
            </div>
          </div>

          <div class="metric-sep"></div>

          <div class="metric-card">
            <div class="metric-icon gold">⏳</div>
            <div class="metric-info">
              <span class="metric-value">{{ pendingCount() }}</span>
              <span class="metric-label">طلبات معلقة</span>
            </div>
          </div>

          <div class="metric-sep"></div>

          <div class="metric-card">
            <div class="metric-icon blue">⏱️</div>
            <div class="metric-info">
              <span class="metric-value">{{ totalHours() }} <small>ساعة</small></span>
              <span class="metric-label">إجمالي الساعات</span>
            </div>
          </div>

          <div class="metric-sep"></div>

          <div class="metric-card">
            <div class="metric-icon purple">💰</div>
            <div class="metric-info">
              <span class="metric-value">{{ totalCost() }} <small>ج.م</small></span>
              <span class="metric-label">إجمالي المستحق</span>
            </div>
          </div>
        </div>

        <!-- Comprehensive Filtration Toolbar -->
        <div class="filtration-bar glass-panel" *ngIf="bookingsSignal().length > 0">
          <div class="filters-top-row">
            <!-- Search input -->
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input 
                type="text" 
                class="form-input search-input" 
                [ngModel]="searchTerm()" 
                (ngModelChange)="onSearchChange($event)"
                placeholder="ابحث بالتاريخ، الهاتف، الاسم، أو الملاحظات..." />
              <button 
                *ngIf="searchTerm()" 
                type="button" 
                class="btn-clear-search" 
                (click)="onSearchChange('')" 
                title="مسح البحث">✕</button>
            </div>

            <!-- Date filter -->
            <div class="filter-field">
              <label class="filter-label">📅 التاريخ:</label>
              <input 
                type="date" 
                class="form-input date-filter-input" 
                [ngModel]="dateFilter()" 
                (ngModelChange)="onDateFilterChange($event)" />
            </div>

            <!-- Booking type filter -->
            <div class="filter-field">
              <label class="filter-label">🏷️ نوع الحجز:</label>
              <select 
                class="form-select type-select" 
                [ngModel]="typeFilter()" 
                (ngModelChange)="onTypeChange($event)">
                <option value="all">جميع الأنواع</option>
                <option value="weekly">أسبوعي (تثبيت)</option>
                <option value="single">حجز عادي</option>
              </select>
            </div>

            <!-- Sort option -->
            <div class="filter-field">
              <label class="filter-label">🔃 الترتيب:</label>
              <select 
                class="form-select sort-select" 
                [ngModel]="sortBy()" 
                (ngModelChange)="onSortChange($event)">
                <option value="date-desc">التاريخ (الأحدث أولاً)</option>
                <option value="date-asc">التاريخ (الأقدم أولاً)</option>
                <option value="created-desc">تاريخ تقديم الطلب</option>
              </select>
            </div>

            <!-- Reset filters button -->
            <button 
              *ngIf="hasActiveFilters()" 
              type="button" 
              class="btn-reset-filters" 
              (click)="resetAllFilters()"
              title="إعادة تعيين كافة الفلاتر">
              <span>🔄 تصفير الفلاتر</span>
            </button>
          </div>

          <!-- Status Filter Tabs / Chips -->
          <div class="status-chips-row">
            <button 
              type="button" 
              class="filter-chip" 
              [class.active]="activeFilter() === 'all'" 
              (click)="setFilter('all')">
              <span>الكل ({{ bookingsSignal().length }})</span>
            </button>

            <button 
              type="button" 
              class="filter-chip chip-approved" 
              [class.active]="activeFilter() === 'approved'" 
              (click)="setFilter('approved')">
              <span class="chip-dot dot-green"></span>
              <span>🏆 المؤكدة ({{ confirmedCount() }})</span>
            </button>

            <button 
              type="button" 
              class="filter-chip chip-pending" 
              [class.active]="activeFilter() === 'pending'" 
              (click)="setFilter('pending')">
              <span class="chip-dot dot-gold"></span>
              <span>⏳ المعلقة ({{ pendingCount() }})</span>
            </button>

            <button 
              type="button" 
              class="filter-chip chip-rejected" 
              [class.active]="activeFilter() === 'rejected'" 
              (click)="setFilter('rejected')">
              <span class="chip-dot dot-red"></span>
              <span>❌ المرفوضة والملغية</span>
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loadingSignal()" class="loading-state">
          <div class="spinner"></div>
          <p>جاري جلب حجوزاتك في الحال...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loadingSignal() && totalItems() === 0" class="empty-state glass-panel">
          <div class="empty-icon-wrap">📋</div>
          <h3>{{ bookingsSignal().length === 0 ? 'لا توجد لديك حجوزات حتى الآن' : 'لا توجد نتائج تطابق معايير البحث والفلترة' }}</h3>
          <p>{{ bookingsSignal().length === 0 ? 'تصفح جدول مواعيد ملعب النجوم واحجز ساعتك المناسبة لمباراتك القادمة.' : 'جرب تغيير أو تصفير الفلاتر للوصول إلى الحجوزات المطلوبة.' }}</p>
          <div class="empty-actions">
            <a *ngIf="bookingsSignal().length === 0" routerLink="/schedule" class="btn-primary btn-empty-cta">
              <span>📅 الذهاب لجدول المواعيد</span>
            </a>
            <button *ngIf="bookingsSignal().length > 0 && hasActiveFilters()" type="button" class="btn-secondary" (click)="resetAllFilters()">
              <span>🔄 تصفير الفلاتر الآن</span>
            </button>
          </div>
        </div>

        <!-- Bookings Cards Grid (Paginated) -->
        <div *ngIf="!loadingSignal() && totalItems() > 0" class="bookings-grid">
          <div 
            *ngFor="let b of paginatedBookings()" 
            class="booking-card glass-panel" 
            [ngClass]="'status-' + b.status">
            
            <div class="card-header">
              <div class="date-meta">
                <span class="booking-date">📅 {{ b.bookingDate }}</span>
                <span class="booking-type-tag" [class.continuous]="b.type === 1">
                  {{ b.typeName }}
                </span>
              </div>
              <span class="badge" [ngClass]="getStatusBadgeClass(b.status)">
                {{ b.statusName }}
              </span>
            </div>

            <div class="card-body">
              <div class="time-block">
                <div class="time-icon">⏰</div>
                <div class="time-details">
                  <strong class="time-hours">من الساعة {{ b.startHour }}:00 حتى {{ b.endHour }}:00</strong>
                  <span class="duration-badge">⏱️ المدة: {{ b.durationHours }} ساعة</span>
                </div>
              </div>

              <div *ngIf="b.bookedForName" class="info-row">
                <span class="label">👤 صاحب الحجز:</span>
                <strong>{{ b.bookedForName }}</strong>
                <span *ngIf="b.bookedForPhone" class="phone-tag">📱 {{ b.bookedForPhone }}</span>
              </div>

              <div class="info-row price-row">
                <span class="label">💰 التكلفة الإجمالية:</span>
                <strong class="price-val">{{ b.totalPrice }} جنيه</strong>
                <small class="rate-note">({{ b.pricePerHour }} جنيه / ساعة)</small>
              </div>

              <div *ngIf="b.notes" class="notes-box">
                <span class="notes-lbl">📝 ملاحظاتك:</span>
                <p>{{ b.notes }}</p>
              </div>

              <!-- Rejection Reason if any -->
              <div *ngIf="b.rejectionReason" class="rejection-box">
                <div class="rejection-icon">⚠️</div>
                <div>
                  <strong>سبب عدم القبول من الإدارة:</strong>
                  <p>{{ b.rejectionReason }}</p>
                </div>
              </div>

              <div class="time-meta">
                <span>تاريخ التقديم: {{ formatDateTime(b.createdAt) }}</span>
                <span *ngIf="b.approvedAt" class="text-green">تمت الموافقة: {{ formatDateTime(b.approvedAt) }}</span>
              </div>
            </div>

            <div class="card-footer" *ngIf="b.status === 0">
              <button 
                type="button" 
                (click)="openCancelModal(b)" 
                class="btn-danger btn-sm"
                [disabled]="cancellingId === b.id">
                <span *ngIf="cancellingId === b.id">جاري الإلغاء... ⏳</span>
                <span *ngIf="cancellingId !== b.id">🗑️ إلغاء الطلب المعلق</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination Bar -->
        <div class="pagination-bar glass-panel" *ngIf="!loadingSignal() && totalItems() > 0">
          <div class="pagination-info">
            <span>عرض <strong>{{ (currentPage() - 1) * pageSize() + 1 }}</strong> إلى <strong>{{ Math.min(currentPage() * pageSize(), totalItems()) }}</strong> من إجمالي <strong>{{ totalItems() }}</strong> حجز</span>
          </div>

          <div class="pagination-pages" *ngIf="totalPages() > 1">
            <button 
              type="button" 
              class="page-btn page-arrow" 
              [disabled]="currentPage() === 1" 
              (click)="goToPage(1)" 
              title="الصفحة الأولى">
              «
            </button>
            <button 
              type="button" 
              class="page-btn page-arrow" 
              [disabled]="currentPage() === 1" 
              (click)="goToPage(currentPage() - 1)" 
              title="الصفحة السابقة">
              ‹
            </button>

            <button 
              *ngFor="let p of pagesArray()" 
              type="button" 
              class="page-btn" 
              [class.active]="p === currentPage()" 
              (click)="goToPage(p)">
              {{ p }}
            </button>

            <button 
              type="button" 
              class="page-btn page-arrow" 
              [disabled]="currentPage() === totalPages()" 
              (click)="goToPage(currentPage() + 1)" 
              title="الصفحة التالية">
              ›
            </button>
            <button 
              type="button" 
              class="page-btn page-arrow" 
              [disabled]="currentPage() === totalPages()" 
              (click)="goToPage(totalPages())" 
              title="الصفحة الأخيرة">
              »
            </button>
          </div>

          <!-- Page size selector -->
          <div class="page-size-wrap">
            <label>لكل صفحة:</label>
            <select 
              class="form-select size-select" 
              [ngModel]="pageSize()" 
              (ngModelChange)="onPageSizeChange($event)">
              <option [ngValue]="6">6</option>
              <option [ngValue]="12">12</option>
              <option [ngValue]="24">24</option>
            </select>
          </div>
        </div>

        <!-- In-App Cancel Confirmation Modal -->
        <div *ngIf="showCancelModal" class="modal-backdrop" (click)="closeCancelModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>🗑️ تأكيد إلغاء طلب الحجز</h2>
              <button (click)="closeCancelModal()" class="btn-close-modal">✕</button>
            </div>

            <div class="modal-body" *ngIf="cancelTargetBooking">
              <p class="modal-warning-text">
                هل أنت متأكد من رغبتك في إلغاء هذا الطلب المعلق نهائياً؟
              </p>
              <div class="cancel-summary-box">
                <div>📅 <strong>التاريخ:</strong> {{ cancelTargetBooking.bookingDate }}</div>
                <div>⏰ <strong>الموعد:</strong> من {{ cancelTargetBooking.startHour }}:00 حتى {{ cancelTargetBooking.endHour }}:00 ({{ cancelTargetBooking.durationHours }} ساعة)</div>
                <div>💰 <strong>المبلغ الإجمالي:</strong> {{ cancelTargetBooking.totalPrice }} جنيه</div>
              </div>
            </div>

            <div class="modal-actions">
              <button 
                type="button" 
                class="btn-secondary" 
                (click)="closeCancelModal()" 
                [disabled]="cancellingId !== null">
                تراجع
              </button>
              <button 
                type="button" 
                class="btn-danger" 
                (click)="confirmCancelBooking()" 
                [disabled]="cancellingId !== null">
                <span *ngIf="cancellingId === cancelTargetBooking?.id">جاري الإلغاء... ⏳</span>
                <span *ngIf="cancellingId !== cancelTargetBooking?.id">🗑️ نعم، تأكيد الإلغاء الآن</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .my-bookings-page {
      padding: 36px 0 70px;
      min-height: 100vh;
    }

    /* === PAGE HEADER === */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .header-content { flex: 1; }

    .live-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 14px;
      border-radius: 9999px;
      background: rgba(100, 116, 139, 0.18);
      border: 1px solid rgba(100, 116, 139, 0.28);
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .live-status-pill.connected {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.32);
      color: #34d399;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.15);
    }

    .live-pulse {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulse 1.6s infinite;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 900;
      margin-bottom: 6px;
    }

    .page-header p {
      color: #94a3b8;
      font-size: 0.92rem;
    }

    /* === METRIC STRIP === */
    .stats-strip {
      display: flex;
      align-items: center;
      background: rgba(14, 20, 36, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .metric-card {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 22px;
      transition: background 0.2s;
    }

    .metric-card:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .metric-sep {
      width: 1px;
      height: 38px;
      background: rgba(255, 255, 255, 0.08);
    }

    .metric-icon {
      width: 44px; height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      flex-shrink: 0;
    }

    .metric-icon.green  { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.25); }
    .metric-icon.gold   { background: rgba(245, 158, 11, 0.15);  border: 1px solid rgba(245, 158, 11, 0.25); }
    .metric-icon.blue   { background: rgba(59, 130, 246, 0.15);  border: 1px solid rgba(59, 130, 246, 0.25); }
    .metric-icon.purple { background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.25); }

    .metric-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .metric-value {
      font-size: 1.35rem;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.1;
    }

    .metric-value small {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .metric-label {
      font-size: 0.78rem;
      color: #64748b;
      font-weight: 600;
    }

    /* === FILTRATION TOOLBAR === */
    .filtration-bar {
      padding: 16px 20px;
      border-radius: 18px;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: rgba(14, 20, 36, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .filters-top-row {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
      flex: 1.5;
      min-width: 240px;
    }

    .search-icon {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.95rem;
      pointer-events: none;
      color: #64748b;
    }

    .search-input {
      padding-right: 40px;
      padding-left: 36px;
      font-size: 0.88rem;
    }

    .btn-clear-search {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .filter-field {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-label {
      font-size: 0.82rem;
      color: #94a3b8;
      font-weight: 700;
      white-space: nowrap;
    }

    .date-filter-input {
      width: auto;
      padding: 8px 12px;
      font-size: 0.85rem;
    }

    .type-select, .sort-select {
      width: auto;
      padding: 8px 14px;
      font-size: 0.85rem;
      border-radius: 10px;
    }

    .btn-reset-filters {
      padding: 8px 14px;
      border-radius: 10px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      white-space: nowrap;
      margin-right: auto;
    }

    .btn-reset-filters:hover {
      background: rgba(245, 158, 11, 0.22);
      transform: translateY(-1px);
    }

    /* === STATUS CHIPS ROW === */
    .status-chips-row {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-top: 4px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      font-family: inherit;
    }

    .filter-chip:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }

    .filter-chip.active {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10b981;
      color: #34d399;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);
    }

    .chip-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .dot-green { background: #10b981; box-shadow: 0 0 6px #10b981; }
    .dot-gold  { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
    .dot-red   { background: #ef4444; box-shadow: 0 0 6px #ef4444; }

    /* === BOOKINGS GRID === */
    .bookings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .booking-card {
      border-radius: 20px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(14, 20, 36, 0.85);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .booking-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
    }

    .booking-card.status-0::before { background: #f59e0b; }
    .booking-card.status-1::before { background: #10b981; }
    .booking-card.status-2::before { background: #ef4444; }
    .booking-card.status-3::before { background: #64748b; }

    .booking-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .date-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .booking-date {
      font-size: 1.05rem;
      font-weight: 800;
      color: #ffffff;
    }

    .booking-type-tag {
      font-size: 0.75rem;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 2px 8px;
      border-radius: 6px;
      align-self: flex-start;
    }

    .booking-type-tag.continuous {
      color: #fbbf24;
      background: rgba(245, 158, 11, 0.12);
      border-color: rgba(245, 158, 11, 0.25);
    }

    .time-block {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 12px 14px;
      border-radius: 12px;
      margin-bottom: 14px;
    }

    .time-icon {
      font-size: 1.4rem;
      flex-shrink: 0;
    }

    .time-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .time-hours {
      font-size: 0.95rem;
      color: #ffffff;
    }

    .duration-badge {
      font-size: 0.78rem;
      color: #34d399;
      font-weight: 600;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.88rem;
      margin-bottom: 8px;
      color: #cbd5e1;
      flex-wrap: wrap;
    }

    .phone-tag {
      font-size: 0.8rem;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 2px 6px;
      border-radius: 6px;
    }

    .price-row {
      align-items: baseline;
      margin-top: 10px;
    }

    .price-val {
      font-size: 1.2rem;
      font-weight: 900;
      color: #34d399;
    }

    .rate-note {
      font-size: 0.78rem;
      color: #64748b;
    }

    .notes-box {
      background: rgba(0, 0, 0, 0.25);
      border-radius: 10px;
      padding: 10px 12px;
      margin: 10px 0;
      font-size: 0.82rem;
    }

    .notes-lbl {
      color: #94a3b8;
      display: block;
      margin-bottom: 2px;
    }

    .notes-box p {
      margin: 0;
      color: #cbd5e1;
    }

    .rejection-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 10px;
      padding: 10px 14px;
      margin: 10px 0;
      color: #fca5a5;
      font-size: 0.85rem;
    }

    .rejection-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .rejection-box p {
      margin: 2px 0 0;
    }

    .time-meta {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .card-footer {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    /* === PAGINATION BAR === */
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 22px;
      border-radius: 16px;
      background: rgba(14, 20, 36, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 10px;
    }

    .pagination-info {
      font-size: 0.88rem;
      color: #94a3b8;
    }

    .pagination-info strong {
      color: #ffffff;
    }

    .pagination-pages {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .page-btn {
      min-width: 38px;
      height: 38px;
      padding: 0 10px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-family: inherit;
    }

    .page-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      transform: translateY(-1px);
    }

    .page-btn.active {
      background: linear-gradient(135deg, #10b981, #059669);
      border-color: #10b981;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .page-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .page-arrow {
      font-size: 1.1rem;
      font-weight: 800;
    }

    .page-size-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .size-select {
      width: auto;
      padding: 6px 12px;
      font-size: 0.85rem;
      border-radius: 8px;
    }

    /* === EMPTY STATE === */
    .empty-state {
      text-align: center;
      padding: 60px 24px;
      border-radius: 24px;
      max-width: 560px;
      margin: 0 auto;
    }

    .empty-icon-wrap {
      font-size: 3.5rem;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      font-size: 1.4rem;
      font-weight: 900;
      margin-bottom: 8px;
    }

    .empty-state p {
      color: #94a3b8;
      font-size: 0.95rem;
      margin-bottom: 24px;
      line-height: 1.6;
    }

    .empty-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
    }

    /* === MODAL STYLES === */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
    }

    .btn-close-modal {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.3rem;
      cursor: pointer;
    }

    .modal-warning-text {
      color: #cbd5e1;
      font-size: 0.95rem;
      margin-bottom: 16px;
    }

    .cancel-summary-box {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 0.88rem;
    }

    .modal-actions {
      margin-top: 22px;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    .loading-state {
      text-align: center;
      padding: 50px 0;
      color: #94a3b8;
    }

    .spinner {
      width: 38px;
      height: 38px;
      border: 3px solid rgba(16, 185, 129, 0.2);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 14px;
    }

    .btn-close {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 1rem;
    }

    /* === RESPONSIVE === */
    @media (max-width: 900px) {
      .filters-top-row { flex-direction: column; align-items: stretch; }
      .search-box { width: 100%; }
      .filter-field { justify-content: space-between; }
      .pagination-bar { flex-direction: column; text-align: center; }
      .pagination-pages { justify-content: center; }
    }

    @media (max-width: 768px) {
      .stats-strip { flex-direction: column; }
      .metric-sep { width: 100%; height: 1px; }
      .metric-card { width: 100%; padding: 14px 18px; }
      .bookings-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; }
      .header-actions { width: 100%; }
      .header-actions .btn-primary { width: 100%; justify-content: center; }
    }
  `]
})
export class MyBookingsComponent implements OnInit, OnDestroy {
  private bookingService = inject(BookingService);
  public authService = inject(AuthService);
  public realtimeService = inject(RealtimeService);

  public bookingsSignal = signal<Booking[]>([]);
  public loadingSignal = signal<boolean>(false);
  public alertMessageSignal = signal<string>('');
  public alertTypeSignal = signal<string>('alert-success');

  // Math helper for template
  protected readonly Math = Math;

  // Filters State
  activeFilter = signal<'all' | 'approved' | 'pending' | 'rejected'>('all');
  searchTerm = signal<string>('');
  dateFilter = signal<string>('');
  typeFilter = signal<string>('all'); // all, weekly, single
  sortBy = signal<'date-desc' | 'date-asc' | 'created-desc'>('date-desc');

  // Pagination State
  currentPage = signal<number>(1);
  pageSize = signal<number>(6); // 6 items per page (fits 3x2 grid)

  // Modal & Cancel state
  cancellingId: number | null = null;
  showCancelModal = false;
  cancelTargetBooking: Booking | null = null;

  // Computed metrics
  confirmedCount = computed(() => this.bookingsSignal().filter(b => b.status === BookingStatus.Approved).length);
  pendingCount = computed(() => this.bookingsSignal().filter(b => b.status === BookingStatus.Pending).length);
  totalHours = computed(() => this.bookingsSignal().filter(b => b.status === BookingStatus.Approved).reduce((acc, b) => acc + b.durationHours, 0));
  totalCost = computed(() => this.bookingsSignal().filter(b => b.status === BookingStatus.Approved).reduce((acc, b) => acc + b.totalPrice, 0));

  // Filtered list
  filteredBookings = computed(() => {
    let list = this.bookingsSignal();
    const status = this.activeFilter();
    if (status === 'approved') {
      list = list.filter(b => b.status === BookingStatus.Approved);
    } else if (status === 'pending') {
      list = list.filter(b => b.status === BookingStatus.Pending);
    } else if (status === 'rejected') {
      list = list.filter(b => b.status === BookingStatus.Rejected || b.status === BookingStatus.Cancelled);
    }

    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      list = list.filter(b => 
        (b.bookedForName && b.bookedForName.toLowerCase().includes(term)) ||
        (b.bookedForPhone && b.bookedForPhone.includes(term)) ||
        (b.bookingDate && b.bookingDate.includes(term)) ||
        (b.notes && b.notes.toLowerCase().includes(term))
      );
    }

    const type = this.typeFilter();
    if (type === 'weekly') {
      list = list.filter(b => b.type === 1);
    } else if (type === 'single') {
      list = list.filter(b => b.type === 0);
    }

    const dateVal = this.dateFilter();
    if (dateVal) {
      list = list.filter(b => b.bookingDate === dateVal);
    }

    const sort = this.sortBy();
    list = [...list].sort((a, b) => {
      if (sort === 'date-asc') {
        return a.bookingDate.localeCompare(b.bookingDate) || (a.startHour - b.startHour);
      } else if (sort === 'date-desc') {
        return b.bookingDate.localeCompare(a.bookingDate) || (b.startHour - a.startHour);
      } else {
        return (new Date(b.createdAt).getTime()) - (new Date(a.createdAt).getTime());
      }
    });

    return list;
  });

  totalItems = computed(() => this.filteredBookings().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));

  // Paginated slice
  paginatedBookings = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredBookings().slice(start, start + this.pageSize());
  });

  pagesArray = computed(() => {
    const total = this.totalPages();
    const cur = this.currentPage();
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, cur - 2);
    let end = Math.min(total, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  hasActiveFilters = computed(() => {
    return this.activeFilter() !== 'all' || 
           this.searchTerm().trim() !== '' || 
           this.dateFilter() !== '' || 
           this.typeFilter() !== 'all';
  });

  private subscriptions = new Subscription();

  ngOnInit(): void {
    this.loadMyBookings();
    this.subscriptions.add(
      this.realtimeService.bookingUpdated$.subscribe(() => {
        this.loadMyBookings();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadMyBookings(): void {
    this.loadingSignal.set(true);
    this.bookingService.getMyBookings().subscribe({
      next: (data) => {
        this.bookingsSignal.set(data);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.loadingSignal.set(false);
        this.alertTypeSignal.set('alert-danger');
        this.alertMessageSignal.set('تعذر جلب حجوزاتك، يرجى إعادة المحاولة.');
      }
    });
  }

  setFilter(filter: 'all' | 'approved' | 'pending' | 'rejected'): void {
    this.activeFilter.set(filter);
    this.currentPage.set(1);
  }

  onSearchChange(val: string): void {
    this.searchTerm.set(val);
    this.currentPage.set(1);
  }

  onTypeChange(val: string): void {
    this.typeFilter.set(val);
    this.currentPage.set(1);
  }

  onDateFilterChange(val: string): void {
    this.dateFilter.set(val);
    this.currentPage.set(1);
  }

  onSortChange(val: 'date-desc' | 'date-asc' | 'created-desc'): void {
    this.sortBy.set(val);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  resetAllFilters(): void {
    this.activeFilter.set('all');
    this.searchTerm.set('');
    this.dateFilter.set('');
    this.typeFilter.set('all');
    this.sortBy.set('date-desc');
    this.currentPage.set(1);
  }

  openCancelModal(b: Booking): void {
    this.cancelTargetBooking = b;
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancelTargetBooking = null;
  }

  confirmCancelBooking(): void {
    if (!this.cancelTargetBooking) return;
    const booking = this.cancelTargetBooking;
    this.cancellingId = booking.id;

    this.bookingService.cancelBooking(booking.id).subscribe({
      next: (res) => {
        this.cancellingId = null;
        this.closeCancelModal();
        this.alertTypeSignal.set('alert-success');
        this.alertMessageSignal.set(res.message);
        this.loadMyBookings();
      },
      error: (err) => {
        this.cancellingId = null;
        this.alertTypeSignal.set('alert-danger');
        this.alertMessageSignal.set(err.error?.message || 'تعذر إلغاء الحجز.');
      }
    });
  }

  getStatusBadgeClass(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.Approved: return 'badge-available';
      case BookingStatus.Pending: return 'badge-pending';
      case BookingStatus.Rejected: return 'badge-booked';
      case BookingStatus.Cancelled: return 'badge-unavailable';
      default: return '';
    }
  }

  formatDateTime(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.toLocaleDateString('ar-EG')} - ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
  }
}
