import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { PitchService } from '../../services/pitch.service';
import { RealtimeService } from '../../services/realtime.service';
import { DaySchedule, ScheduleSlot } from '../../models/pitch.models';
import { BookingType, CreateBookingRequest } from '../../models/booking.models';
import { UserProfile } from '../../models/auth.models';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="schedule-page">
      <div class="container">
        <!-- Page Header -->
        <div class="page-header">
          <div class="header-content">
            <div class="live-status-pill" [class.connected]="realtimeService.isConnectedSignal()">
              <span class="live-pulse"></span>
              <span>{{ realtimeService.isConnectedSignal() ? 'تحديث فوري مباشر (Live Signal)' : 'جاري الاتصال بالسيرفر...' }}</span>
            </div>
            <h1>جدول مواعيد وحصص ملعب النجوم</h1>
            <p>اختر اليوم واطلع على الساعات المتاحة وقدم طلب الحجز مع تحديد صاحب الحجز</p>
          </div>

          <!-- Date Selector -->
          <div class="date-controls glass-panel">
            <label class="date-label">اختر التاريخ:</label>
            <input 
              type="date" 
              class="form-input date-input" 
              [ngModel]="selectedDateSignal()" 
              (ngModelChange)="onDateChange($event)" />
          </div>
        </div>

        <!-- Quick Day Buttons -->
        <div class="quick-days">
          <button 
            *ngFor="let day of quickDays" 
            type="button" 
            class="day-chip" 
            [class.active]="day.date === selectedDateSignal()" 
            (click)="onDateChange(day.date)">
            <span class="day-chip-name">{{ day.label }}</span>
            <span class="day-chip-date">{{ day.formatted }}</span>
          </button>
        </div>

        <!-- Alert messages -->
        <div *ngIf="alertMessageSignal()" class="alert-box" [ngClass]="alertTypeSignal()">
          <span>{{ alertMessageSignal() }}</span>
          <button (click)="alertMessageSignal.set('')" class="btn-close">✕</button>
        </div>

        <!-- Schedule Info Bar with Modern Status Filter Tabs -->
        <div *ngIf="dayScheduleSignal()" class="schedule-info-bar glass-panel">
          <div class="info-meta-group">
            <div class="info-item">
              <span class="info-icon">📅</span>
              <div>
                <span class="info-label">اليوم:</span>
                <strong class="info-value">{{ dayScheduleSignal()?.dayNameArabic }} ({{ dayScheduleSignal()?.date }})</strong>
              </div>
            </div>

            <div class="info-item">
              <span class="info-icon">💵</span>
              <div>
                <span class="info-label">سعر الساعة:</span>
                <strong class="info-value text-green">{{ dayScheduleSignal()?.hourlyRate }} جنيه</strong>
              </div>
            </div>
          </div>

          <!-- Modern Interactive Status Tabs -->
          <div class="status-tabs-container">
            <button 
              type="button" 
              class="status-tab-pill tab-all" 
              [class.active]="selectedStatusFilterSignal() === 'ALL'" 
              (click)="setStatusFilter('ALL')">
              <span class="status-indicator-dot dot-all"></span>
              <span class="status-tab-title">الكل</span>
              <span class="status-tab-count">{{ dayScheduleSignal()?.slots?.length || 0 }}</span>
            </button>

            <button 
              type="button" 
              class="status-tab-pill tab-available" 
              [class.active]="selectedStatusFilterSignal() === 'Available'" 
              (click)="setStatusFilter('Available')">
              <span class="status-indicator-dot dot-available"></span>
              <span class="status-tab-title">متاح للحجز</span>
              <span class="status-tab-count">{{ availableCount() }}</span>
            </button>

            <button 
              type="button" 
              class="status-tab-pill tab-booked" 
              [class.active]="selectedStatusFilterSignal() === 'Booked'" 
              (click)="setStatusFilter('Booked')">
              <span class="status-indicator-dot dot-booked"></span>
              <span class="status-tab-title">محجوز</span>
              <span class="status-tab-count">{{ bookedCount() }}</span>
            </button>

            <button 
              type="button" 
              class="status-tab-pill tab-pending" 
              [class.active]="selectedStatusFilterSignal() === 'PendingMine'" 
              (click)="setStatusFilter('PendingMine')">
              <span class="status-indicator-dot dot-pending"></span>
              <span class="status-tab-title">طلبك معلق</span>
              <span class="status-tab-count">{{ pendingCount() }}</span>
            </button>

            <button 
              type="button" 
              class="status-tab-pill tab-unavailable" 
              [class.active]="selectedStatusFilterSignal() === 'Unavailable'" 
              (click)="setStatusFilter('Unavailable')">
              <span class="status-indicator-dot dot-unavailable"></span>
              <span class="status-tab-title">لا يعمل / صيانة</span>
              <span class="status-tab-count">{{ unavailableCount() }}</span>
            </button>
          </div>
        </div>

        <!-- SLOTS GRID -->
        <div *ngIf="loadingSignal()" class="loading-state">
          <div class="spinner"></div>
          <p>جاري جلب جدول المواعيد في الحال...</p>
        </div>

        <!-- Empty Filter State -->
        <div *ngIf="!loadingSignal() && dayScheduleSignal() && filteredSlots().length === 0" class="empty-filter-state glass-panel">
          <p>🔍 لا توجد حصص بهذه الحالة حالياً في هذا اليوم.</p>
          <button type="button" class="btn-secondary btn-sm" (click)="setStatusFilter('ALL')">عرض جميع الحصص</button>
        </div>

        <div *ngIf="!loadingSignal() && dayScheduleSignal() && filteredSlots().length > 0" class="slots-grid">
          <div 
            *ngFor="let slot of filteredSlots()" 
            class="slot-card glass-panel" 
            [ngClass]="'status-' + slot.status.toLowerCase()">
            
            <div class="slot-header">
              <div class="slot-time">
                <span class="time-main">{{ formatHourLabel(slot.hour) }}</span>
                <span class="time-range">{{ slot.timeLabel }}</span>
              </div>

              <!-- Status Badge -->
              <span class="badge" [ngClass]="getBadgeClass(slot.status)">
                {{ slot.statusArabicLabel }}
              </span>
            </div>

            <!-- Card Body / Meta -->
            <div class="slot-body">
              <div *ngIf="slot.isUnavailable" class="slot-unavailable-reason">
                <span>⚠️ {{ slot.unavailableReason || 'الملعب لا يعمل في هذه الساعة بقرار الإدارة' }}</span>
              </div>

              <div *ngIf="slot.isBooked" class="slot-booked-info">
                <span class="lock-icon">🔒</span>
                <div>
                  <ng-container *ngIf="authService.isAdmin(); else publicSlotInfo">
                    <strong>محجوز: {{ slot.bookedByFullName || 'مباراة مؤكدة' }}</strong>
                    <div *ngIf="slot.bookedForPhone" class="booked-phone-badge">📞 {{ slot.bookedForPhone }}</div>
                  </ng-container>
                  <ng-template #publicSlotInfo>
                    <strong>هذا الموعد محجوز بالكامل</strong>
                  </ng-template>
                  <span *ngIf="slot.bookedType === 1" class="continuous-tag">حجز مستمر متكرر</span>
                </div>
              </div>

              <div *ngIf="slot.status === 'PendingMine'" class="slot-user-pending">
                <span>⏳ طلبك معلق بانتظار موافقة صاحب الملعب</span>
              </div>

              <div *ngIf="slot.isAvailable && slot.pendingRequestsCount > 0" class="slot-pending-count">
                <span>⚡ يوجد {{ slot.pendingRequestsCount }} طلب معلق أسبق</span>
              </div>

              <div *ngIf="slot.isAvailable && slot.pendingRequestsCount === 0" class="slot-free-note">
                <span>✨ لا توجد طلبات سابقة على هذه الساعة</span>
              </div>
            </div>

            <!-- Card Footer / Action -->
            <div class="slot-footer">
              <button 
                *ngIf="slot.isAvailable" 
                type="button" 
                class="btn-primary btn-slot"
                (click)="openBookingModal(slot)">
                طلب حجز هذا الموعد
              </button>

              <!-- Booked Slot Actions -->
              <div *ngIf="slot.isBooked" class="booked-actions-group">
                <button 
                  *ngIf="!authService.isAdmin()" 
                  type="button" 
                  class="btn-secondary btn-slot" 
                  disabled>
                  محجوز بالكامل
                </button>
                <button 
                  *ngIf="authService.isAdmin()" 
                  type="button" 
                  class="btn-danger btn-slot" 
                  (click)="openDeleteSlotModal(slot)"
                  title="حذف هذا الحجز نهائياً وتحرير الموعد بالجدول فوراً">
                  🗑️ حذف الحجز وتحرير الساعة
                </button>
              </div>

              <button 
                *ngIf="slot.isUnavailable" 
                type="button" 
                class="btn-secondary btn-slot" 
                disabled>
                مغلق / صيانة
              </button>

              <button 
                *ngIf="slot.status === 'PendingMine'" 
                type="button" 
                class="btn-secondary btn-slot btn-pending-slot" 
                disabled>
                طلبك قيد المراجعة
              </button>
            </div>
          </div>
        </div>

        <!-- BOOKING MODAL -->
        <div *ngIf="showModal" class="modal-backdrop" (click)="closeBookingModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>طلب حجز الملعب</h2>
              <button (click)="closeBookingModal()" class="btn-close-modal">✕</button>
            </div>

            <!-- In-Modal Validation Error -->
            <div *ngIf="modalErrorSignal()" class="modal-inline-error">
              <span>⚠️ {{ modalErrorSignal() }}</span>
              <button type="button" (click)="modalErrorSignal.set('')" class="btn-close-error">✕</button>
            </div>

            <!-- Guest warning -->
            <div *ngIf="!authService.isAuthenticated()" class="auth-warning-box">
              <p>يجب عليك تسجيل الدخول بحساب نشط لتتمكن من إرسال طلب الحجز.</p>
              <div class="warning-actions">
                <a routerLink="/auth" [queryParams]="{mode: 'login'}" class="btn-primary btn-sm">تسجيل الدخول</a>
                <a routerLink="/auth" [queryParams]="{mode: 'register'}" class="btn-secondary btn-sm">إنشاء حساب</a>
              </div>
            </div>

            <!-- Inactive user warning -->
            <div *ngIf="authService.isAuthenticated() && !authService.currentUser()?.isActive && !authService.isAdmin()" class="auth-warning-box">
              <p>⚠️ حسابك غير نشط حالياً وبانتظار تأكيد صاحب الملعب، ولا يمكنك الحجز حتى يتم التفعيل.</p>
            </div>

            <form *ngIf="authService.isAuthenticated()" (ngSubmit)="submitBooking()">
              <div class="booking-summary-box">
                <div class="summary-row">
                  <span>التاريخ المختار:</span>
                  <strong>{{ selectedDateSignal() }}</strong>
                </div>
                <div class="summary-row">
                  <span>ساعة البداية:</span>
                  <strong>{{ formatHourLabel(selectedSlot?.hour || 0) }} ({{ selectedSlot?.hour }}:00)</strong>
                </div>
                <div class="summary-row">
                  <span>سعر الساعة:</span>
                  <strong>{{ dayScheduleSignal()?.hourlyRate }} جنيه</strong>
                </div>
              </div>

              <!-- OWNER / BOOKER SELECTION -->
              <!-- Case A: Normal player (Non-Admin): Strictly booked under user's own identity -->
              <div *ngIf="!authService.isAdmin()" class="form-group booker-section">
                <div class="user-booking-identity-card">
                  <div class="user-id-icon">👤</div>
                  <div class="user-id-details">
                    <span class="user-id-label">صاحب الحجز (يسجل الطلب تلقائياً باسمك ورقم هاتفك):</span>
                    <strong class="user-id-name">{{ authService.currentUser()?.fullName }}</strong>
                    <div class="user-id-sub">
                      <span>📱 {{ authService.currentUser()?.phoneNumber }}</span>
                      <span *ngIf="authService.currentUser()?.address"> &bull; 🏠 {{ authService.currentUser()?.address }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Case B: Pitch Owner / Admin: Has choices to book for registered player or custom contact -->
              <div *ngIf="authService.isAdmin()" class="form-group booker-section">
                <label class="form-label booker-main-label">
                  👑 تحديد صاحب الحجز (صلاحيات صاحب الملعب)
                </label>

                <div class="booker-mode-toggle">
                  <button 
                    type="button" 
                    class="b-toggle-btn" 
                    [class.active]="bookerMode === 'user'" 
                    (click)="setBookerMode('user')">
                    تحديد لاعب مسجل
                  </button>

                  <button 
                    type="button" 
                    class="b-toggle-btn" 
                    [class.active]="bookerMode === 'custom'" 
                    (click)="setBookerMode('custom')">
                    تسجيل اسم ورقم شخص
                  </button>

                  <button 
                    type="button" 
                    class="b-toggle-btn" 
                    [class.active]="bookerMode === 'self'" 
                    (click)="setBookerMode('self')">
                    حساب الملعب / الإدارة
                  </button>
                </div>

                <!-- Option 1: Select Registered User -->
                <div *ngIf="bookerMode === 'user'" class="booker-form-card">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label class="form-label" style="margin-bottom: 0;">اختر اللاعب المسجل من القائمة *</label>
                    <span class="badge" style="font-size: 0.75rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">
                      {{ registeredUsers.length }} لاعبين مسجلين
                    </span>
                  </div>
                  <select class="form-select" [(ngModel)]="selectedTargetUserId" name="targetUser" required>
                    <option [ngValue]="null">-- اختر اسم اللاعب المسجل ({{ registeredUsers.length }} متاح) --</option>
                    <option *ngFor="let u of registeredUsers" [ngValue]="u.id">
                      ⭐ {{ u.fullName }} - 📱 {{ u.phoneNumber }} ({{ u.address }})
                    </option>
                  </select>
                  <p *ngIf="registeredUsers.length === 0" style="font-size: 0.8rem; color: #f59e0b; margin-top: 6px;">
                    ⚠️ لا يوجد لاعبين نشطين حالياً، يمكنك تفعيل اللاعبين الجدد من لوحة تحكم الإدارة.
                  </p>
                </div>

                <!-- Option 2: Custom Name and Phone -->
                <div *ngIf="bookerMode === 'custom'" class="booker-form-card">
                  <div class="grid-2">
                    <div class="form-group mb-0">
                      <label class="form-label">اسم صاحب الحجز / كابتن الفريق *</label>
                      <input 
                        type="text" 
                        class="form-input" 
                        [(ngModel)]="customContactName" 
                        name="customName" 
                        placeholder="مثال: كابتن حسام حسن" 
                        required />
                    </div>
                    <div class="form-group mb-0">
                      <label class="form-label">رقم هاتف صاحب الحجز *</label>
                      <input 
                        type="tel" 
                        class="form-input" 
                        [(ngModel)]="customContactPhone" 
                        name="customPhone" 
                        placeholder="01012345678" 
                        required />
                    </div>
                  </div>
                </div>

                <!-- Option 3: Admin self details -->
                <div *ngIf="bookerMode === 'self'" class="booker-form-card self-card">
                  <span>سيتم تسجيل الحجز مباشرة باسم: <strong>{{ authService.currentUser()?.fullName }} (الإدارة)</strong></span>
                </div>
              </div>

              <!-- Admin notice if booking as owner -->
              <div *ngIf="authService.isAdmin()" class="admin-instant-notice">
                <span>⚡ تنبيه الإدارة: بصفتك صاحب الملعب، سيتم تأكيد هذا الحجز وقفل الموعد فورياً بالجدول.</span>
              </div>

              <!-- Duration Selector (طريقة تفاعلية مرنة لأي عدد من الساعات) -->
              <div class="form-group duration-section">
                <div class="duration-header-row">
                  <label class="form-label mb-0">⏱️ مدة الحجز (عدد الساعات المطلوبة)</label>
                  <span class="duration-time-span">
                    من {{ selectedSlot?.hour }}:00 حتى {{ (selectedSlot?.hour || 0) + bookingDuration }}:00
                  </span>
                </div>

                <!-- Interactive Stepper: ➖ Counter ➕ -->
                <div class="duration-stepper-box">
                  <button 
                    type="button" 
                    class="stepper-btn stepper-minus" 
                    [disabled]="bookingDuration <= 1"
                    (click)="decrementDuration()"
                    title="تقليل ساعة">
                    ➖
                  </button>

                  <div class="stepper-display">
                    <span class="stepper-number">{{ bookingDuration }}</span>
                    <span class="stepper-unit">{{ getDurationUnitArabic(bookingDuration) }}</span>
                  </div>

                  <button 
                    type="button" 
                    class="stepper-btn stepper-plus" 
                    [disabled]="bookingDuration >= maxAvailableHours"
                    (click)="incrementDuration()"
                    title="زيادة ساعة إضافية">
                    ➕
                  </button>
                </div>

                <!-- Dynamic Quick Chips for hours -->
                <div class="duration-chips" *ngIf="durationHoursList.length > 1">
                  <button 
                    *ngFor="let h of durationHoursList" 
                    type="button" 
                    class="d-chip"
                    [class.active]="bookingDuration === h"
                    (click)="setDuration(h)">
                    {{ h }} {{ h === 1 ? 'ساعة' : (h === 2 ? 'ساعتان' : (h <= 10 ? 'ساعات' : 'ساعة')) }}
                  </button>
                </div>
              </div>

              <!-- Booking Type Selector (Weekly vs Continuous) -->
              <div class="form-group">
                <label class="form-label">نوع الحجز</label>
                <div class="type-selector">
                  <label class="type-card" [class.active]="bookingType === 0">
                    <input type="radio" name="bookingType" [value]="0" [(ngModel)]="bookingType" />
                    <div>
                      <strong>حجز أسبوعي (مرة واحدة)</strong>
                      <p>حجز للمباراة في هذا التاريخ فقط للأسبوع الحالي.</p>
                    </div>
                  </label>

                  <label class="type-card" [class.active]="bookingType === 1">
                    <input type="radio" name="bookingType" [value]="1" [(ngModel)]="bookingType" />
                    <div>
                      <strong>حجز مستمر (متكرر أسبوعياً)</strong>
                      <p>تثبيت نفس الموعد كل أسبوع لفريقك بصفة دائمة.</p>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Additional Notes -->
              <div class="form-group">
                <label class="form-label">ملاحظات إضافية أو اسم الفريق (اختياري)</label>
                <textarea 
                  class="form-textarea" 
                  rows="2" 
                  [(ngModel)]="bookingNotes" 
                  name="bookingNotes" 
                  placeholder="مثال: مباراة شباب القرية ضد النجوم"></textarea>
              </div>

              <!-- Total Price Display -->
              <div class="total-price-banner">
                <div class="price-details">
                  <span>المبلغ الإجمالي المتوقع:</span>
                  <div class="total-calc">{{ bookingDuration }} ساعة × {{ dayScheduleSignal()?.hourlyRate }} جنيه</div>
                </div>
                <div class="total-amount">{{ totalCalculatedPrice }} جنيه</div>
              </div>

              <div class="modal-actions">
                <button 
                  type="submit" 
                  class="btn-primary btn-block" 
                  [disabled]="submitting || (!authService.currentUser()?.isActive && !authService.isAdmin())">
                  <span *ngIf="submitting">جاري إرسال الطلب...</span>
                  <span *ngIf="!submitting">{{ authService.isAdmin() ? 'تأكيد الحجز فورياً في الجدول' : 'تأكيد وإرسال طلب الحجز للمعلم' }}</span>
                </button>
                <button type="button" class="btn-secondary" (click)="closeBookingModal()">إلغاء</button>
              </div>
            </form>
          </div>
        </div>

        <!-- In-App Admin Delete Slot Confirmation Modal -->
        <div *ngIf="showDeleteSlotModal" class="modal-backdrop" (click)="closeDeleteSlotModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>🗑️ تأكيد حذف الحجز</h2>
              <button (click)="closeDeleteSlotModal()" class="btn-close-modal">✕</button>
            </div>

            <div class="modal-body" *ngIf="deleteTargetSlot">
              <div class="modal-inline-error" style="background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.4); margin-bottom: 14px;">
                ⚠️ تنبيه: سيتم حذف هذا الحجز نهائياً وتحرير الساعة بالكامل فورياً ليتمكن أي لاعب آخر من حجزها!
              </div>

              <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px;">
                <div>👤 <strong>صاحب الحجز:</strong> {{ deleteTargetSlot.bookedByFullName || 'حجز مباشر' }}</div>
                <div *ngIf="deleteTargetSlot.bookedForPhone">📱 <strong>رقم الهاتف:</strong> {{ deleteTargetSlot.bookedForPhone }}</div>
                <div>⏰ <strong>الموعد المحجوز:</strong> {{ deleteTargetSlot.timeLabel }}</div>
                <div>📅 <strong>التاريخ:</strong> {{ selectedDateSignal() }}</div>
              </div>
            </div>

            <div class="modal-actions" style="justify-content: flex-end;">
              <button type="button" class="btn-secondary" (click)="closeDeleteSlotModal()" [disabled]="isDeletingSlot">
                إلغاء وتراجع
              </button>
              <button type="button" class="btn-danger" (click)="confirmDeleteSlot()" [disabled]="isDeletingSlot">
                <span *ngIf="isDeletingSlot">جاري الحذف... ⏳</span>
                <span *ngIf="!isDeletingSlot">🗑️ تأكيد الحذف وتحرير الموعد الآن</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .schedule-page {
      padding: 36px 0 70px;
      min-height: 100vh;
    }

    /* === Page header === */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }

    .header-content { flex: 1; }

    .live-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 13px;
      border-radius: 9999px;
      background: rgba(100, 116, 139, 0.18);
      border: 1px solid rgba(100, 116, 139, 0.28);
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 700;
      margin-bottom: 10px;
      transition: all 0.3s;
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
      flex-shrink: 0;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(1.3); }
    }

    .header-content h1 {
      font-size: 1.9rem;
      margin-bottom: 6px;
      background: linear-gradient(135deg, #ffffff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .header-content p { color: #64748b; font-size: 0.9rem; }

    /* === Date Selector === */
    .date-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
    }

    .date-label { font-weight: 700; color: #ffffff; font-size: 0.92rem; white-space: nowrap; }
    .date-input { width: auto; padding: 8px 12px; font-size: 0.88rem; }

    /* === Quick Days === */
    .quick-days {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 14px;
      margin-bottom: 28px;
      scrollbar-width: none;
    }
    .quick-days::-webkit-scrollbar { display: none; }

    .day-chip {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 18px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.22s ease;
      min-width: 96px;
      font-family: inherit;
      flex-shrink: 0;
    }

    .day-chip:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      transform: translateY(-2px);
    }

    .day-chip.active {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.15));
      border-color: rgba(16, 185, 129, 0.5);
      color: #ffffff;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.22);
    }

    .day-chip-name { font-weight: 800; font-size: 0.92rem; }
    .day-chip-date { font-size: 0.73rem; opacity: 0.75; margin-top: 2px; }

    /* === Schedule Info Bar === */
    .schedule-info-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 22px;
      margin-bottom: 28px;
      flex-wrap: wrap;
      gap: 14px;
    }

    .info-item { display: flex; align-items: center; gap: 10px; }
    .info-icon { font-size: 1.4rem; }
    .info-label { font-size: 0.8rem; color: #64748b; display: block; }
    .info-value { font-size: 0.95rem; color: #ffffff; font-weight: 700; }
    .text-green { color: #34d399; }

    /* === MODERN STATUS TABS / LEGEND === */
    .info-meta-group {
      display: flex;
      align-items: center;
      gap: 22px;
      flex-wrap: wrap;
    }

    .status-tabs-container {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 5px;
      border-radius: 9999px;
      flex-wrap: wrap;
    }

    .status-tab-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 14px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      color: #94a3b8;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: inherit;
    }

    .status-tab-pill:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      transform: translateY(-1px);
    }

    .status-indicator-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }

    .dot-all { background: #94a3b8; }
    .dot-available { background: #10b981; box-shadow: 0 0 8px #10b981; }
    .dot-booked { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
    .dot-pending { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
    .dot-unavailable { background: #64748b; }

    .status-tab-count {
      font-size: 0.72rem;
      background: rgba(0, 0, 0, 0.4);
      padding: 2px 7px;
      border-radius: 9999px;
      font-weight: 800;
      color: inherit;
    }

    /* Active pill states */
    .status-tab-pill.active {
      color: #ffffff;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
    }

    .status-tab-pill.active .status-indicator-dot {
      transform: scale(1.3);
    }

    .status-tab-pill.tab-all.active {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.3);
      color: #ffffff;
    }

    .status-tab-pill.tab-available.active {
      background: rgba(16, 185, 129, 0.22);
      border-color: #10b981;
      color: #34d399;
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.3);
    }

    .status-tab-pill.tab-booked.active {
      background: rgba(239, 68, 68, 0.22);
      border-color: #ef4444;
      color: #f87171;
      box-shadow: 0 0 16px rgba(239, 68, 68, 0.3);
    }

    .status-tab-pill.tab-pending.active {
      background: rgba(245, 158, 11, 0.22);
      border-color: #f59e0b;
      color: #fbbf24;
      box-shadow: 0 0 16px rgba(245, 158, 11, 0.3);
    }

    .status-tab-pill.tab-unavailable.active {
      background: rgba(100, 116, 139, 0.25);
      border-color: #94a3b8;
      color: #cbd5e1;
    }

    .empty-filter-state {
      text-align: center;
      padding: 36px 20px;
      border-radius: 18px;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      color: #94a3b8;
    }

    @media (max-width: 900px) {
      .schedule-info-bar { flex-direction: column; align-items: stretch; }
      .status-tabs-container { justify-content: center; border-radius: 14px; }
    }

    @media (max-width: 520px) {
      .status-tab-pill { padding: 6px 10px; font-size: 0.78rem; }
    }

    /* === SLOTS GRID === */
    .slots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    /* === SLOT CARD === */
    .slot-card {
      padding: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 200px;
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      transition: all 0.28s ease;
    }

    .slot-card:hover { transform: translateY(-4px); }

    /* Status color strips at top */
    .slot-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      transition: all 0.3s;
    }

    .slot-card.status-available::before {
      background: linear-gradient(90deg, transparent, #10b981, #34d399, #10b981, transparent);
      box-shadow: 0 0 12px rgba(16,185,129,0.4);
    }

    .slot-card.status-booked::before {
      background: linear-gradient(90deg, transparent, #ef4444, #f87171, #ef4444, transparent);
    }

    .slot-card.status-unavailable::before {
      background: linear-gradient(90deg, transparent, #475569, #64748b, #475569, transparent);
    }

    .slot-card.status-pendingmine::before {
      background: linear-gradient(90deg, transparent, #f59e0b, #fbbf24, #f59e0b, transparent);
      box-shadow: 0 0 12px rgba(245,158,11,0.35);
    }

    /* Available card gets green glow */
    .slot-card.status-available {
      border-color: rgba(16, 185, 129, 0.2);
    }
    .slot-card.status-available:hover {
      border-color: rgba(16, 185, 129, 0.45);
      box-shadow: 0 12px 30px rgba(0,0,0,0.4), 0 0 20px rgba(16,185,129,0.1);
    }

    /* Booked card */
    .slot-card.status-booked { border-color: rgba(239, 68, 68, 0.15); }
    .slot-card.status-booked:hover { border-color: rgba(239, 68, 68, 0.3); }

    /* Pending card */
    .slot-card.status-pendingmine { border-color: rgba(245, 158, 11, 0.2); }

    .slot-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      padding: 18px 18px 0;
      margin-bottom: 12px;
    }

    .slot-time { display: flex; flex-direction: column; }
    .time-main { font-size: 1.4rem; font-weight: 900; color: #ffffff; line-height: 1; }
    .time-range { font-size: 0.75rem; color: #94a3b8; margin-top: 3px; }

    .slot-body {
      padding: 0 18px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
      min-height: 60px;
    }

    .slot-booked-info {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .lock-icon { font-size: 1.2rem; flex-shrink: 0; }

    .slot-booked-info strong { color: #f87171; font-size: 0.92rem; display: block; }

    .booked-phone-badge {
      font-size: 0.76rem;
      color: #60a5fa;
      margin-top: 3px;
    }

    .continuous-tag {
      display: inline-block;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-top: 4px;
    }

    .slot-unavailable-reason {
      color: #64748b;
      font-size: 0.83rem;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .slot-user-pending {
      color: #fbbf24;
      font-weight: 700;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .slot-pending-count {
      color: #60a5fa;
      font-size: 0.82rem;
      font-weight: 600;
    }

    .slot-free-note {
      color: #34d399;
      font-size: 0.82rem;
    }

    .slot-footer {
      padding: 14px 18px 18px;
    }

    .btn-slot {
      width: 100%;
      padding: 11px;
      font-size: 0.9rem;
      font-weight: 700;
      border-radius: 12px;
      letter-spacing: 0.01em;
    }

    .booked-actions-group { display: flex; flex-direction: column; gap: 6px; }
    .btn-pending-slot { color: #fbbf24 !important; border-color: rgba(245, 158, 11, 0.3) !important; }

    /* === Modal styles (inside component) === */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 22px;
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .modal-header h2 { margin: 0; font-size: 1.3rem; color: #ffffff; }

    .btn-close-modal {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 1.1rem;
      cursor: pointer;
      width: 34px; height: 34px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .btn-close-modal:hover { background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239,68,68,0.3); }

    .booking-summary-box {
      background: rgba(16, 185, 129, 0.07);
      border: 1px solid rgba(16, 185, 129, 0.18);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.88rem;
      color: #94a3b8;
    }
    .summary-row strong { color: #ffffff; font-weight: 700; }

    .auth-warning-box {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.28);
      padding: 16px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 20px;
      color: #fbbf24;
      font-size: 0.9rem;
    }

    .warning-actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 12px;
    }

    /* Booker section */
    .booker-section {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 16px;
      border-radius: 14px;
      margin-bottom: 20px;
    }

    .booker-main-label { color: #34d399; font-weight: 800; font-size: 0.92rem; margin-bottom: 12px; }

    .booker-mode-toggle {
      display: flex;
      gap: 6px;
      background: rgba(0, 0, 0, 0.3);
      padding: 5px;
      border-radius: 12px;
      margin-bottom: 14px;
    }

    .b-toggle-btn {
      flex: 1;
      padding: 8px 6px;
      background: none;
      border: none;
      color: #94a3b8;
      font-weight: 700;
      font-size: 0.8rem;
      border-radius: 9px;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }

    .b-toggle-btn.active {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .booker-form-card {
      background: rgba(0, 0, 0, 0.22);
      padding: 14px;
      border-radius: 10px;
    }

    .self-card { color: #cbd5e1; font-size: 0.9rem; border-right: 3px solid #10b981; }

    .user-booking-identity-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 78, 59, 0.18));
      border: 1px solid rgba(16, 185, 129, 0.28);
      border-radius: 14px;
      padding: 14px 18px;
    }

    .user-id-icon {
      font-size: 1.8rem;
      background: rgba(16, 185, 129, 0.18);
      border-radius: 12px;
      width: 46px; height: 46px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .user-id-details { display: flex; flex-direction: column; gap: 4px; }
    .user-id-label { font-size: 0.78rem; color: #94a3b8; }
    .user-id-name { font-size: 1.1rem; color: #ffffff; font-weight: 800; }
    .user-id-sub { font-size: 0.8rem; color: #60a5fa; display: flex; gap: 10px; flex-wrap: wrap; }

    .admin-instant-notice {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 0.83rem;
      color: #fbbf24;
      margin-bottom: 18px;
    }

    /* Duration stepper */
    .duration-section { margin-bottom: 18px; }

    .duration-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 6px;
    }

    .duration-time-span {
      background: rgba(56, 189, 248, 0.1);
      padding: 4px 12px;
      border-radius: 8px;
      border: 1px solid rgba(56, 189, 248, 0.22);
      color: #38bdf8;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .duration-stepper-box {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      margin-bottom: 14px;
      background: rgba(0, 0, 0, 0.22);
      padding: 16px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .stepper-btn {
      width: 50px; height: 50px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.07);
      color: #ffffff;
      font-size: 1.3rem;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .stepper-btn:hover:not(:disabled) { background: #10b981; border-color: #10b981; transform: scale(1.08); }
    .stepper-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    .stepper-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 110px;
    }

    .stepper-number { font-size: 2.4rem; font-weight: 900; color: #34d399; line-height: 1; }
    .stepper-unit { font-size: 0.82rem; color: #94a3b8; margin-top: 3px; }

    /* Duration chips */
    .duration-chips {
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .d-chip {
      padding: 5px 12px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.09);
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 700;
      font-family: inherit;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .d-chip:hover { background: rgba(255, 255, 255, 0.1); color: #ffffff; }
    .d-chip.active { background: rgba(16, 185, 129, 0.18); border-color: #10b981; color: #34d399; }

    /* Type selector */
    .type-selector { display: flex; flex-direction: column; gap: 8px; }

    .type-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.09);
      padding: 12px 16px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .type-card.active { border-color: #10b981; background: rgba(16, 185, 129, 0.08); }
    .type-card input { margin-top: 3px; flex-shrink: 0; }
    .type-card strong { display: block; font-size: 0.92rem; color: #ffffff; margin-bottom: 2px; }
    .type-card p { font-size: 0.8rem; color: #94a3b8; margin: 0; }

    /* Price banner */
    .total-price-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.1));
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }
    .price-details { display: flex; flex-direction: column; gap: 2px; color: #94a3b8; font-size: 0.85rem; }
    .total-calc { font-size: 0.78rem; color: #64748b; }
    .total-amount { font-size: 1.8rem; font-weight: 900; color: #34d399; }

    .modal-actions { display: flex; gap: 10px; }
    .modal-body { margin-bottom: 4px; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .modal-inline-error {
      background: rgba(239, 68, 68, 0.13);
      border: 1px solid rgba(239, 68, 68, 0.38);
      color: #fca5a5;
      padding: 10px 14px;
      border-radius: 10px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.88rem;
      font-weight: 700;
      animation: shake 0.25s ease-in-out;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .btn-close-error { background: none; border: none; color: #fca5a5; cursor: pointer; font-size: 1rem; }

    .btn-close {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 1rem;
      opacity: 0.7;
    }
    .btn-close:hover { opacity: 1; }

    /* === RESPONSIVE === */
    @media (max-width: 768px) {
      .slots-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
      .page-header { flex-direction: column; }
      .header-content h1 { font-size: 1.5rem; }
      .grid-2 { grid-template-columns: 1fr; }
      .modal-actions { flex-direction: column; }
    }

    @media (max-width: 480px) {
      .slots-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
      .slot-card { min-height: 170px; }
      .time-main { font-size: 1.1rem; }
    }

    @media (max-width: 360px) {
      .slots-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ScheduleComponent implements OnInit, OnDestroy {
  private bookingService = inject(BookingService);
  private pitchService = inject(PitchService);
  public authService = inject(AuthService);
  public realtimeService = inject(RealtimeService);

  // Angular Signals for State Management
  public selectedDateSignal = signal<string>('');
  public dayScheduleSignal = signal<DaySchedule | null>(null);
  public loadingSignal = signal<boolean>(false);
  public alertMessageSignal = signal<string>('');
  public alertTypeSignal = signal<string>('alert-success');
  public modalErrorSignal = signal<string>('');

  // Status Filter State (Interactive Legend / Tabs)
  public selectedStatusFilterSignal = signal<string>('ALL');

  public availableCount = computed(() => this.dayScheduleSignal()?.slots.filter(s => s.status === 'Available').length ?? 0);
  public bookedCount = computed(() => this.dayScheduleSignal()?.slots.filter(s => s.status === 'Booked').length ?? 0);
  public pendingCount = computed(() => this.dayScheduleSignal()?.slots.filter(s => s.status === 'PendingMine').length ?? 0);
  public unavailableCount = computed(() => this.dayScheduleSignal()?.slots.filter(s => s.status === 'Unavailable').length ?? 0);

  public filteredSlots = computed(() => {
    const sched = this.dayScheduleSignal();
    if (!sched || !sched.slots) return [];
    const filter = this.selectedStatusFilterSignal();
    if (filter === 'ALL') return sched.slots;
    return sched.slots.filter(s => s.status.toLowerCase() === filter.toLowerCase());
  });

  setStatusFilter(filter: string): void {
    this.selectedStatusFilterSignal.set(filter);
  }

  quickDays: Array<{ date: string; label: string; formatted: string }> = [];

  // Available registered users for selection
  registeredUsers: UserProfile[] = [];

  // Booking Modal State
  showModal = false;
  selectedSlot: ScheduleSlot | null = null;
  bookingDuration = 1;
  bookingType: BookingType = BookingType.Weekly;
  bookingNotes = '';
  submitting = false;

  // Booker identity mode
  bookerMode: 'self' | 'user' | 'custom' = 'self';
  selectedTargetUserId: number | null = null;
  customContactName: string = '';
  customContactPhone: string = '';

  // Admin Slot Deletion State
  showDeleteSlotModal = false;
  deleteTargetSlot: ScheduleSlot | null = null;
  isDeletingSlot = false;

  private subscriptions = new Subscription();

  ngOnInit(): void {
    this.initQuickDays();
    const initialDate = this.quickDays[0]?.date || this.formatDate(new Date());
    this.selectedDateSignal.set(initialDate);
    this.loadSchedule(initialDate);
    this.loadRegisteredUsers();

    // Live Real-Time Subscriptions: Update Signals instantly when events occur
    this.subscriptions.add(
      this.realtimeService.bookingUpdated$.subscribe((ev) => {
        if (!ev.date || ev.date === this.selectedDateSignal()) {
          this.loadSchedule(this.selectedDateSignal());
        }
      })
    );

    this.subscriptions.add(
      this.realtimeService.unavailableSlotsUpdated$.subscribe((ev) => {
        if (!ev.date || ev.date === this.selectedDateSignal()) {
          this.loadSchedule(this.selectedDateSignal());
        }
      })
    );

    this.subscriptions.add(
      this.realtimeService.settingsUpdated$.subscribe(() => {
        this.loadSchedule(this.selectedDateSignal());
      })
    );

    this.subscriptions.add(
      this.realtimeService.userUpdated$.subscribe(() => {
        this.loadRegisteredUsers();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadRegisteredUsers(): void {
    if (!this.authService.isAuthenticated()) return;
    this.pitchService.getActiveUsersForBooking().subscribe({
      next: (users) => {
        this.registeredUsers = users;
      },
      error: () => {}
    });
  }

  initQuickDays(): void {
    const labels = ['اليوم', 'غداً', 'بعد غد'];
    const culture = 'ar-EG';

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);

      const dateStr = this.formatDate(d);
      const dayName = i < labels.length ? labels[i] : d.toLocaleDateString(culture, { weekday: 'long' });
      const formatted = d.toLocaleDateString(culture, { month: 'numeric', day: 'numeric' });

      this.quickDays.push({
        date: dateStr,
        label: dayName,
        formatted
      });
    }
  }

  onDateChange(newDate: string): void {
    this.selectedDateSignal.set(newDate);
    this.loadSchedule(newDate);
  }

  loadSchedule(date: string): void {
    this.loadingSignal.set(true);
    this.bookingService.getDaySchedule(date).subscribe({
      next: (schedule) => {
        this.dayScheduleSignal.set(schedule);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.loadingSignal.set(false);
      }
    });
  }

  setBookerMode(mode: 'self' | 'user' | 'custom'): void {
    this.bookerMode = mode;
  }

  openBookingModal(slot: ScheduleSlot): void {
    this.selectedSlot = slot;
    this.bookingDuration = 1;
    this.bookingType = BookingType.Weekly;
    this.bookingNotes = '';
    this.customContactName = '';
    this.customContactPhone = '';
    this.selectedTargetUserId = null;
    this.modalErrorSignal.set('');

    if (this.authService.isAdmin()) {
      this.bookerMode = 'user'; // Owner defaults to selecting a user or typing custom
      this.loadRegisteredUsers();
    } else {
      this.bookerMode = 'self';
    }

    this.showModal = true;
  }

  closeBookingModal(): void {
    this.showModal = false;
    this.selectedSlot = null;
    this.modalErrorSignal.set('');
  }

  // Duration Helper Methods & Stepper
  get maxAvailableHours(): number {
    const closeHour = this.dayScheduleSignal()?.closeHour || 24;
    const startHour = this.selectedSlot?.hour || 0;
    return Math.max(1, closeHour - startHour);
  }

  get durationHoursList(): number[] {
    const max = Math.min(this.maxAvailableHours, 8);
    const list: number[] = [];
    for (let i = 1; i <= max; i++) {
      list.push(i);
    }
    return list;
  }

  incrementDuration(): void {
    if (this.bookingDuration < this.maxAvailableHours) {
      this.bookingDuration++;
    }
  }

  decrementDuration(): void {
    if (this.bookingDuration > 1) {
      this.bookingDuration--;
    }
  }

  setDuration(h: number): void {
    this.bookingDuration = Math.min(Math.max(1, h), this.maxAvailableHours);
  }

  getDurationUnitArabic(h: number): string {
    if (h === 1) return 'ساعة واحدة';
    if (h === 2) return 'ساعتان';
    if (h >= 3 && h <= 10) return 'ساعات';
    return 'ساعة';
  }

  get totalCalculatedPrice(): number {
    const rate = this.dayScheduleSignal()?.hourlyRate || 160;
    return rate * this.bookingDuration;
  }

  submitBooking(): void {
    if (!this.selectedSlot) return;

    // فقط الأدمن هو من يملك خيارات تحديد لاعب آخر أو تسجيل اسم ورقم شخص خارجي
    if (this.authService.isAdmin()) {
      if (this.bookerMode === 'user' && !this.selectedTargetUserId) {
        this.modalErrorSignal.set('يرجى اختيار اللاعب المسجل من القائمة.');
        return;
      }

      if (this.bookerMode === 'custom' && (!this.customContactName || !this.customContactPhone)) {
        this.modalErrorSignal.set('يرجى إدخال اسم ورقم هاتف صاحب الحجز.');
        return;
      }
    }

    this.submitting = true;
    const request: CreateBookingRequest = {
      bookingDate: this.selectedDateSignal(),
      startHour: this.selectedSlot.hour,
      durationHours: this.bookingDuration,
      type: this.bookingType,
      notes: this.bookingNotes
    };

    if (this.authService.isAdmin()) {
      if (this.bookerMode === 'user' && this.selectedTargetUserId) {
        request.targetUserId = this.selectedTargetUserId;
      } else if (this.bookerMode === 'custom') {
        request.customContactName = this.customContactName;
        request.customContactPhone = this.customContactPhone;
      }
    }

    this.bookingService.requestBooking(request).subscribe({
      next: (res) => {
        this.submitting = false;
        this.closeBookingModal();
        this.alertTypeSignal.set('alert-success');
        this.alertMessageSignal.set(res.message);
        // Instant reload (signal will also get broadcast event)
        this.loadSchedule(this.selectedDateSignal());
      },
      error: (err) => {
        this.submitting = false;
        this.alertTypeSignal.set('alert-danger');
        this.alertMessageSignal.set(err.error?.message || 'تعذر إرسال طلب الحجز، يرجى المحاولة لاحقاً.');
      }
    });
  }

  // Admin Slot Deletion Handlers
  openDeleteSlotModal(slot: ScheduleSlot): void {
    if (!slot.confirmedBookingId) {
      this.alertTypeSignal.set('alert-danger');
      this.alertMessageSignal.set('معرّف الحجز غير متاح لهذا الموعد.');
      return;
    }
    this.deleteTargetSlot = slot;
    this.showDeleteSlotModal = true;
  }

  closeDeleteSlotModal(): void {
    this.showDeleteSlotModal = false;
    this.deleteTargetSlot = null;
    this.isDeletingSlot = false;
  }

  confirmDeleteSlot(): void {
    if (!this.deleteTargetSlot || !this.deleteTargetSlot.confirmedBookingId) return;
    const bookingId = this.deleteTargetSlot.confirmedBookingId;
    this.isDeletingSlot = true;

    this.bookingService.deleteBooking(bookingId).subscribe({
      next: (res) => {
        this.isDeletingSlot = false;
        this.closeDeleteSlotModal();
        this.alertTypeSignal.set('alert-success');
        this.alertMessageSignal.set(res.message);
        this.loadSchedule(this.selectedDateSignal());
      },
      error: (err) => {
        this.isDeletingSlot = false;
        this.alertTypeSignal.set('alert-danger');
        this.alertMessageSignal.set(err.error?.message || 'تعذر حذف الحجز.');
      }
    });
  }

  formatHourLabel(hour: number): string {
    if (hour === 0 || hour === 24) return '12:00 منتصف الليل';
    if (hour < 12) return `${hour}:00 صباحاً`;
    if (hour === 12) return '12:00 ظهراً';
    return `${hour - 12}:00 مساءً`;
  }

  getBadgeClass(status: string): string {
    switch (status) {
      case 'Available': return 'badge-available';
      case 'Booked': return 'badge-booked';
      case 'Unavailable': return 'badge-unavailable';
      case 'PendingMine': return 'badge-pending';
      default: return '';
    }
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
