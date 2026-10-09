import { Booking } from './booking.models';

export interface PitchSetting {
  id: number;
  pitchName: string;
  location: string;
  description: string;
  hourlyRate: number;
  openHour: number;
  closeHour: number;
  contactPhone: string;
  notice: string;
}

export interface UnavailableSlot {
  id: number;
  date: string;
  hour: number;
  reason: string;
  createdAt: string;
}

export interface AddUnavailableSlotRequest {
  date: string;
  hour: number;
  reason: string;
}

export interface ScheduleSlot {
  hour: number;
  timeLabel: string;
  status: 'Available' | 'Booked' | 'Unavailable' | 'PendingMine';
  statusArabicLabel: string;
  isAvailable: boolean;
  isBooked: boolean;
  isUnavailable: boolean;
  unavailableReason?: string;
  confirmedBookingId?: number;
  bookedByUserName?: string;
  bookedByFullName?: string;
  bookedForPhone?: string;
  bookedType?: number;
  pendingRequestsCount: number;
  currentUserHasPendingRequest: boolean;
  pendingRequests: Booking[];
}

export interface DaySchedule {
  date: string;
  dayNameArabic: string;
  hourlyRate: number;
  openHour: number;
  closeHour: number;
  slots: ScheduleSlot[];
}
