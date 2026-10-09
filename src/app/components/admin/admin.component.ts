import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PitchService } from '../../services/pitch.service';
import { BookingService } from '../../services/booking.service';
import { RealtimeService } from '../../services/realtime.service';
import { PitchSetting, UnavailableSlot } from '../../models/pitch.models';
import { UserProfile } from '../../models/auth.models';
import { Booking, BookingStatus, PitchFinancialReport, AttendanceStatus, PaymentStatus } from '../../models/booking.models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="container">
        <!-- Dashboard Header -->
        <div class="admin-header">
          <div class="header-flex">
            <div>
              <div class="admin-title-badge">
                <span>👑 لوحة تحكم صاحب الملعب</span>
              </div>
              <h1>إدارة وتشغيل ملعب النجوم</h1>
              <p>إدارة طلبات الحجز المعلقة، تفعيل حسابات اللاعبين الجدد، وضبط ساعات العمل والأسعار</p>
            </div>

            <!-- Live Status Indicator -->
            <div class="live-pill" [class.connected]="realtimeService.isConnectedSignal()">
              <span class="pulse-dot"></span>
              <span>{{ realtimeService.isConnectedSignal() ? 'تحديث حي فوري (Live Signal)' : 'جاري الاتصال...' }}</span>
            </div>
          </div>
        </div>

        <!-- Quick Admin KPI Metrics Strip -->
        <div class="admin-quick-kpis glass-panel">
          <div class="kpi-mini-card">
            <span class="kpi-icon-badge green">⚡</span>
            <div class="kpi-info-box">
              <strong class="kpi-val">{{ pendingRequestsSignal().length }}</strong>
              <span class="kpi-lbl">طلبات حجز بانتظار الاعتماد</span>
            </div>
          </div>
          <div class="kpi-mini-sep"></div>
          <div class="kpi-mini-card">
            <span class="kpi-icon-badge gold">👥</span>
            <div class="kpi-info-box">
              <strong class="kpi-val">{{ pendingUsersSignal().length }}</strong>
              <span class="kpi-lbl">لاعبين يحتاجون تفعيل</span>
            </div>
          </div>
          <div class="kpi-mini-sep"></div>
          <div class="kpi-mini-card">
            <span class="kpi-icon-badge blue">💵</span>
            <div class="kpi-info-box">
              <strong class="kpi-val">{{ settingsSignal()?.hourlyRate || 130 }} ج.م</strong>
              <span class="kpi-lbl">سعر الساعة الرسمي</span>
            </div>
          </div>
          <div class="kpi-mini-sep"></div>
          <div class="kpi-mini-card">
            <span class="kpi-icon-badge purple">🏟️</span>
            <div class="kpi-info-box">
              <strong class="kpi-val">{{ allUsersSignal().length }}</strong>
              <span class="kpi-lbl">إجمالي لاعبي المنصة</span>
            </div>
          </div>
        </div>

        <!-- Alert Notification -->
        <div *ngIf="alertMessageSignal()" class="alert-box" [ngClass]="alertTypeSignal()">
          <span>{{ alertMessageSignal() }}</span>
          <button (click)="alertMessageSignal.set('')" class="btn-close">✕</button>
        </div>

        <!-- Modern Admin Segmented Navigation Tabs -->
        <div class="admin-nav-tabs glass-panel">
          <button 
            type="button" 
            class="admin-tab-btn" 
            [class.active]="activeTab === 'requests'" 
            (click)="switchTab('requests')"
            title="طلبات الحجز المعلقة بالأسبقية">
            <span class="tab-icon">⚡</span>
            <div class="tab-text-wrap">
              <span class="tab-main-title">الطلبات المعلقة</span>
              <span class="tab-sub-hint">أسبقية التقديم</span>
            </div>
            <span *ngIf="pendingRequestsSignal().length > 0" class="counter-badge pulse-badge">
              {{ pendingRequestsSignal().length }}
            </span>
          </button>

          <button 
            type="button" 
            class="admin-tab-btn" 
            [class.active]="activeTab === 'users'" 
            (click)="switchTab('users')"
            title="تفعيل حسابات اللاعبين الجدد">
            <span class="tab-icon">👥</span>
            <div class="tab-text-wrap">
              <span class="tab-main-title">تفعيل اللاعبين</span>
              <span class="tab-sub-hint">حسابات جديدة</span>
            </div>
            <span *ngIf="pendingUsersSignal().length > 0" class="counter-badge badge-gold">
              {{ pendingUsersSignal().length }}
            </span>
          </button>

          <button 
            type="button" 
            class="admin-tab-btn" 
            [class.active]="activeTab === 'settings'" 
            (click)="switchTab('settings')"
            title="إعدادات الملعب وسعر الساعة">
            <span class="tab-icon">⚙️</span>
            <div class="tab-text-wrap">
              <span class="tab-main-title">إعدادات الملعب</span>
              <span class="tab-sub-hint">الأسعار والمواعيد</span>
            </div>
          </button>

          <button 
            type="button" 
            class="admin-tab-btn" 
            [class.active]="activeTab === 'unavailable'" 
            (click)="switchTab('unavailable')"
            title="ساعات الإغلاق والصيانة">
            <span class="tab-icon">🚫</span>
            <div class="tab-text-wrap">
              <span class="tab-main-title">أوقات الصيانة</span>
              <span class="tab-sub-hint">إغلاق المواعيد</span>
            </div>
          </button>

          <button 
            type="button" 
            class="admin-tab-btn" 
            [class.active]="activeTab === 'history'" 
            (click)="switchTab('history')"
            title="سجل الحجوزات وإدارة الحضور">
            <span class="tab-icon">📜</span>
            <div class="tab-text-wrap">
              <span class="tab-main-title">سجل الحجوزات</span>
              <span class="tab-sub-hint">الحضور والسداد</span>
            </div>
          </button>

          <button 
            type="button" 
            class="admin-tab-btn" 
            [class.active]="activeTab === 'reports'" 
            (click)="switchTab('reports')"
            title="التقارير المالية والإحصائية">
            <span class="tab-icon">📊</span>
            <div class="tab-text-wrap">
              <span class="tab-main-title">التقارير المالية</span>
              <span class="tab-sub-hint">الأرباح والتحليل</span>
            </div>
          </button>
        </div>

        <!-- TAB 1: PENDING BOOKING REQUESTS (FIFO) -->
        <div *ngIf="activeTab === 'requests'" class="tab-pane">
          <div class="pane-header">
            <div>
              <h2>طلبات الحجز بانتظار الموافقة</h2>
              <p class="fifo-explainer">
                ⚡ <strong>نظام الأسبقية الزمني:</strong> الطلبات مرتبة بحيث من قام بالحجز أولاً يظهر في المقدمة أولاً مع بيان توقيت الطلب بالثانية.
              </p>
            </div>
            <button (click)="loadPendingRequests()" class="btn-secondary btn-sm">تحديث يدوي 🔄</button>
          </div>

          <div *ngIf="loadingRequestsSignal()" class="loading-state">
            <div class="spinner"></div>
            <p>جاري جلب الطلبات في الحال...</p>
          </div>

          <div *ngIf="!loadingRequestsSignal() && pendingRequestsSignal().length === 0" class="empty-state glass-panel">
            <div class="empty-icon">✅</div>
            <h3>لا توجد طلبات حجز معلقة حالياً</h3>
            <p>جميع الطلبات تم البت فيها والموافقة عليها أو رفضها.</p>
          </div>

          <div *ngIf="!loadingRequestsSignal() && pendingRequestsSignal().length > 0" class="requests-list">
            <div *ngFor="let req of pendingRequestsSignal(); let i = index" class="request-card glass-panel">
              <div class="request-header">
                <div class="priority-rank">
                  <span class="rank-number">#{{ i + 1 }}</span>
                  <div class="request-time-badge">
                    <span>توقيت الحجز: {{ formatDateTime(req.createdAt) }}</span>
                    <strong class="fifo-tag">أولوية أسبقية التقديم</strong>
                  </div>
                </div>

                <div class="slot-badge-info">
                  <span class="booking-date-badge">📅 {{ req.bookingDate }}</span>
                  <span class="booking-hour-badge">⏰ من {{ req.startHour }}:00 إلى {{ req.endHour }}:00 ({{ req.durationHours }} ساعة)</span>
                </div>
              </div>

              <!-- User & Match Details -->
              <div class="request-content">
                <div class="user-info-grid">
                  <div class="info-block">
                    <span class="block-label">👤 صاحب الحجز:</span>
                    <strong>{{ req.bookedForName || req.userFullName }}</strong>
                    <span *ngIf="req.userFullName && req.userFullName !== req.bookedForName" class="sub-booked-by" style="display:block; font-size:0.8rem; color:#94a3b8;">
                      (طلب بواسطة: {{ req.userFullName }})
                    </span>
                  </div>

                  <div class="info-block">
                    <span class="block-label">📞 هاتف صاحب الحجز:</span>
                    <a [href]="'tel:' + (req.bookedForPhone || req.userPhoneNumber)" class="phone-link">{{ req.bookedForPhone || req.userPhoneNumber }}</a>
                  </div>

                  <div class="info-block">
                    <span class="block-label">📍 العنوان بالقرية:</span>
                    <span>{{ req.userAddress }}</span>
                  </div>

                  <div class="info-block">
                    <span class="block-label">🏷️ نوع الحجز:</span>
                    <strong [class.text-gold]="req.type === 1">{{ req.typeName }}</strong>
                  </div>

                  <div class="info-block">
                    <span class="block-label">💰 الإجمالي المطلوب:</span>
                    <strong class="text-green">{{ req.totalPrice }} جنيه</strong>
                  </div>
                </div>

                <div *ngIf="req.notes" class="user-notes-box">
                  <strong>ملاحظات اللاعب:</strong> {{ req.notes }}
                </div>
              </div>

              <!-- Owner Action Buttons -->
              <div class="request-actions">
                <div class="action-hint">
                  بمجرد الموافقة، سيتم حجز هذه الساعة للملعب ورفض أي طلبات متداخلة منافسة تلقائياً.
                </div>
                <div class="action-btns">
                  <button type="button" (click)="approveBooking(req)" class="btn-primary" [disabled]="actionInProgress !== null">
                    <span *ngIf="actionInProgress === req.id">جاري التأكيد... ⏳</span>
                    <span *ngIf="actionInProgress !== req.id">✔️ موافقة وتأكيد الحجز</span>
                  </button>
                  <button type="button" (click)="openRejectModal(req)" class="btn-secondary" [disabled]="actionInProgress !== null">
                    <span>❌ رفض الطلب</span>
                  </button>
                  <button type="button" (click)="openDeleteModal(req)" class="btn-danger" [disabled]="actionInProgress !== null" title="حذف هذا الطلب نهائياً">
                    <span>🗑️ حذف</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: PENDING USER REGISTRATIONS -->
        <div *ngIf="activeTab === 'users'" class="tab-pane">
          <div class="pane-header">
            <div>
              <h2>مراجعة وتأكيد حسابات اللاعبين الجدد</h2>
              <p>حسابات المستخدمين تظل غير نشطة ولا يمكنهم الحجز حتى تقوم بتأكيدها هنا</p>
            </div>
            <button (click)="loadUsers()" class="btn-secondary btn-sm">تحديث القائمة 🔄</button>
          </div>

          <!-- Pending users section -->
          <div class="section-subheading">
            <h3>⏳ طلبات التسجيل المعلقة بانتظار التأكيد ({{ pendingUsersSignal().length }})</h3>
          </div>

          <div *ngIf="pendingUsersSignal().length === 0" class="empty-state glass-panel">
            <div class="empty-icon">🎉</div>
            <h3>لا توجد حسابات معلقة</h3>
            <p>جميع اللاعبين المسجلين تم تأكيدهم بالفعل.</p>
          </div>

          <div *ngIf="pendingUsersSignal().length > 0" class="users-grid">
            <div *ngFor="let u of pendingUsersSignal()" class="user-card glass-panel user-pending-card">
              <div class="user-card-header">
                <div class="user-avatar-lg">{{ u.fullName.slice(0, 1) }}</div>
                <div>
                  <h4 class="user-card-name">{{ u.fullName }}</h4>
                  <span class="user-card-username">&#64;{{ u.username }}</span>
                </div>
                <span class="badge badge-pending">غير نشط</span>
              </div>

              <div class="user-card-details">
                <div class="u-detail">
                  <span class="label">✉️ البريد الإلكتروني:</span>
                  <span>{{ u.email }}</span>
                </div>
                <div class="u-detail">
                  <span class="label">📱 رقم الهاتف:</span>
                  <a [href]="'tel:' + u.phoneNumber" class="phone-link">{{ u.phoneNumber }}</a>
                </div>
                <div class="u-detail">
                  <span class="label">🏠 العنوان بالقرية:</span>
                  <span>{{ u.address }}</span>
                </div>
                <div class="u-detail">
                  <span class="label">📅 تاريخ التسجيل:</span>
                  <small>{{ formatDateTime(u.createdAt) }}</small>
                </div>
              </div>

              <div class="user-card-action">
                <button (click)="activateUser(u)" class="btn-primary btn-block">
                  <span>✅ تأكيد وتفعيل الحساب الآن</span>
                </button>
              </div>
            </div>
          </div>

          <!-- All Registered Users section -->
          <div class="section-subheading" style="margin-top: 40px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <h3>📋 دليل اللاعبين المسجلين في المنصة ({{ allUsersSignal().length }})</h3>
            <div style="display: flex; gap: 10px;">
              <span class="badge badge-available">🟢 {{ activeUsersCount }} نشط</span>
              <span class="badge badge-gold">⏳ {{ pendingUsersSignal().length }} بانتظار التفعيل</span>
            </div>
          </div>

          <!-- Search & Filter Controls -->
          <div class="users-search-bar glass-panel" style="margin-bottom: 20px; padding: 14px 18px; display: flex; gap: 14px; flex-wrap: wrap; align-items: center;">
            <div style="flex: 1; min-width: 250px;">
              <input 
                type="text" 
                class="form-input" 
                [(ngModel)]="userSearchTerm" 
                placeholder="🔍 ابحث باسم اللاعب، رقم الهاتف، اسم المستخدم، أو عنوان القرية..." />
            </div>
            <div class="filter-modes">
              <button 
                type="button" 
                class="filter-chip" 
                [class.active]="userFilterStatus === 'all'" 
                (click)="userFilterStatus = 'all'">
                الكل ({{ allUsersSignal().length }})
              </button>
              <button 
                type="button" 
                class="filter-chip" 
                [class.active]="userFilterStatus === 'active'" 
                (click)="userFilterStatus = 'active'">
                المفعلون فقط ({{ activeUsersCount }})
              </button>
              <button 
                type="button" 
                class="filter-chip" 
                [class.active]="userFilterStatus === 'pending'" 
                (click)="userFilterStatus = 'pending'">
                المعلقون ({{ pendingUsersSignal().length }})
              </button>
            </div>
          </div>

          <div *ngIf="filteredUsers.length === 0" class="empty-substate glass-panel" style="padding: 30px; text-align: center; margin-bottom: 20px;">
            <span>لا توجد نتائج تطابق معايير البحث الحالية.</span>
          </div>

          <div *ngIf="filteredUsers.length > 0" class="users-table-wrapper glass-panel">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>الاسم الكامل</th>
                  <th>اسم المستخدم</th>
                  <th>رقم الهاتف</th>
                  <th>العنوان بالقرية</th>
                  <th>تاريخ التسجيل</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let u of filteredUsers">
                  <td>
                    <strong>{{ u.fullName }}</strong>
                  </td>
                  <td><code style="color: #38bdf8;">&#64;{{ u.username }}</code></td>
                  <td>
                    <a [href]="'tel:' + u.phoneNumber" class="phone-link">
                      📱 {{ u.phoneNumber }}
                    </a>
                  </td>
                  <td>{{ u.address }}</td>
                  <td><small>{{ formatDateTime(u.createdAt) }}</small></td>
                  <td>
                    <span class="badge" [ngClass]="u.isActive ? 'badge-available' : 'badge-pending'">
                      {{ u.isActive ? 'نشط ومؤكد' : 'غير نشط' }}
                    </span>
                  </td>
                  <td>
                    <button 
                      *ngIf="!u.isActive" 
                      (click)="activateUser(u)" 
                      class="btn-primary btn-xs">
                      ✅ تفعيل
                    </button>
                    <button 
                      *ngIf="u.isActive" 
                      (click)="deactivateUser(u)" 
                      class="btn-danger btn-xs">
                      🛑 إيقاف
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 3: PITCH SETTINGS & HOURLY RATE -->
        <div *ngIf="activeTab === 'settings'" class="tab-pane settings-tab-pane">
          <div class="settings-container">
            <div class="pane-header settings-header">
              <div class="settings-title-wrap">
                <h2>إعدادات ملعب النجوم وسعر الساعة</h2>
                <p>حدد مواعيد بدء وانتهاء العمل اليومي وسعر الساعة بالجنيه</p>
              </div>
            </div>

            <div class="settings-form-wrapper glass-panel">
            <form (ngSubmit)="saveSettings()">
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">اسم الملعب</label>
                  <input type="text" class="form-input" [(ngModel)]="settingsForm.pitchName" name="pitchName" required />
                </div>

                <div class="form-group">
                  <label class="form-label">💰 سعر الساعة (جنيه مصري) *</label>
                  <input type="number" class="form-input text-green" style="font-size: 1.2rem; font-weight: 800;" [(ngModel)]="settingsForm.hourlyRate" name="hourlyRate" required min="1" />
                </div>
              </div>

              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">⏰ ساعة بدء العمل اليومي (نظام 24 ساعة)</label>
                  <select class="form-select" [(ngModel)]="settingsForm.openHour" name="openHour">
                    <option *ngFor="let h of hourOptions" [value]="h.value">{{ h.label }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">🌙 ساعة انتهاء العمل اليومي (نظام 24 ساعة)</label>
                  <select class="form-select" [(ngModel)]="settingsForm.closeHour" name="closeHour">
                    <option *ngFor="let h of hourOptions" [value]="h.value">{{ h.label }}</option>
                  </select>
                </div>
              </div>

              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">موقع الملعب</label>
                  <input type="text" class="form-input" [(ngModel)]="settingsForm.location" name="location" />
                </div>

                <div class="form-group">
                  <label class="form-label">رقم هاتف الإدارة للتواصل</label>
                  <input type="text" class="form-input" [(ngModel)]="settingsForm.contactPhone" name="contactPhone" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">وصف الملعب ومميزاته</label>
                <textarea class="form-textarea" rows="3" [(ngModel)]="settingsForm.description" name="description"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">تنبيه وتعليمات للاعبين (يظهر بالصفحة الرئيسية)</label>
                <textarea class="form-textarea" rows="2" [(ngModel)]="settingsForm.notice" name="notice"></textarea>
              </div>

              <button type="submit" class="btn-primary btn-block" [disabled]="savingSettings">
                <span *ngIf="savingSettings">جاري حفظ التغييرات...</span>
                <span *ngIf="!savingSettings">💾 حفظ إعدادات وسعر وساعات الملعب</span>
              </button>
            </form>
          </div>
          </div>
        </div>

        <!-- TAB 4: UNAVAILABLE / MAINTENANCE HOURS -->
        <div *ngIf="activeTab === 'unavailable'" class="tab-pane">
          <div class="pane-header">
            <div>
              <h2>تحديد ساعات الإغلاق وعدم عمل الملعب</h2>
              <p>تحديد ساعات معينة بأن الملعب لا يعمل فيها (للصيانة، أو ظروف خاصة لصاحب الملعب)</p>
            </div>
          </div>

          <div class="unavailable-layout">
            <!-- Add new unavailable slot form -->
            <div class="add-slot-form glass-panel">
              <h3>➕ إضافة ساعة إغلاق / صيانة</h3>
              <form (ngSubmit)="addUnavailableSlot()">
                <div class="form-group">
                  <label class="form-label">التاريخ *</label>
                  <input type="date" class="form-input" [(ngModel)]="newUnavailable.date" name="unavDate" required />
                </div>

                <div class="form-group">
                  <label class="form-label">الساعة المراد إغلاقها *</label>
                  <select class="form-select" [(ngModel)]="newUnavailable.hour" name="unavHour">
                    <option *ngFor="let h of hourOptions" [value]="h.value">{{ h.label }}</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">السبب (يظهر للمستخدمين بالجدول)</label>
                  <input type="text" class="form-input" [(ngModel)]="newUnavailable.reason" name="unavReason" placeholder="مثال: صيانة أرضية النجيل / إجازة خاصة" />
                </div>

                <button type="submit" class="btn-primary btn-block">
                  تسجيل الساعة كـ غير متاحة للعمل
                </button>
              </form>
            </div>

            <!-- List of current unavailable slots -->
            <div class="slots-list-wrapper glass-panel">
              <h3>ساعات الإغلاق المسجلة حالياً</h3>
              <div *ngIf="unavailableSlotsSignal().length === 0" class="empty-substate">
                <span>لا توجد ساعات إغلاق مسجلة، الملعب يعمل وفقاً لساعات العمل الطبيعية.</span>
              </div>

              <div *ngIf="unavailableSlotsSignal().length > 0" class="unavailable-slots-list">
                <div *ngFor="let slot of unavailableSlotsSignal()" class="unav-item">
                  <div class="unav-meta">
                    <strong class="unav-date">{{ slot.date }}</strong>
                    <span class="unav-time">{{ formatHour(slot.hour) }} ({{ slot.hour }}:00 - {{ slot.hour + 1 }}:00)</span>
                    <span class="unav-reason">{{ slot.reason }}</span>
                  </div>
                  <button (click)="removeUnavailableSlot(slot.id)" class="btn-danger btn-xs" title="إعادة فتح وإتاحة الساعة">
                    إعادة الفتح 🔓
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 5: CONFIRMED BOOKINGS HISTORY -->
        <div *ngIf="activeTab === 'history'" class="tab-pane history-tab-pane">
          <!-- Pane Header -->
          <div class="pane-header">
            <div>
              <h2>سجل الحجوزات والمباريات المؤكدة</h2>
              <p>استعراض، تصفية، وإدارة حضور وسداد جميع المواعيد المعتمدة لملعب النجوم</p>
            </div>
            <button (click)="loadConfirmedBookings()" class="btn-secondary btn-sm" [disabled]="loadingHistorySignal()" title="تحديث القائمة الآن">
              <span *ngIf="loadingHistorySignal()">جاري التحديث... ⏳</span>
              <span *ngIf="!loadingHistorySignal()">تحديث السجل 🔄</span>
            </button>
          </div>

          <!-- Empty state if no bookings overall -->
          <div *ngIf="confirmedBookingsSignal().length === 0 && !loadingHistorySignal()" class="empty-state glass-panel">
            <div class="empty-icon">⚽</div>
            <h3>لا توجد حجوزات مؤكدة مسجلة بعد</h3>
            <p>عندما تقوم باعتماد طلبات الحجز من تبويب "الطلبات المعلقة"، ستظهر المباريات هنا تلقائياً.</p>
          </div>

          <div *ngIf="confirmedBookingsSignal().length > 0">
            <!-- Quick History Statistics KPI Strip -->
            <div class="history-kpis-strip">
              <div class="history-kpi-card" 
                   [class.active]="historyAttendanceFilter() === 'all'" 
                   (click)="setHistoryAttendanceFilter('all')" 
                   title="عرض جميع الحجوزات">
                <div class="kpi-icon-box blue">📋</div>
                <div class="kpi-info-box">
                  <strong class="kpi-num">{{ historyStats().totalBookings }}</strong>
                  <span class="kpi-name">إجمالي المؤكدة</span>
                </div>
              </div>

              <div class="history-kpi-card" 
                   [class.active]="historyAttendanceFilter() === 'pending'" 
                   (click)="setHistoryAttendanceFilter('pending')" 
                   title="تصفية حسب الحجوزات بانتظار الموعد">
                <div class="kpi-icon-box gold">⏳</div>
                <div class="kpi-info-box">
                  <strong class="kpi-num">{{ historyStats().pendingAttendanceCount }}</strong>
                  <span class="kpi-name">بانتظار الموعد</span>
                </div>
              </div>

              <div class="history-kpi-card" 
                   [class.active]="historyAttendanceFilter() === 'attended'" 
                   (click)="setHistoryAttendanceFilter('attended')" 
                   title="تصفية حسب اللاعبين الذين حضروا">
                <div class="kpi-icon-box green">✅</div>
                <div class="kpi-info-box">
                  <strong class="kpi-num">{{ historyStats().attendedCount }}</strong>
                  <span class="kpi-name">حضر ولعب</span>
                </div>
              </div>

              <div class="history-kpi-card" 
                   [class.active]="historyAttendanceFilter() === 'noshow'" 
                   (click)="setHistoryAttendanceFilter('noshow')" 
                   title="تصفية حسب الغياب (No-Show)">
                <div class="kpi-icon-box red">❌</div>
                <div class="kpi-info-box">
                  <strong class="kpi-num">{{ historyStats().noShowCount }}</strong>
                  <span class="kpi-name">لم يحضر (غياب)</span>
                </div>
              </div>

              <div class="history-kpi-card money-card" title="إجمالي المستحقات والتحصيل المالي">
                <div class="kpi-icon-box purple">💰</div>
                <div class="kpi-info-box">
                  <strong class="kpi-num">{{ historyStats().totalExpected }} ج.م</strong>
                  <span class="kpi-name">المحصل: <strong class="text-green">{{ historyStats().totalCollected }} ج.م</strong></span>
                </div>
              </div>
            </div>

            <!-- Modern Toolbar: Search, Filters & Sort -->
            <div class="history-toolbar glass-panel">
              <div class="toolbar-search-wrap">
                <span class="search-lens">🔍</span>
                <input 
                  type="text" 
                  class="form-input search-field" 
                  placeholder="بحث باسم اللاعب، الهاتف، أو التاريخ..." 
                  [ngModel]="historySearch()" 
                  (ngModelChange)="onHistorySearchChange($event)" />
                <button *ngIf="historySearch()" type="button" class="btn-clear-term" (click)="onHistorySearchChange('')">✕</button>
              </div>

              <div class="toolbar-filters-wrap">
                <!-- Date Filter -->
                <div class="tool-filter-group">
                  <label class="tool-label">📅 التاريخ:</label>
                  <input 
                    type="date" 
                    class="form-input date-picker" 
                    [ngModel]="historyDate()" 
                    (ngModelChange)="onHistoryDateChange($event)" />
                </div>

                <!-- Attendance Filter -->
                <div class="tool-filter-group">
                  <label class="tool-label">🎯 الحضور:</label>
                  <select 
                    class="form-select tool-select" 
                    [ngModel]="historyAttendanceFilter()" 
                    (ngModelChange)="setHistoryAttendanceFilter($event)">
                    <option value="all">جميع الحالات</option>
                    <option value="pending">⏳ بانتظار الموعد</option>
                    <option value="attended">✅ حضر للملعب</option>
                    <option value="noshow">❌ لم يحضر (غياب)</option>
                  </select>
                </div>

                <!-- Payment Filter -->
                <div class="tool-filter-group">
                  <label class="tool-label">💳 الدفع:</label>
                  <select 
                    class="form-select tool-select" 
                    [ngModel]="historyPaymentFilter()" 
                    (ngModelChange)="onHistoryPaymentChange($event)">
                    <option value="all">جميع الحالات</option>
                    <option value="full">💰 مدفوع بالكامل</option>
                    <option value="partial">💵 مدفوع جزئياً</option>
                    <option value="unpaid">⚠️ غير مدفوع</option>
                  </select>
                </div>

                <!-- Sort Field -->
                <div class="tool-filter-group">
                  <label class="tool-label">🔃 الترتيب:</label>
                  <select 
                    class="form-select tool-select" 
                    [ngModel]="historySort()" 
                    (ngModelChange)="onHistorySortChange($event)">
                    <option value="date-desc">التاريخ (الأحدث أولاً)</option>
                    <option value="date-asc">التاريخ (الأقدم أولاً)</option>
                    <option value="price-desc">المبلغ (الأعلى أولاً)</option>
                  </select>
                </div>

                <!-- Reset Button -->
                <button 
                  *ngIf="hasActiveHistoryFilters()" 
                  type="button" 
                  class="btn-reset-filters" 
                  (click)="resetHistoryFilters()" 
                  title="تصفير كافة الفلاتر">
                  <span>🔄 تصفير</span>
                </button>
              </div>
            </div>

            <!-- No Filter Results State -->
            <div *ngIf="filteredConfirmedBookings().length === 0" class="empty-state glass-panel no-results-box">
              <div class="empty-icon">🔎</div>
              <h3>لا توجد حجوزات تطابق البحث أو التصفية</h3>
              <p>جرّب تعديل مصطلحات البحث أو تصفير الفلاتر لعرض الحجوزات الأخرى.</p>
              <button (click)="resetHistoryFilters()" class="btn-secondary btn-sm" style="margin-top: 10px;">إعادة تعيين الفلاتر 🔄</button>
            </div>

            <!-- History Table Card -->
            <div *ngIf="filteredConfirmedBookings().length > 0" class="history-table-container glass-panel">
              <div class="table-responsive">
                <table class="custom-table history-table">
                  <thead>
                    <tr>
                      <th style="min-width: 220px;">اللاعب وصاحب الحجز</th>
                      <th style="min-width: 200px;">تاريخ ووقت المباراة</th>
                      <th style="min-width: 170px;">الرسوم والدفع</th>
                      <th style="min-width: 150px;">حالة الحضور</th>
                      <th style="min-width: 190px; text-align: center;">إجراءات التحكم</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let b of paginatedConfirmedBookings()" class="history-row">
                      <!-- Player Column -->
                      <td class="player-cell">
                        <div class="player-row-flex">
                          <div class="player-avatar-circle">
                            {{ (b.bookedForName || b.userFullName || 'ل').slice(0, 1) }}
                          </div>
                          <div class="player-info-details">
                            <strong class="player-title">{{ b.bookedForName || b.userFullName }}</strong>
                            <span *ngIf="b.userFullName && b.userFullName !== b.bookedForName" class="booked-by-tag">
                              طلب بواسطة: {{ b.userFullName }}
                            </span>
                            <a [href]="'tel:' + (b.bookedForPhone || b.userPhoneNumber)" class="player-phone-chip" title="اتصال باللاعب">
                              <span>📱</span>
                              <span dir="ltr">{{ b.bookedForPhone || b.userPhoneNumber }}</span>
                            </a>
                          </div>
                        </div>
                      </td>

                      <!-- Date & Time Column -->
                      <td class="time-cell">
                        <div class="time-meta-wrap">
                          <div class="date-badge-pill">
                            <span class="cal-icon">📅</span>
                            <span class="date-num" dir="ltr">{{ b.bookingDate }}</span>
                          </div>
                          <div class="time-range-row">
                            <span class="clock-icon">⏰</span>
                            <span class="hours-val" dir="ltr">{{ b.startHour }}:00 - {{ b.endHour }}:00</span>
                            <span class="duration-pill">{{ b.durationHours }} س</span>
                          </div>
                        </div>
                      </td>

                      <!-- Price & Payment Column -->
                      <td class="finance-cell">
                        <div class="finance-meta-wrap">
                          <strong class="price-amount text-green">{{ b.totalPrice }} ج.م</strong>
                          <span class="badge" [ngClass]="b.paymentStatus === 2 ? 'badge-fully' : (b.paymentStatus === 1 ? 'badge-partially' : 'badge-unpaid')">
                            {{ b.paymentStatusName }}
                          </span>
                          <span *ngIf="b.paymentStatus === 1" class="paid-sub-info">
                            مدفوع: {{ b.paidAmount }} | باقي: {{ b.totalPrice - b.paidAmount }}
                          </span>
                          <button (click)="openPaymentModal(b)" class="btn-xs btn-outline-primary btn-pay-action" title="تسجيل أو تعديل الدفع">
                            💳 تسجيل دفع
                          </button>
                        </div>
                      </td>

                      <!-- Attendance Status Column -->
                      <td class="attendance-cell">
                        <div class="attendance-meta-wrap">
                          <span class="badge" [ngClass]="b.attendance === 1 ? 'badge-attended' : (b.attendance === 2 ? 'badge-noshow' : 'badge-pending')">
                            {{ b.attendanceName }}
                          </span>
                        </div>
                      </td>

                      <!-- Actions Column -->
                      <td class="actions-cell">
                        <div class="row-action-buttons">
                          <!-- Attendance toggles -->
                          <div class="att-buttons-group" *ngIf="b.attendance === 0">
                            <button (click)="markAttendance(b, 1)" class="btn-action-pill btn-att-attend" title="تسجيل حضور ولعب المباراة">
                              <span>حضر</span>
                              <span>✅</span>
                            </button>
                            <button (click)="markAttendance(b, 2)" class="btn-action-pill btn-att-noshow" title="تسجيل غياب / لم يحضر">
                              <span>لم يحضر</span>
                              <span>❌</span>
                            </button>
                          </div>

                          <div class="att-reset-group" *ngIf="b.attendance !== 0">
                            <button (click)="markAttendance(b, 0)" class="btn-action-pill btn-att-reset" title="إلغاء وإعادة تعيين حالة الحضور إلى بانتظار الموعد">
                              <span>تراجع / تعديل</span>
                              <span>↩️</span>
                            </button>
                          </div>

                          <!-- Delete button -->
                          <button (click)="openDeleteModal(b)" class="btn-action-pill btn-delete-slot" title="حذف الحجز نهائياً وتحرير الموعد بالجدول">
                            <span>حذف</span>
                            <span>🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pagination Footer -->
              <div class="history-pagination-footer">
                <div class="pagination-meta-info">
                  <span>عرض</span>
                  <strong>{{ (historyPage() - 1) * historyPageSize() + 1 }} - {{ Math.min(historyPage() * historyPageSize(), filteredConfirmedBookings().length) }}</strong>
                  <span>من إجمالي</span>
                  <strong>{{ filteredConfirmedBookings().length }}</strong>
                  <span>حجز مؤكد</span>
                </div>

                <div class="pagination-controls">
                  <!-- Prev -->
                  <button 
                    type="button" 
                    class="btn-page-arrow" 
                    [disabled]="historyPage() === 1" 
                    (click)="goToHistoryPage(historyPage() - 1)" 
                    title="الصفحة السابقة">
                    ›
                  </button>

                  <!-- Page Numbers -->
                  <div class="page-numbers-list">
                    <button 
                      *ngFor="let p of historyPageNumbers()" 
                      type="button" 
                      class="btn-page-number" 
                      [class.active]="p === historyPage()" 
                      (click)="goToHistoryPage(p)">
                      {{ p }}
                    </button>
                  </div>

                  <!-- Next -->
                  <button 
                    type="button" 
                    class="btn-page-arrow" 
                    [disabled]="historyPage() >= historyTotalPages()" 
                    (click)="goToHistoryPage(historyPage() + 1)" 
                    title="الصفحة التالية">
                    ‹
                  </button>
                </div>

                <!-- Page Size Selector -->
                <div class="page-size-selector">
                  <label class="page-size-label">عدد الصفوف:</label>
                  <select 
                    class="form-select size-select" 
                    [ngModel]="historyPageSize()" 
                    (ngModelChange)="onHistoryPageSizeChange($event)">
                    <option [value]="5">5</option>
                    <option [value]="10">10</option>
                    <option [value]="20">20</option>
                    <option [value]="50">50</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 6: COMPREHENSIVE FINANCIAL & ATTENDANCE REPORTS -->
        <div *ngIf="activeTab === 'reports'" class="tab-pane">
          <div class="pane-header">
            <div>
              <h2>📊 التقارير المالية والإحصائية المتقدمة</h2>
              <p>تحليل عدد الساعات، الحضور وعدم الحضور (No-Show)، التحصيل المالي ونسب إشغال ملعب النجوم</p>
            </div>
            <div class="report-actions-top">
              <button (click)="printReport()" class="btn-secondary btn-sm btn-print" title="طباعة التقرير">
                🖨️ طباعة التقرير
              </button>
              <button (click)="loadReports()" class="btn-secondary btn-sm" [disabled]="loadingReportsSignal()">
                🔄 تحديث الأرقام
              </button>
            </div>
          </div>

          <!-- Report Filter Toolbar -->
          <div class="report-filter-bar glass-panel">
            <div class="filter-modes">
              <button 
                type="button" 
                class="filter-chip" 
                [class.active]="reportFilterMode === 'today'" 
                (click)="setReportFilter('today')">
                اليوم
              </button>
              <button 
                type="button" 
                class="filter-chip" 
                [class.active]="reportFilterMode === 'week'" 
                (click)="setReportFilter('week')">
                هذا الأسبوع
              </button>
              <button 
                type="button" 
                class="filter-chip" 
                [class.active]="reportFilterMode === 'month'" 
                (click)="setReportFilter('month')">
                هذا الشهر
              </button>
              <button 
                type="button" 
                class="filter-chip" 
                [class.active]="reportFilterMode === 'lastMonth'" 
                (click)="setReportFilter('lastMonth')">
                الشهر السابق
              </button>
            </div>

            <div class="filter-custom-range">
              <div class="date-input-group">
                <label>من تاريخ:</label>
                <input type="date" [(ngModel)]="reportFromDate" class="form-input date-picker-input" />
              </div>
              <div class="date-input-group">
                <label>إلى تاريخ:</label>
                <input type="date" [(ngModel)]="reportToDate" class="form-input date-picker-input" />
              </div>
              <button (click)="applyCustomReportFilter()" class="btn-primary btn-sm">
                تطبيق الفلتر 🔍
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div *ngIf="loadingReportsSignal()" class="loading-state">
            <div class="spinner"></div>
            <p>جاري توليد وتحليل التقارير المالية والإحصائية...</p>
          </div>

          <!-- Reports Content -->
          <div *ngIf="!loadingReportsSignal() && reportsSignal()" class="reports-content">
            
            <!-- 4 Main KPI Cards Grid -->
            <div class="report-kpi-grid">
              
              <!-- KPI 1: Hours Analytics -->
              <div class="kpi-card glass-panel kpi-hours">
                <div class="kpi-card-header">
                  <span class="kpi-icon">🕒</span>
                  <span class="kpi-title">تقرير ساعات الملعب</span>
                </div>
                <div class="kpi-main-stat">
                  <span class="kpi-number">{{ reportsSignal()?.rangeBookedHours }}</span>
                  <span class="kpi-unit">ساعة محجوزة في الفترة</span>
                </div>
                <div class="kpi-sub-stats">
                  <div class="kpi-sub-item">
                    <span class="label">ساعات اليوم:</span>
                    <strong>{{ reportsSignal()?.todayBookedHours }} ساعة</strong>
                  </div>
                  <div class="kpi-sub-item">
                    <span class="label">ساعات هذا الشهر:</span>
                    <strong>{{ reportsSignal()?.currentMonthBookedHours }} ساعة</strong>
                  </div>
                  <div class="kpi-sub-item highlight-rate">
                    <span class="label">نسبة استغلال الملعب:</span>
                    <strong>{{ reportsSignal()?.occupancyRatePercentage }}%</strong>
                  </div>
                </div>
              </div>

              <!-- KPI 2: No-Show Report -->
              <div class="kpi-card glass-panel kpi-noshow">
                <div class="kpi-card-header">
                  <span class="kpi-icon">❌</span>
                  <span class="kpi-title">تقرير عدم الحضور (No-Shows)</span>
                </div>
                <div class="kpi-main-stat text-danger">
                  <span class="kpi-number">{{ reportsSignal()?.noShowCount }}</span>
                  <span class="kpi-unit">حجز لم يحضر أصحابها</span>
                </div>
                <div class="kpi-sub-stats">
                  <div class="kpi-sub-item">
                    <span class="label">الساعات المهدرة:</span>
                    <strong class="text-danger">{{ reportsSignal()?.noShowHours }} ساعة</strong>
                  </div>
                  <div class="kpi-sub-item">
                    <span class="label">الخسارة المالية التقديرية:</span>
                    <strong class="text-danger">{{ reportsSignal()?.noShowPotentialLoss }} ج.م</strong>
                  </div>
                  <div class="kpi-sub-item">
                    <span class="label">حجوزات حضرت بالفعل:</span>
                    <strong class="text-success">{{ reportsSignal()?.attendedCount }} حجز ({{ reportsSignal()?.attendedHours }} س)</strong>
                  </div>
                </div>
              </div>

              <!-- KPI 3: Financial & Payment Report -->
              <div class="kpi-card glass-panel kpi-finance">
                <div class="kpi-card-header">
                  <span class="kpi-icon">💰</span>
                  <span class="kpi-title">التقرير المالي والتحصيل</span>
                </div>
                <div class="kpi-main-stat text-success">
                  <span class="kpi-number">{{ reportsSignal()?.rangeTotalCollected }}</span>
                  <span class="kpi-unit">جنيه تم تحصيله فعلياً</span>
                </div>
                <div class="kpi-sub-stats">
                  <div class="kpi-sub-item">
                    <span class="label">إجمالي قيمة الحجوزات:</span>
                    <strong>{{ reportsSignal()?.rangeTotalValue }} ج.م</strong>
                  </div>
                  <div class="kpi-sub-item">
                    <span class="label">المستحقات المتبقية بالخارج:</span>
                    <strong class="text-warning">{{ reportsSignal()?.rangeTotalOutstanding }} ج.م</strong>
                  </div>
                  <div class="kpi-sub-item">
                    <span class="label">تقسيم الدفع:</span>
                    <strong style="font-size: 0.8rem;">
                      {{ reportsSignal()?.fullyPaidCount }} كامل | {{ reportsSignal()?.partiallyPaidCount }} عربون | {{ reportsSignal()?.unpaidCount }} لم يدفع
                    </strong>
                  </div>
                </div>
              </div>

              <!-- KPI 4: Bookings Summary -->
              <div class="kpi-card glass-panel kpi-bookings">
                <div class="kpi-card-header">
                  <span class="kpi-icon">📋</span>
                  <span class="kpi-title">ملخص الحجوزات الكلي</span>
                </div>
                <div class="kpi-main-stat">
                  <span class="kpi-number">{{ reportsSignal()?.totalBookingsInRange }}</span>
                  <span class="kpi-unit">إجمالي الحجوزات في الفترة</span>
                </div>
                <div class="kpi-sub-stats">
                  <div class="kpi-sub-item">
                    <span class="label">حجوزات مؤكدة:</span>
                    <strong class="text-success">{{ reportsSignal()?.approvedBookingsInRange }} حجز</strong>
                  </div>
                  <div class="kpi-sub-item">
                    <span class="label">طلبات معلقة:</span>
                    <strong class="text-warning">{{ reportsSignal()?.pendingBookingsInRange }} طلب</strong>
                  </div>
                  <div class="kpi-sub-item">
                    <span class="label">ملغاة أو مرفوضة:</span>
                    <strong style="color: #94a3b8;">{{ reportsSignal()?.cancelledOrRejectedInRange }} حجز</strong>
                  </div>
                </div>
              </div>

            </div>

            <!-- Two-Column Deep Insights -->
            <div class="insights-grid">
              
              <!-- Peak Hours Analysis -->
              <div class="insight-panel glass-panel">
                <div class="panel-heading">
                  <h3>🔥 الساعات الأكثر طلباً وفترات الذروة</h3>
                  <small>معدل إشغال ساعات الملعب الأكثر شعبية</small>
                </div>
                <div *ngIf="reportsSignal()?.peakHours?.length === 0" class="empty-substate">
                  <span>لا توجد بيانات كافية لفترات الذروة في هذه الفترة</span>
                </div>
                <div class="peak-hours-list" *ngIf="(reportsSignal()?.peakHours?.length || 0) > 0">
                  <div *ngFor="let p of reportsSignal()?.peakHours" class="peak-hour-row">
                    <div class="peak-info">
                      <span class="peak-time">{{ p.timeLabel }}</span>
                      <span class="peak-badge">{{ p.bookingsCount }} حجز</span>
                    </div>
                    <div class="bar-container">
                      <div class="bar-fill" [style.width.%]="(p.bookingsCount / ((reportsSignal()?.approvedBookingsInRange || 1) > 0 ? (reportsSignal()?.approvedBookingsInRange || 1) : 1)) * 100"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Top Players & No-Show Alerts -->
              <div class="insight-panel glass-panel">
                <div class="panel-heading">
                  <h3>🏆 أنشط اللاعبين والتزاماً بالحضور</h3>
                  <small>اللاعبون الأكثر إقبالاً ودفعاً في الملعب</small>
                </div>
                <div *ngIf="reportsSignal()?.topPlayers?.length === 0" class="empty-substate">
                  <span>لا توجد بيانات لاعبين مسجلة في هذه الفترة</span>
                </div>
                <div class="players-stat-list" *ngIf="(reportsSignal()?.topPlayers?.length || 0) > 0">
                  <div *ngFor="let pl of reportsSignal()?.topPlayers" class="player-stat-row">
                    <div class="pl-avatar">{{ pl.name.slice(0, 1) }}</div>
                    <div class="pl-meta">
                      <strong>{{ pl.name }}</strong>
                      <span class="pl-phone">{{ pl.phoneNumber }}</span>
                    </div>
                    <div class="pl-badges">
                      <span class="badge badge-available">{{ pl.totalBookings }} حجز</span>
                      <span class="badge badge-gold">{{ pl.totalSpent }} ج.م مدفوع</span>
                      <span *ngIf="pl.noShowCount > 0" class="badge badge-danger">⚠️ {{ pl.noShowCount }} غياب</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <!-- Problematic / No-Show Repeaters Warning Box -->
            <div *ngIf="(reportsSignal()?.noShowPlayers?.length || 0) > 0" class="noshow-warning-box glass-panel">
              <div class="warning-header">
                <span>⚠️ تنبيه إدارة الملعب: قائمة اللاعبين متكرري عدم الحضور (No-Show Repeaters)</span>
                <span class="badge badge-danger">{{ reportsSignal()?.noShowPlayers?.length }} لاعب</span>
              </div>
              <p class="warning-desc">يُنصح بالتواصل مع هؤلاء اللاعبين أو اشتراط دفع عربون مسبق قبل تأكيد حجوزاتهم القادمة:</p>
              <div class="noshow-chips">
                <div *ngFor="let nsp of reportsSignal()?.noShowPlayers" class="noshow-chip">
                  <strong>{{ nsp.name }}</strong>
                  <span class="chip-phone">📱 {{ nsp.phoneNumber }}</span>
                  <span class="chip-count">لم يحضر {{ nsp.noShowCount }} مرات</span>
                </div>
              </div>
            </div>

            <!-- Detailed Bookings Table in this Period -->
            <div class="section-subheading" style="margin-top: 36px;">
              <h3>📑 تفاصيل الحجوزات في الفترة المختارة ({{ reportsSignal()?.detailedBookings?.length }})</h3>
            </div>

            <div class="users-table-wrapper glass-panel">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>التاريخ والوقت</th>
                    <th>اللاعب / صاحب الحجز</th>
                    <th>الهاتف</th>
                    <th>المبلغ الإجمالي</th>
                    <th>المبلغ المدفوع</th>
                    <th>حالة الدفع</th>
                    <th>حالة الحضور</th>
                    <th>إجراء الحضور / الدفع</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let b of reportsSignal()?.detailedBookings">
                    <td>
                      <strong>{{ b.bookingDate }}</strong>
                      <div style="font-size: 0.8rem; color: #94a3b8;">{{ b.startHour }}:00 - {{ b.endHour }}:00 ({{ b.durationHours }} س)</div>
                    </td>
                    <td>
                      <strong>{{ b.bookedForName || b.userFullName }}</strong>
                    </td>
                    <td>
                      <a [href]="'tel:' + (b.bookedForPhone || b.userPhoneNumber)" class="phone-link">
                        {{ b.bookedForPhone || b.userPhoneNumber }}
                      </a>
                    </td>
                    <td><strong>{{ b.totalPrice }} ج.م</strong></td>
                    <td>
                      <span [ngClass]="b.paidAmount >= b.totalPrice ? 'text-success' : (b.paidAmount > 0 ? 'text-warning' : 'text-danger')">
                        {{ b.paidAmount }} ج.م
                      </span>
                      <small *ngIf="b.remainingAmount > 0" style="display: block; font-size: 0.72rem; color: #f87171;">
                        (متبقي {{ b.remainingAmount }})
                      </small>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="b.paymentStatus === 2 ? 'badge-fully' : (b.paymentStatus === 1 ? 'badge-partially' : 'badge-unpaid')">
                        {{ b.paymentStatusName }}
                      </span>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="b.attendance === 1 ? 'badge-attended' : (b.attendance === 2 ? 'badge-noshow' : 'badge-pending')">
                        {{ b.attendanceName }}
                      </span>
                    </td>
                    <td>
                      <div class="row-quick-actions">
                        <button (click)="markAttendance(b, 1)" class="btn-xs btn-outline-success" title="تسجيل حضور">حضر ✅</button>
                        <button (click)="markAttendance(b, 2)" class="btn-xs btn-outline-danger" title="تسجيل عدم حضور">غاب ❌</button>
                        <button (click)="openPaymentModal(b)" class="btn-xs btn-outline-primary" title="تسجيل الدفع">💳 دفع</button>
                        <button (click)="openDeleteModal(b)" class="btn-xs btn-danger" style="padding: 3px 8px; font-size: 0.78rem;" title="حذف هذا الحجز نهائياً">🗑️ حذف</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>

        <!-- In-App Payment Modal -->
        <div *ngIf="showPaymentModal" class="modal-backdrop" (click)="closePaymentModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>💳 تسجيل وتعديل دفع الحجز</h2>
              <button (click)="closePaymentModal()" class="btn-close-modal">✕</button>
            </div>

            <div class="modal-body" *ngIf="paymentTargetBooking">
              <div class="reject-summary-card">
                <div>👤 <strong>صاحب الحجز:</strong> {{ paymentTargetBooking.bookedForName || paymentTargetBooking.userFullName }}</div>
                <div>📅 <strong>الموعد:</strong> {{ paymentTargetBooking.bookingDate }} ({{ paymentTargetBooking.startHour }}:00 - {{ paymentTargetBooking.endHour }}:00)</div>
                <div>💰 <strong>إجمالي التكلفة:</strong> {{ paymentTargetBooking.totalPrice }} جنيه</div>
                <div>💵 <strong>المدفوع حالياً:</strong> {{ paymentTargetBooking.paidAmount }} جنيه (المتبقي: {{ paymentTargetBooking.remainingAmount }} جنيه)</div>
              </div>

              <div class="form-group" style="margin-top: 16px;">
                <label class="form-label">المبلغ المدفوع (جنيه) *</label>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                  <button type="button" class="btn-secondary btn-xs" (click)="paymentAmount = paymentTargetBooking.totalPrice">
                    سداد كامل ({{ paymentTargetBooking.totalPrice }} ج)
                  </button>
                  <button type="button" class="btn-secondary btn-xs" (click)="paymentAmount = Math.round(paymentTargetBooking.totalPrice / 2)">
                    عربون 50% ({{ Math.round(paymentTargetBooking.totalPrice / 2) }} ج)
                  </button>
                  <button type="button" class="btn-secondary btn-xs" (click)="paymentAmount = 0">
                    غير مدفوع (0 ج)
                  </button>
                </div>
                <input 
                  type="number" 
                  class="form-input" 
                  [(ngModel)]="paymentAmount" 
                  name="payAmount" 
                  min="0" 
                  required />
              </div>

              <div class="form-group">
                <label class="form-label">طريقة الدفع</label>
                <select class="form-select" [(ngModel)]="paymentMethod" name="payMethod">
                  <option value="كاش (نقدي في الملعب)">💵 كاش (نقدي في الملعب)</option>
                  <option value="فودافون كاش (Vodafone Cash)">📱 فودافون كاش (Vodafone Cash)</option>
                  <option value="إنستاباي (InstaPay)">⚡ إنستاباي (InstaPay)</option>
                  <option value="أخرى">💳 أخرى</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">ملاحظات أو رقم التحويل (اختياري)</label>
                <input 
                  type="text" 
                  class="form-input" 
                  [(ngModel)]="paymentNotes" 
                  name="payNotes" 
                  placeholder="مثال: تم التحويل من رقم 01012345678" />
              </div>
            </div>

            <div class="modal-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
              <button type="button" class="btn-secondary" (click)="closePaymentModal()">إلغاء</button>
              <button 
                type="button" 
                class="btn-primary" 
                (click)="submitPayment()" 
                [disabled]="actionInProgress !== null">
                <span *ngIf="actionInProgress !== null">جاري الحفظ... ⏳</span>
                <span *ngIf="actionInProgress === null">💾 حفظ بيانات الدفع الآن</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Floating Toast Notification -->
        <div *ngIf="alertMessageSignal()" class="floating-toast" [ngClass]="alertTypeSignal()">
          <span class="toast-icon">{{ alertTypeSignal() === 'alert-success' ? '✅' : '⚠️' }}</span>
          <span class="toast-text">{{ alertMessageSignal() }}</span>
          <button (click)="alertMessageSignal.set('')" class="toast-close">✕</button>
        </div>

        <!-- In-App Rejection Modal (بدون استخدام prompt المتصفح المحظور) -->
        <div *ngIf="showRejectModal" class="modal-backdrop" (click)="closeRejectModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>❌ رفض طلب الحجز</h2>
              <button (click)="closeRejectModal()" class="btn-close-modal">✕</button>
            </div>

            <div class="modal-body" *ngIf="rejectTargetBooking">
              <div class="reject-summary-card">
                <div>👤 <strong>صاحب الحجز:</strong> {{ rejectTargetBooking.bookedForName || rejectTargetBooking.userFullName }}</div>
                <div>📅 <strong>التاريخ والموعد:</strong> {{ rejectTargetBooking.bookingDate }} (من {{ rejectTargetBooking.startHour }}:00 حتى {{ rejectTargetBooking.endHour }}:00)</div>
                <div>💰 <strong>المبلغ:</strong> {{ rejectTargetBooking.totalPrice }} جنيه</div>
              </div>

              <div class="form-group" style="margin-top: 16px;">
                <label class="form-label">سبب الرفض (سيظهر للاعب في قائمة حجوزاته):</label>
                <textarea 
                  class="form-textarea" 
                  rows="3" 
                  [(ngModel)]="rejectReasonText" 
                  placeholder="اكتب سبب الرفض هنا..."></textarea>
              </div>
            </div>

            <div class="modal-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
              <button 
                type="button" 
                class="btn-secondary" 
                (click)="closeRejectModal()" 
                [disabled]="actionInProgress !== null">
                تراجع
              </button>
              <button 
                type="button" 
                class="btn-danger" 
                (click)="confirmRejectBooking()" 
                [disabled]="actionInProgress !== null">
                <span *ngIf="actionInProgress === rejectTargetBooking?.id">جاري الرفض... ⏳</span>
                <span *ngIf="actionInProgress !== rejectTargetBooking?.id">❌ تأكيد الرفض الآن</span>
              </button>
            </div>
          </div>
        </div>

        <!-- In-App Delete Confirmation Modal -->
        <div *ngIf="showDeleteModal" class="modal-backdrop" (click)="closeDeleteModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>🗑️ تأكيد حذف الحجز نهائياً</h2>
              <button (click)="closeDeleteModal()" class="btn-close-modal">✕</button>
            </div>

            <div class="modal-body" *ngIf="deleteTargetBooking">
              <div class="delete-warning-card">
                <div style="font-size: 1.05rem; font-weight: 700; color: #f87171; margin-bottom: 8px;">
                  ⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!
                </div>
                <p style="margin: 0 0 14px; font-size: 0.9rem; color: #cbd5e1; line-height: 1.5;">
                  سيتم حذف بيانات الحجز بالكامل وإعادة فتح وتحرير الموعد في جدول مواعيد الملعب فورياً ليتمكن أي لاعب آخر من حجزه.
                </p>
                <div class="reject-summary-card">
                  <div>👤 <strong>صاحب الحجز:</strong> {{ deleteTargetBooking.bookedForName || deleteTargetBooking.userFullName }}</div>
                  <div>📅 <strong>الموعد:</strong> {{ deleteTargetBooking.bookingDate }} (من {{ deleteTargetBooking.startHour }}:00 حتى {{ deleteTargetBooking.endHour }}:00)</div>
                  <div>📱 <strong>الهاتف:</strong> {{ deleteTargetBooking.bookedForPhone || deleteTargetBooking.userPhoneNumber }}</div>
                  <div>💰 <strong>المبلغ الإجمالي:</strong> {{ deleteTargetBooking.totalPrice }} جنيه (مدفوع: {{ deleteTargetBooking.paidAmount }} جنيه)</div>
                  <div>🏷️ <strong>حالة الحجز:</strong> {{ deleteTargetBooking.statusName }}</div>
                </div>
              </div>
            </div>

            <div class="modal-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
              <button 
                type="button" 
                class="btn-secondary" 
                (click)="closeDeleteModal()" 
                [disabled]="actionInProgress !== null">
                إلغاء وتراجع
              </button>
              <button 
                type="button" 
                class="btn-danger" 
                (click)="confirmDeleteBooking()" 
                [disabled]="actionInProgress !== null">
                <span *ngIf="actionInProgress === deleteTargetBooking?.id">جاري الحذف... ⏳</span>
                <span *ngIf="actionInProgress !== deleteTargetBooking?.id">🗑️ تأكيد الحذف النهائي الآن</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .admin-page {
      padding: 40px 0 60px;
    }

    .admin-header {
      margin-bottom: 28px;
    }

    .header-flex {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(100, 116, 139, 0.2);
      border: 1px solid rgba(100, 116, 139, 0.3);
      font-size: 0.8rem;
      color: #94a3b8;
      font-weight: 700;
    }

    .live-pill.connected {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.35);
      color: #34d399;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(1.3); }
    }

    .admin-title-badge {
      display: inline-flex;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
      font-weight: 800;
      font-size: 0.85rem;
      padding: 4px 14px;
      border-radius: 9999px;
      margin-bottom: 12px;
    }

    .admin-header h1 {
      font-size: 2.2rem;
      margin-bottom: 6px;
    }

    .admin-header p {
      color: #94a3b8;
    }

    /* === QUICK KPIS STRIP === */
    .admin-quick-kpis {
      display: flex;
      align-items: center;
      background: rgba(14, 20, 36, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      margin-bottom: 24px;
      overflow: hidden;
    }

    .kpi-mini-card {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 22px;
      transition: background 0.2s;
    }

    .kpi-mini-card:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .kpi-mini-sep {
      width: 1px;
      height: 38px;
      background: rgba(255, 255, 255, 0.08);
    }

    .kpi-icon-badge {
      width: 44px; height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      flex-shrink: 0;
    }

    .kpi-icon-badge.green  { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.28); }
    .kpi-icon-badge.gold   { background: rgba(245, 158, 11, 0.15);  border: 1px solid rgba(245, 158, 11, 0.28); }
    .kpi-icon-badge.blue   { background: rgba(59, 130, 246, 0.15);  border: 1px solid rgba(59, 130, 246, 0.28); }
    .kpi-icon-badge.purple { background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.28); }

    .kpi-info-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .kpi-val {
      font-size: 1.35rem;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.1;
    }

    .kpi-lbl {
      font-size: 0.78rem;
      color: #64748b;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .admin-quick-kpis { flex-direction: column; }
      .kpi-mini-sep { width: 100%; height: 1px; }
      .kpi-mini-card { width: 100%; padding: 14px 18px; }
    }

    /* === MODERN SEGMENTED TABS === */
    .admin-nav-tabs {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      background: rgba(10, 17, 32, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 10px;
      border-radius: 20px;
      margin-bottom: 30px;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.4);
    }

    .admin-tab-btn {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: inherit;
      text-align: right;
      overflow: hidden;
    }

    .admin-tab-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      transform: translateY(-2px);
    }

    .admin-tab-btn.active {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0.12));
      border: 1px solid #10b981;
      color: #ffffff;
      box-shadow: 0 4px 18px rgba(16, 185, 129, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }

    .admin-tab-btn.active::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: 15%;
      right: 15%;
      height: 3px;
      background: #10b981;
      border-radius: 9999px;
      box-shadow: 0 0 10px #10b981;
    }

    .tab-icon {
      font-size: 1.35rem;
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }

    .admin-tab-btn:hover .tab-icon {
      transform: scale(1.15);
    }

    .tab-text-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .tab-main-title {
      font-size: 0.92rem;
      font-weight: 800;
      color: inherit;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tab-sub-hint {
      font-size: 0.72rem;
      color: #64748b;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .admin-tab-btn.active .tab-sub-hint {
      color: #34d399;
    }

    .counter-badge {
      background: #ef4444;
      color: white;
      font-size: 0.75rem;
      padding: 2px 7px;
      border-radius: 9999px;
      font-weight: 900;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
      flex-shrink: 0;
    }

    .counter-badge.pulse-badge {
      animation: badgePulse 2s infinite;
    }

    @keyframes badgePulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 8px rgba(239, 68, 68, 0.4); }
      50% { transform: scale(1.1); box-shadow: 0 0 14px rgba(239, 68, 68, 0.7); }
    }

    .badge-gold {
      background: #f59e0b;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
    }

    @media (max-width: 1200px) {
      .admin-nav-tabs {
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
    }

    @media (max-width: 640px) {
      .admin-nav-tabs {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        padding: 8px;
      }
      .admin-tab-btn {
        padding: 10px 12px;
      }
      .tab-main-title {
        font-size: 0.85rem;
      }
      .tab-sub-hint {
        display: none;
      }
    }

    .pane-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .pane-header h2 {
      font-size: 1.5rem;
      margin-bottom: 4px;
    }

    .fifo-explainer {
      color: #38bdf8;
      font-size: 0.88rem;
    }

    .requests-list {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .request-card {
      padding: 24px;
      border-radius: 18px;
      border-right: 5px solid #10b981;
    }

    .request-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }

    .priority-rank {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .rank-number {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      font-weight: 800;
      font-size: 1.3rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .request-time-badge {
      display: flex;
      flex-direction: column;
      font-size: 0.82rem;
      color: #94a3b8;
    }

    .fifo-tag {
      color: #38bdf8;
    }

    .slot-badge-info {
      display: flex;
      gap: 10px;
    }

    .booking-date-badge, .booking-hour-badge {
      background: rgba(255, 255, 255, 0.08);
      padding: 6px 12px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .user-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      background: rgba(0, 0, 0, 0.25);
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 14px;
    }

    .info-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .block-label {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .phone-link {
      color: #38bdf8;
      font-weight: 700;
    }

    .text-gold {
      color: #fbbf24;
    }

    .text-green {
      color: #34d399;
    }

    .user-notes-box {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 16px;
      color: #fde68a;
    }

    .request-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      flex-wrap: wrap;
    }

    .action-hint {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .action-btns {
      display: flex;
      gap: 10px;
    }

    /* Users Tab */
    .section-subheading h3 {
      font-size: 1.25rem;
      color: #ffffff;
      margin-bottom: 16px;
    }

    .users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 18px;
    }

    .user-card {
      padding: 20px;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .user-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .user-avatar-lg {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      font-weight: 800;
      font-size: 1.3rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-card-name {
      font-size: 1rem;
      font-weight: 800;
    }

    .user-card-username {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .user-card-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 0.86rem;
      margin-bottom: 18px;
    }

    .u-detail {
      display: flex;
      justify-content: space-between;
      gap: 6px;
    }

    .custom-table {
      width: 100%;
      border-collapse: collapse;
      text-align: right;
      font-size: 0.9rem;
    }

    .custom-table th, .custom-table td {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .custom-table th {
      color: #94a3b8;
      font-weight: 700;
      font-size: 0.82rem;
    }

    .users-table-wrapper {
      padding: 16px;
      overflow-x: auto;
    }

    .btn-xs {
      padding: 4px 10px;
      font-size: 0.78rem;
      border-radius: 6px;
    }

    /* Settings Tab */
    .settings-tab-pane {
      display: flex;
      justify-content: center;
      width: 100%;
    }

    .settings-container {
      width: 100%;
      max-width: 880px;
      margin: 0 auto;
    }

    .settings-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      justify-content: center;
      margin-bottom: 26px;
    }

    .settings-title-wrap {
      text-align: center;
    }

    .settings-title-wrap h2 {
      font-size: 1.85rem;
      font-weight: 800;
      color: #f8fafc;
      margin-bottom: 8px;
    }

    .settings-title-wrap p {
      color: #94a3b8;
      font-size: 0.95rem;
    }

    .settings-form-wrapper {
      padding: 34px 38px;
      width: 100%;
      border-radius: 20px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(14, 20, 36, 0.72);
      backdrop-filter: blur(14px);
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }

    @media (max-width: 600px) {
      .grid-2 { grid-template-columns: 1fr; }
    }

    /* Unavailable layout */
    .unavailable-layout {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 20px;
    }

    @media (max-width: 768px) {
      .unavailable-layout { grid-template-columns: 1fr; }
    }

    .add-slot-form {
      padding: 24px;
    }

    .add-slot-form h3 {
      font-size: 1.15rem;
      margin-bottom: 16px;
    }

    .slots-list-wrapper {
      padding: 24px;
    }

    .slots-list-wrapper h3 {
      font-size: 1.15rem;
      margin-bottom: 16px;
    }

    .unavailable-slots-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .unav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.04);
      padding: 12px 16px;
      border-radius: 10px;
    }

    .unav-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.88rem;
    }

    .unav-date {
      color: #ffffff;
    }

    .unav-time {
      color: #f59e0b;
      font-weight: 700;
    }

    .unav-reason {
      color: #94a3b8;
      font-size: 0.8rem;
    }

    .empty-state {
      text-align: center;
      padding: 50px 20px;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 12px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(16, 185, 129, 0.2);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-state {
      text-align: center;
      padding: 60px 0;
    }

    .alert-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      border-radius: 10px;
      margin-bottom: 20px;
    }

    .alert-success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
    }

    .alert-danger {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #fca5a5;
    }

    .btn-close {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
    }

    /* Floating Toast Notification */
    .floating-toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      border-radius: 14px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
      animation: toastIn 0.3s ease-out;
      font-weight: 700;
      font-size: 0.98rem;
      max-width: 90vw;
    }

    @keyframes toastIn {
      from { transform: translate(-50%, 40px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }

    .toast-icon { font-size: 1.3rem; }
    .toast-text { color: #ffffff; flex: 1; }
    .toast-close { background: none; border: none; color: #ffffff; cursor: pointer; font-size: 1.2rem; opacity: 0.8; }
    .toast-close:hover { opacity: 1; }

    /* Modal Backdrop and Content */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.78);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-content {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      padding: 28px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
      animation: modalScale 0.25s ease-out;
    }

    @keyframes modalScale {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.3rem;
      color: #ffffff;
    }

    .btn-close-modal {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.3rem;
      cursor: pointer;
    }
    .btn-close-modal:hover { color: #ffffff; }

    .reject-summary-card {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      padding: 14px 18px;
      border-radius: 12px;
      color: #fca5a5;
      font-size: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .delete-warning-card {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 12px;
    }

    /* Badges & Buttons for Attendance & Payment */
    .badge-attended {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .badge-noshow {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .badge-fully {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-partially {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-unpaid {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .btn-outline-success {
      border: 1px solid rgba(16, 185, 129, 0.5);
      color: #34d399;
      background: rgba(16, 185, 129, 0.1);
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.78rem;
    }
    .btn-outline-success:hover {
      background: rgba(16, 185, 129, 0.25);
    }
    .btn-outline-danger {
      border: 1px solid rgba(239, 68, 68, 0.5);
      color: #f87171;
      background: rgba(239, 68, 68, 0.1);
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.78rem;
    }
    .btn-outline-danger:hover {
      background: rgba(239, 68, 68, 0.25);
    }
    .btn-outline-primary {
      border: 1px solid rgba(56, 189, 248, 0.5);
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.78rem;
    }
    .btn-outline-primary:hover {
      background: rgba(56, 189, 248, 0.25);
    }

    .row-quick-actions {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
    }

    /* === MODERN HISTORY TAB & CONFIRMED BOOKINGS TABLE === */
    .history-tab-pane {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* History KPI Strip */
    .history-kpis-strip {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 14px;
      margin-bottom: 4px;
    }

    .history-kpi-card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      transition: all 0.25s ease;
      position: relative;
      overflow: hidden;
    }

    .history-kpi-card:hover {
      background: rgba(30, 41, 59, 0.7);
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.18);
    }

    .history-kpi-card.active {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.12);
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.2);
    }

    .kpi-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      flex-shrink: 0;
    }

    .kpi-icon-box.blue   { background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); }
    .kpi-icon-box.gold   { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); }
    .kpi-icon-box.green  { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); }
    .kpi-icon-box.red    { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); }
    .kpi-icon-box.purple { background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); }

    .history-kpi-card .kpi-info-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .history-kpi-card .kpi-num {
      font-size: 1.25rem;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.1;
    }

    .history-kpi-card .kpi-name {
      font-size: 0.78rem;
      color: #94a3b8;
      font-weight: 600;
      white-space: nowrap;
    }

    .history-kpi-card.money-card {
      cursor: default;
    }
    .history-kpi-card.money-card:hover {
      transform: none;
    }

    @media (max-width: 1100px) {
      .history-kpis-strip {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    @media (max-width: 680px) {
      .history-kpis-strip {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    /* History Toolbar */
    .history-toolbar {
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      border-radius: 16px;
    }

    .toolbar-search-wrap {
      position: relative;
      flex: 1 1 280px;
      min-width: 240px;
    }

    .toolbar-search-wrap .search-lens {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 0.95rem;
      pointer-events: none;
      opacity: 0.6;
    }

    .toolbar-search-wrap .search-field {
      width: 100%;
      padding-right: 40px;
      padding-left: 36px;
      background: rgba(15, 23, 42, 0.75);
      border-radius: 10px;
      font-size: 0.88rem;
    }

    .toolbar-search-wrap .btn-clear-term {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.85rem;
    }
    .toolbar-search-wrap .btn-clear-term:hover { color: #ffffff; }

    .toolbar-filters-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .tool-filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tool-label {
      font-size: 0.82rem;
      color: #94a3b8;
      font-weight: 700;
      white-space: nowrap;
    }

    .tool-select, .date-picker {
      padding: 8px 12px;
      font-size: 0.85rem;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      color: #f1f5f9;
      cursor: pointer;
    }

    .btn-reset-filters {
      padding: 8px 14px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      font-size: 0.82rem;
      font-weight: 700;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-reset-filters:hover {
      background: rgba(239, 68, 68, 0.22);
      color: #ffffff;
    }

    /* History Table Card */
    .history-table-container {
      padding: 0;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(14, 20, 36, 0.75);
      backdrop-filter: blur(14px);
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }

    .custom-table.history-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .custom-table.history-table thead tr {
      background: rgba(15, 23, 42, 0.9);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .custom-table.history-table th {
      padding: 14px 20px;
      color: #94a3b8;
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 0.3px;
      text-align: right;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .history-row {
      transition: background 0.18s ease;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .history-row:hover {
      background: rgba(255, 255, 255, 0.035);
    }

    .custom-table.history-table td {
      padding: 16px 20px;
      vertical-align: middle;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    /* Player Cell */
    .player-row-flex {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .player-avatar-circle {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #0284c7);
      color: white;
      font-size: 1.15rem;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(16, 185, 129, 0.25);
    }

    .player-info-details {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .player-title {
      font-size: 0.96rem;
      color: #ffffff;
      font-weight: 800;
    }

    .booked-by-tag {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .player-phone-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      color: #38bdf8;
      text-decoration: none;
      transition: color 0.2s;
    }
    .player-phone-chip:hover {
      color: #7dd3fc;
      text-decoration: underline;
    }

    /* Time Cell */
    .time-meta-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .date-badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.88rem;
      font-weight: 800;
      color: #ffffff;
    }

    .time-range-row {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      color: #cbd5e1;
    }

    .hours-val {
      font-weight: 700;
      color: #f1f5f9;
      font-variant-numeric: tabular-nums;
    }

    .duration-pill {
      background: rgba(245, 158, 11, 0.18);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #fbbf24;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 1px 7px;
      border-radius: 9999px;
    }

    /* Finance Cell */
    .finance-meta-wrap {
      display: flex;
      flex-direction: column;
      gap: 5px;
      align-items: flex-start;
    }

    .price-amount {
      font-size: 1.05rem;
      font-weight: 900;
      color: #34d399;
    }

    .paid-sub-info {
      font-size: 0.74rem;
      color: #38bdf8;
      font-weight: 600;
    }

    .btn-pay-action {
      margin-top: 2px;
      padding: 4px 10px;
      border-radius: 8px;
      font-weight: 700;
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.35);
      color: #38bdf8;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-pay-action:hover {
      background: rgba(56, 189, 248, 0.25);
      color: #ffffff;
    }

    /* Attendance Cell */
    .attendance-meta-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: flex-start;
    }

    /* Actions Cell */
    .row-action-buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .att-buttons-group {
      display: flex;
      gap: 6px;
    }

    .btn-action-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .btn-att-attend {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .btn-att-attend:hover {
      background: rgba(16, 185, 129, 0.3);
      color: #ffffff;
      transform: translateY(-1px);
    }

    .btn-att-noshow {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #f87171;
    }
    .btn-att-noshow:hover {
      background: rgba(239, 68, 68, 0.3);
      color: #ffffff;
      transform: translateY(-1px);
    }

    .btn-att-reset {
      background: rgba(100, 116, 139, 0.15);
      border-color: rgba(100, 116, 139, 0.35);
      color: #cbd5e1;
    }
    .btn-att-reset:hover {
      background: rgba(100, 116, 139, 0.28);
      color: #ffffff;
      transform: translateY(-1px);
    }

    .btn-delete-slot {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.35);
      color: #f87171;
      padding: 6px 10px;
    }
    .btn-delete-slot:hover {
      background: #ef4444;
      color: #ffffff;
      border-color: #ef4444;
      transform: translateY(-1px);
    }

    /* History Pagination Footer */
    .history-pagination-footer {
      padding: 16px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: rgba(15, 23, 42, 0.85);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      flex-wrap: wrap;
    }

    .pagination-meta-info {
      font-size: 0.84rem;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .pagination-meta-info strong {
      color: #ffffff;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-page-arrow {
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #ffffff;
      font-size: 1.1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-page-arrow:hover:not(:disabled) {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10b981;
    }
    .btn-page-arrow:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .page-numbers-list {
      display: flex;
      gap: 4px;
    }

    .btn-page-number {
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      color: #cbd5e1;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-page-number:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
    .btn-page-number.active {
      background: #10b981;
      border-color: #10b981;
      color: #ffffff;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .page-size-label {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .size-select {
      padding: 5px 10px;
      font-size: 0.82rem;
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
      cursor: pointer;
    }

    /* Reports Styles */
    .report-actions-top {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .btn-print {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.35);
    }
    .btn-print:hover {
      background: rgba(56, 189, 248, 0.25);
    }

    .report-filter-bar {
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
      border-radius: 16px;
    }
    .filter-modes {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-chip {
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #94a3b8;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .filter-chip:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
    .filter-chip.active {
      background: rgba(16, 185, 129, 0.25);
      border-color: #10b981;
      color: #34d399;
    }

    .filter-custom-range {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }
    .date-input-group {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .date-picker-input {
      padding: 6px 10px;
      font-size: 0.85rem;
    }

    .report-kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
      margin-bottom: 28px;
    }
    .kpi-card {
      padding: 22px;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .kpi-hours { border-top: 4px solid #38bdf8; }
    .kpi-noshow { border-top: 4px solid #ef4444; }
    .kpi-finance { border-top: 4px solid #10b981; }
    .kpi-bookings { border-top: 4px solid #f59e0b; }

    .kpi-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .kpi-icon { font-size: 1.4rem; }
    .kpi-title {
      font-weight: 700;
      font-size: 0.95rem;
      color: #e2e8f0;
    }
    .kpi-main-stat {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .kpi-number {
      font-size: 2.2rem;
      font-weight: 900;
    }
    .kpi-unit {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .kpi-sub-stats {
      display: flex;
      flex-direction: column;
      gap: 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 10px;
      font-size: 0.83rem;
    }
    .kpi-sub-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .highlight-rate {
      color: #38bdf8;
      font-weight: 700;
    }

    .insights-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }
    @media (max-width: 900px) {
      .insights-grid { grid-template-columns: 1fr; }
    }
    .insight-panel {
      padding: 22px;
      border-radius: 16px;
    }
    .panel-heading h3 {
      font-size: 1.15rem;
      margin-bottom: 4px;
    }
    .panel-heading small {
      color: #94a3b8;
      display: block;
      margin-bottom: 16px;
      font-size: 0.8rem;
    }

    .peak-hours-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .peak-hour-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .peak-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }
    .peak-badge {
      font-size: 0.78rem;
      color: #f59e0b;
      font-weight: 700;
    }
    .bar-container {
      width: 100%;
      height: 7px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #38bdf8);
      border-radius: 4px;
      transition: width 0.5s ease-out;
    }

    .players-stat-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .player-stat-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 10px;
      gap: 10px;
    }
    .pl-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #10b981);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #ffffff;
      flex-shrink: 0;
    }
    .pl-meta {
      display: flex;
      flex-direction: column;
      flex: 1;
      font-size: 0.85rem;
    }
    .pl-phone {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .pl-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .noshow-warning-box {
      padding: 20px;
      border: 1px solid rgba(239, 68, 68, 0.35);
      background: rgba(239, 68, 68, 0.08);
      border-radius: 14px;
      margin-bottom: 28px;
    }
    .warning-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 800;
      color: #f87171;
      margin-bottom: 8px;
    }
    .warning-desc {
      font-size: 0.85rem;
      color: #cbd5e1;
      margin-bottom: 14px;
    }
    .noshow-chips {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .noshow-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      font-size: 0.82rem;
    }
    .chip-phone {
      color: #fca5a5;
      font-size: 0.75rem;
    }
    .chip-count {
      font-weight: 800;
      color: #ef4444;
      background: rgba(0,0,0,0.3);
      padding: 2px 8px;
      border-radius: 9999px;
    }

    @media print {
      .admin-nav-tabs, .report-filter-bar, .report-actions-top, .live-pill, .row-quick-actions, .admin-title-badge {
        display: none !important;
      }
      .admin-page {
        padding: 0;
      }
      .glass-panel {
        background: none !important;
        border: 1px solid #ccc !important;
        color: #000 !important;
      }
    }
  `]
})
export class AdminComponent implements OnInit, OnDestroy {
  private pitchService = inject(PitchService);
  private bookingService = inject(BookingService);
  public realtimeService = inject(RealtimeService);

  activeTab: 'requests' | 'users' | 'settings' | 'unavailable' | 'history' | 'reports' = 'requests';

  // Angular Signals for Admin State
  public pendingRequestsSignal = signal<Booking[]>([]);
  public loadingRequestsSignal = signal<boolean>(false);
  public pendingUsersSignal = signal<UserProfile[]>([]);
  public allUsersSignal = signal<UserProfile[]>([]);
  public settingsSignal = signal<PitchSetting | null>(null);
  public unavailableSlotsSignal = signal<UnavailableSlot[]>([]);
  public confirmedBookingsSignal = signal<Booking[]>([]);
  public reportsSignal = signal<PitchFinancialReport | null>(null);
  public loadingReportsSignal = signal<boolean>(false);
  public alertMessageSignal = signal<string>('');
  public alertTypeSignal = signal<string>('alert-success');
  // Math helper for template
  protected readonly Math = Math;

  // History Tab Signals & Filters
  public loadingHistorySignal = signal<boolean>(false);
  public historySearch = signal<string>('');
  public historyDate = signal<string>('');
  public historyAttendanceFilter = signal<'all' | 'pending' | 'attended' | 'noshow'>('all');
  public historyPaymentFilter = signal<'all' | 'unpaid' | 'partial' | 'full'>('all');
  public historySort = signal<'date-desc' | 'date-asc' | 'price-desc'>('date-desc');
  public historyPage = signal<number>(1);
  public historyPageSize = signal<number>(10);

  // History stats KPI
  public historyStats = computed(() => {
    const all = this.confirmedBookingsSignal();
    const totalBookings = all.length;
    const totalExpected = all.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const totalCollected = all.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const attendedCount = all.filter(b => b.attendance === 1).length;
    const noShowCount = all.filter(b => b.attendance === 2).length;
    const pendingAttendanceCount = all.filter(b => b.attendance === 0).length;
    return {
      totalBookings,
      totalExpected,
      totalCollected,
      attendedCount,
      noShowCount,
      pendingAttendanceCount
    };
  });

  // Filtered confirmed bookings
  public filteredConfirmedBookings = computed(() => {
    const all = this.confirmedBookingsSignal();
    const search = this.historySearch().trim().toLowerCase();
    const date = this.historyDate();
    const attFilter = this.historyAttendanceFilter();
    const payFilter = this.historyPaymentFilter();
    const sort = this.historySort();

    let list = all.filter(b => {
      // Search in player name, phone, or date
      if (search) {
        const name = (b.bookedForName || b.userFullName || '').toLowerCase();
        const phone = (b.bookedForPhone || b.userPhoneNumber || '').toLowerCase();
        const bDate = (b.bookingDate || '').toLowerCase();
        if (!name.includes(search) && !phone.includes(search) && !bDate.includes(search)) {
          return false;
        }
      }
      // Date filter
      if (date && b.bookingDate !== date) {
        return false;
      }
      // Attendance filter
      if (attFilter === 'pending' && b.attendance !== 0) return false;
      if (attFilter === 'attended' && b.attendance !== 1) return false;
      if (attFilter === 'noshow' && b.attendance !== 2) return false;

      // Payment filter (0: Unpaid, 1: PartiallyPaid, 2: FullyPaid)
      if (payFilter === 'unpaid' && b.paymentStatus !== 0) return false;
      if (payFilter === 'partial' && b.paymentStatus !== 1) return false;
      if (payFilter === 'full' && b.paymentStatus !== 2) return false;

      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sort === 'date-desc') {
        const cmp = (b.bookingDate || '').localeCompare(a.bookingDate || '');
        return cmp !== 0 ? cmp : b.startHour - a.startHour;
      }
      if (sort === 'date-asc') {
        const cmp = (a.bookingDate || '').localeCompare(b.bookingDate || '');
        return cmp !== 0 ? cmp : a.startHour - b.startHour;
      }
      if (sort === 'price-desc') {
        return b.totalPrice - a.totalPrice;
      }
      return 0;
    });

    return list;
  });

  public historyTotalPages = computed(() => {
    const total = this.filteredConfirmedBookings().length;
    return Math.max(1, Math.ceil(total / this.historyPageSize()));
  });

  public paginatedConfirmedBookings = computed(() => {
    const list = this.filteredConfirmedBookings();
    const page = this.historyPage();
    const size = this.historyPageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  public hasActiveHistoryFilters = computed(() => {
    return !!(
      this.historySearch().trim() ||
      this.historyDate() ||
      this.historyAttendanceFilter() !== 'all' ||
      this.historyPaymentFilter() !== 'all' ||
      this.historySort() !== 'date-desc'
    );
  });

  public historyPageNumbers = computed(() => {
    const total = this.historyTotalPages();
    const current = this.historyPage();
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  public resetHistoryFilters(): void {
    this.historySearch.set('');
    this.historyDate.set('');
    this.historyAttendanceFilter.set('all');
    this.historyPaymentFilter.set('all');
    this.historySort.set('date-desc');
    this.historyPage.set(1);
  }

  public setHistoryAttendanceFilter(filter: 'all' | 'pending' | 'attended' | 'noshow'): void {
    this.historyAttendanceFilter.set(filter);
    this.historyPage.set(1);
  }

  public onHistorySearchChange(val: string): void {
    this.historySearch.set(val);
    this.historyPage.set(1);
  }

  public onHistoryDateChange(val: string): void {
    this.historyDate.set(val);
    this.historyPage.set(1);
  }

  public onHistoryPaymentChange(val: any): void {
    this.historyPaymentFilter.set(val);
    this.historyPage.set(1);
  }

  public onHistorySortChange(val: any): void {
    this.historySort.set(val);
    this.historyPage.set(1);
  }

  public goToHistoryPage(page: number): void {
    const total = this.historyTotalPages();
    if (page >= 1 && page <= total) {
      this.historyPage.set(page);
    }
  }

  public onHistoryPageSizeChange(size: any): void {
    this.historyPageSize.set(Number(size));
    this.historyPage.set(1);
  }

  // User Search & Filters
  userSearchTerm = '';
  userFilterStatus: 'all' | 'active' | 'pending' = 'all';

  // Report Filters
  reportFilterMode: 'today' | 'week' | 'month' | 'lastMonth' | 'custom' = 'month';
  reportFromDate = '';
  reportToDate = '';

  // Payment Modal
  showPaymentModal = false;
  paymentTargetBooking: Booking | null = null;
  paymentAmount = 0;
  paymentMethod = 'كاش (نقدي في الملعب)';
  paymentNotes = '';

  actionInProgress: number | null = null;
  savingSettings = false;

  // In-App Reject Modal
  showRejectModal = false;
  rejectTargetBooking: Booking | null = null;
  rejectReasonText = 'اعتذار من إدارة الملعب لظروف خاصة';

  // In-App Delete Confirmation Modal
  showDeleteModal = false;
  deleteTargetBooking: Booking | null = null;

  showAlert(msg: string, type: string = 'alert-success'): void {
    this.alertTypeSignal.set(type);
    this.alertMessageSignal.set(msg);
    setTimeout(() => {
      if (this.alertMessageSignal() === msg) {
        this.alertMessageSignal.set('');
      }
    }, 5000);
  }

  settingsForm = {
    pitchName: '',
    location: '',
    description: '',
    hourlyRate: 160,
    openHour: 15,
    closeHour: 24,
    contactPhone: '',
    notice: ''
  };

  newUnavailable = {
    date: this.formatDate(new Date()),
    hour: 16,
    reason: 'صيانة أرضية الملعب'
  };

  hourOptions: Array<{ value: number; label: string }> = [];
  private subscriptions = new Subscription();

  ngOnInit(): void {
    this.initHourOptions();
    this.loadPendingRequests();
    this.loadUsers();
    this.loadSettings();
    this.loadUnavailableSlots();

    // Real-Time Subscriptions: Instantly update Signals when events are broadcast
    this.subscriptions.add(
      this.realtimeService.bookingUpdated$.subscribe(() => {
        this.loadPendingRequests();
        if (this.activeTab === 'history') {
          this.loadConfirmedBookings();
        }
        if (this.activeTab === 'reports') {
          this.loadReports();
        }
      })
    );

    this.subscriptions.add(
      this.realtimeService.userUpdated$.subscribe(() => {
        this.loadUsers();
      })
    );

    this.subscriptions.add(
      this.realtimeService.settingsUpdated$.subscribe(() => {
        this.loadSettings();
      })
    );

    this.subscriptions.add(
      this.realtimeService.unavailableSlotsUpdated$.subscribe(() => {
        this.loadUnavailableSlots();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get activeUsersCount(): number {
    return this.allUsersSignal().filter(u => u.isActive).length;
  }

  get filteredUsers(): UserProfile[] {
    let users = this.allUsersSignal();
    if (this.userFilterStatus === 'active') {
      users = users.filter(u => u.isActive);
    } else if (this.userFilterStatus === 'pending') {
      users = users.filter(u => !u.isActive);
    }

    const term = this.userSearchTerm.trim().toLowerCase();
    if (!term) return users;

    return users.filter(u =>
      (u.fullName && u.fullName.toLowerCase().includes(term)) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.phoneNumber && u.phoneNumber.includes(term)) ||
      (u.address && u.address.toLowerCase().includes(term))
    );
  }

  initHourOptions(): void {
    for (let i = 0; i <= 24; i++) {
      let label = `${i}:00`;
      if (i === 0 || i === 24) label = '12:00 منتصف الليل';
      else if (i < 12) label = `${i}:00 صباحاً`;
      else if (i === 12) label = '12:00 ظهراً';
      else label = `${i - 12}:00 مساءً`;

      this.hourOptions.push({ value: i, label });
    }
  }

  switchTab(tab: 'requests' | 'users' | 'settings' | 'unavailable' | 'history' | 'reports'): void {
    this.activeTab = tab;
    if (tab === 'requests') this.loadPendingRequests();
    if (tab === 'users') this.loadUsers();
    if (tab === 'settings') this.loadSettings();
    if (tab === 'unavailable') this.loadUnavailableSlots();
    if (tab === 'history') this.loadConfirmedBookings();
    if (tab === 'reports') this.loadReports();
  }

  // Pending Booking Requests
  loadPendingRequests(): void {
    this.loadingRequestsSignal.set(true);
    this.bookingService.getPendingRequests().subscribe({
      next: (data) => {
        this.pendingRequestsSignal.set(data);
        this.loadingRequestsSignal.set(false);
      },
      error: () => {
        this.loadingRequestsSignal.set(false);
      }
    });
  }

  approveBooking(req: Booking): void {
    this.actionInProgress = req.id;
    this.bookingService.approveBooking(req.id).subscribe({
      next: (res) => {
        this.actionInProgress = null;
        this.showAlert(res.message, 'alert-success');
        this.loadPendingRequests();
      },
      error: (err) => {
        this.actionInProgress = null;
        this.showAlert(err.error?.message || 'تعذر الموافقة على الحجز.', 'alert-danger');
      }
    });
  }

  openRejectModal(req: Booking): void {
    this.rejectTargetBooking = req;
    this.rejectReasonText = 'اعتذار من إدارة الملعب لظروف خاصة';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectTargetBooking = null;
  }

  confirmRejectBooking(): void {
    if (!this.rejectTargetBooking) return;
    const req = this.rejectTargetBooking;
    this.actionInProgress = req.id;

    this.bookingService.rejectBooking(req.id, this.rejectReasonText).subscribe({
      next: (res) => {
        this.actionInProgress = null;
        this.closeRejectModal();
        this.showAlert(res.message, 'alert-success');
        this.loadPendingRequests();
      },
      error: (err) => {
        this.actionInProgress = null;
        this.showAlert(err.error?.message || 'تعذر رفض الحجز.', 'alert-danger');
      }
    });
  }

  // Delete Booking Actions
  openDeleteModal(booking: Booking): void {
    this.deleteTargetBooking = booking;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteTargetBooking = null;
  }

  confirmDeleteBooking(): void {
    if (!this.deleteTargetBooking) return;
    const booking = this.deleteTargetBooking;
    this.actionInProgress = booking.id;

    this.bookingService.deleteBooking(booking.id).subscribe({
      next: (res) => {
        this.actionInProgress = null;
        this.closeDeleteModal();
        this.showAlert(res.message, 'alert-success');
        this.loadPendingRequests();
        if (this.activeTab === 'history') this.loadConfirmedBookings();
        if (this.activeTab === 'reports') this.loadReports();
      },
      error: (err) => {
        this.actionInProgress = null;
        this.showAlert(err.error?.message || 'تعذر حذف الحجز.', 'alert-danger');
      }
    });
  }

  // Users
  loadUsers(): void {
    this.pitchService.getPendingUsers().subscribe({
      next: (data) => this.pendingUsersSignal.set(data)
    });

    this.pitchService.getAllUsers().subscribe({
      next: (data) => this.allUsersSignal.set(data)
    });
  }

  activateUser(u: UserProfile): void {
    this.pitchService.activateUser(u.id).subscribe({
      next: (res) => {
        this.showAlert(res.message, 'alert-success');
        this.loadUsers();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'تعذر تفعيل المستخدم.', 'alert-danger');
      }
    });
  }

  deactivateUser(u: UserProfile): void {
    this.pitchService.deactivateUser(u.id).subscribe({
      next: (res) => {
        this.showAlert(res.message, 'alert-success');
        this.loadUsers();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'تعذر إيقاف المستخدم.', 'alert-danger');
      }
    });
  }

  // Settings
  loadSettings(): void {
    this.pitchService.getSettings().subscribe({
      next: (s) => {
        this.settingsSignal.set(s);
        this.settingsForm = {
          pitchName: s.pitchName,
          location: s.location,
          description: s.description,
          hourlyRate: s.hourlyRate,
          openHour: s.openHour,
          closeHour: s.closeHour,
          contactPhone: s.contactPhone,
          notice: s.notice
        };
      }
    });
  }

  saveSettings(): void {
    this.savingSettings = true;
    this.pitchService.updateSettings(this.settingsForm).subscribe({
      next: (res) => {
        this.savingSettings = false;
        this.showAlert(res.message, 'alert-success');
      },
      error: (err) => {
        this.savingSettings = false;
        this.showAlert(err.error?.message || 'تعذر حفظ الإعدادات.', 'alert-danger');
      }
    });
  }

  // Unavailable slots
  loadUnavailableSlots(): void {
    this.pitchService.getUnavailableSlots().subscribe({
      next: (data) => this.unavailableSlotsSignal.set(data)
    });
  }

  addUnavailableSlot(): void {
    this.pitchService.addUnavailableSlot(this.newUnavailable).subscribe({
      next: (res) => {
        this.showAlert(res.message, 'alert-success');
        this.loadUnavailableSlots();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'تعذر إضافة الساعة.', 'alert-danger');
      }
    });
  }

  removeUnavailableSlot(id: number): void {
    this.pitchService.removeUnavailableSlot(id).subscribe({
      next: (res) => {
        this.showAlert(res.message, 'alert-success');
        this.loadUnavailableSlots();
      },
      error: (err) => {
        this.showAlert(err.error?.message || 'تعذر إزالة الإغلاق.', 'alert-danger');
      }
    });
  }

  // History
  loadConfirmedBookings(): void {
    this.loadingHistorySignal.set(true);
    this.bookingService.getAllBookings(undefined, BookingStatus.Approved).subscribe({
      next: (data) => {
        this.loadingHistorySignal.set(false);
        this.confirmedBookingsSignal.set(data);
      },
      error: () => {
        this.loadingHistorySignal.set(false);
      }
    });
  }

  formatDateTime(dt: string): string {
    try {
      const d = new Date(dt);
      return d.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dt;
    }
  }

  formatHour(hour: number): string {
    if (hour === 0 || hour === 24) return '12:00 منتصف الليل';
    if (hour < 12) return `${hour}:00 صباحاً`;
    if (hour === 12) return '12:00 ظهراً';
    return `${hour - 12}:00 مساءً`;
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Attendance actions (Attended = 1, NoShow = 2, Reset = 0)
  markAttendance(booking: Booking, status: number): void {
    this.actionInProgress = booking.id;
    this.bookingService.updateAttendance(booking.id, status).subscribe({
      next: (res) => {
        this.actionInProgress = null;
        this.showAlert(res.message, 'alert-success');
        booking.attendance = status;
        if (this.activeTab === 'history') this.loadConfirmedBookings();
        if (this.activeTab === 'reports') this.loadReports();
      },
      error: (err) => {
        this.actionInProgress = null;
        this.showAlert(err.error?.message || 'تعذر تسجيل الحضور.', 'alert-danger');
      }
    });
  }

  // Payment Modal actions
  openPaymentModal(booking: Booking): void {
    this.paymentTargetBooking = booking;
    this.paymentAmount = booking.paidAmount > 0 ? booking.paidAmount : booking.totalPrice;
    this.paymentMethod = booking.paymentMethod || 'كاش (نقدي في الملعب)';
    this.paymentNotes = booking.paymentNotes || '';
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.paymentTargetBooking = null;
  }

  submitPayment(): void {
    if (!this.paymentTargetBooking) return;
    this.actionInProgress = this.paymentTargetBooking.id;

    this.bookingService.updatePayment(this.paymentTargetBooking.id, {
      paidAmount: Number(this.paymentAmount),
      paymentMethod: this.paymentMethod,
      paymentNotes: this.paymentNotes
    }).subscribe({
      next: (res) => {
        this.actionInProgress = null;
        this.showAlert(res.message, 'alert-success');
        this.closePaymentModal();
        if (this.activeTab === 'history') this.loadConfirmedBookings();
        if (this.activeTab === 'reports') this.loadReports();
      },
      error: (err) => {
        this.actionInProgress = null;
        this.showAlert(err.error?.message || 'تعذر تحديث الدفع.', 'alert-danger');
      }
    });
  }

  // Financial & Statistical Reports actions
  loadReports(): void {
    this.loadingReportsSignal.set(true);
    this.bookingService.getFinancialReport(this.reportFromDate || undefined, this.reportToDate || undefined).subscribe({
      next: (report) => {
        this.reportsSignal.set(report);
        this.loadingReportsSignal.set(false);
      },
      error: (err) => {
        this.loadingReportsSignal.set(false);
        this.showAlert(err.error?.message || 'تعذر جلب التقارير المالية.', 'alert-danger');
      }
    });
  }

  setReportFilter(mode: 'today' | 'week' | 'month' | 'lastMonth'): void {
    this.reportFilterMode = mode;
    const today = new Date();

    if (mode === 'today') {
      const dStr = this.formatDate(today);
      this.reportFromDate = dStr;
      this.reportToDate = dStr;
    } else if (mode === 'week') {
      const start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      this.reportFromDate = this.formatDate(start);
      this.reportToDate = this.formatDate(today);
    } else if (mode === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      this.reportFromDate = this.formatDate(start);
      this.reportToDate = this.formatDate(end);
    } else if (mode === 'lastMonth') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      this.reportFromDate = this.formatDate(start);
      this.reportToDate = this.formatDate(end);
    }

    this.loadReports();
  }

  applyCustomReportFilter(): void {
    this.reportFilterMode = 'custom';
    this.loadReports();
  }

  printReport(): void {
    window.print();
  }
}
