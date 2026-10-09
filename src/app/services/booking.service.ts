import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DaySchedule } from '../models/pitch.models';
import { Booking, CreateBookingRequest } from '../models/booking.models';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly apiUrl = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpClient) {}

  getDaySchedule(date: string): Observable<DaySchedule> {
    return this.http.get<DaySchedule>(`${this.apiUrl}/schedule?date=${date}`);
  }

  requestBooking(request: CreateBookingRequest): Observable<{ message: string; booking: Booking }> {
    return this.http.post<{ message: string; booking: Booking }>(`${this.apiUrl}/request`, request);
  }

  getMyBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/my-bookings`);
  }

  cancelBooking(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/cancel/${id}`, {});
  }

  // Admin methods
  getPendingRequests(date?: string): Observable<Booking[]> {
    const url = date ? `${this.apiUrl}/admin/pending-requests?date=${date}` : `${this.apiUrl}/admin/pending-requests`;
    return this.http.get<Booking[]>(url);
  }

  getAllBookings(fromDate?: string, status?: number): Observable<Booking[]> {
    let url = `${this.apiUrl}/admin/all?`;
    if (fromDate) url += `fromDate=${fromDate}&`;
    if (status !== undefined && status !== null) url += `status=${status}&`;
    return this.http.get<Booking[]>(url);
  }

  approveBooking(id: number): Observable<{ message: string; rejectedCount: number }> {
    return this.http.post<{ message: string; rejectedCount: number }>(`${this.apiUrl}/admin/approve/${id}`, {});
  }

  rejectBooking(id: number, reason?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/admin/reject/${id}`, { reason });
  }

  updateAttendance(id: number, attendance: number): Observable<{ message: string; booking: Booking }> {
    return this.http.put<{ message: string; booking: Booking }>(`${this.apiUrl}/admin/${id}/attendance`, { attendance });
  }

  updatePayment(id: number, data: { paidAmount: number; paymentMethod?: string; paymentNotes?: string }): Observable<{ message: string; booking: Booking }> {
    return this.http.put<{ message: string; booking: Booking }>(`${this.apiUrl}/admin/${id}/payment`, data);
  }

  getFinancialReport(fromDate?: string, toDate?: string): Observable<any> {
    let url = `${this.apiUrl}/reports?`;
    if (fromDate) url += `fromDate=${fromDate}&`;
    if (toDate) url += `toDate=${toDate}&`;
    return this.http.get<any>(url);
  }

  deleteBooking(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/admin/${id}`);
  }
}
