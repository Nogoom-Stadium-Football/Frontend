export enum BookingType {
  Weekly = 0,    // حجز أسبوعي (لمرة واحدة في اليوم المحدد)
  Continuous = 1 // حجز مستمر (متكرر أسبوعياً)
}

export enum BookingStatus {
  Pending = 0,  // معلق
  Approved = 1, // مؤكد / محجوز
  Rejected = 2, // مرفوض
  Cancelled = 3 // ملغي
}

export enum AttendanceStatus {
  NotSet = 0,   // لم يسجل بعد (قيد الانتظار)
  Attended = 1, // حضر ولعب
  NoShow = 2    // لم يحضر (تغيب)
}

export enum PaymentStatus {
  Unpaid = 0,        // غير مدفوع
  PartiallyPaid = 1, // مدفوع جزئياً (عربون)
  FullyPaid = 2      // مدفوع بالكامل
}

export interface Booking {
  id: number;
  userId?: number;
  userName: string;
  userFullName: string;
  userPhoneNumber: string;
  userAddress: string;
  bookedForName: string;
  bookedForPhone: string;
  bookingDate: string;
  startHour: number;
  durationHours: number;
  endHour: number;
  pricePerHour: number;
  totalPrice: number;
  type: BookingType;
  typeName: string;
  status: BookingStatus;
  statusName: string;
  createdAt: string;
  approvedAt?: string;
  notes?: string;
  rejectionReason?: string;

  // Attendance
  attendance: AttendanceStatus;
  attendanceName?: string;
  attendanceMarkedAt?: string;

  // Payment
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  paymentStatusName?: string;
  paymentMethod?: string;
  paymentNotes?: string;
  paymentUpdatedAt?: string;
}

export interface CreateBookingRequest {
  bookingDate: string;
  startHour: number;
  durationHours: number;
  type: BookingType;
  notes?: string;
  targetUserId?: number;
  customContactName?: string;
  customContactPhone?: string;
}

export interface PitchFinancialReport {
  fromDate: string;
  toDate: string;

  // Hours
  todayBookedHours: number;
  currentMonthBookedHours: number;
  rangeBookedHours: number;
  rangeTotalAvailableHours: number;
  occupancyRatePercentage: number;

  // Counts
  totalBookingsInRange: number;
  approvedBookingsInRange: number;
  pendingBookingsInRange: number;
  cancelledOrRejectedInRange: number;

  // Attendance
  attendedCount: number;
  attendedHours: number;
  attendedRevenue: number;
  noShowCount: number;
  noShowHours: number;
  noShowPotentialLoss: number;
  upcomingOrNotSetCount: number;

  // Payments
  rangeTotalValue: number;
  rangeTotalCollected: number;
  rangeTotalOutstanding: number;

  fullyPaidCount: number;
  fullyPaidTotal: number;

  partiallyPaidCount: number;
  partiallyPaidCollected: number;
  partiallyPaidRemaining: number;

  unpaidCount: number;
  unpaidTotal: number;

  // Insights
  peakHours: PeakHourStat[];
  topPlayers: PlayerStat[];
  noShowPlayers: PlayerStat[];
  detailedBookings: Booking[];
}

export interface PeakHourStat {
  hour: number;
  timeLabel: string;
  bookingsCount: number;
  totalHours: number;
}

export interface PlayerStat {
  userId?: number;
  name: string;
  phoneNumber: string;
  totalBookings: number;
  attendedCount: number;
  noShowCount: number;
  totalSpent: number;
  outstandingDebt: number;
}
