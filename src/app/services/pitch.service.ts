import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AddUnavailableSlotRequest, PitchSetting, UnavailableSlot } from '../models/pitch.models';
import { UserProfile } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class PitchService {
  private readonly apiUrl = `${environment.apiUrl}/pitchsettings`;
  private readonly bookingsUrl = `${environment.apiUrl}/bookings`;
  private readonly adminUsersUrl = `${environment.apiUrl}/adminusers`;

  constructor(private http: HttpClient) {}

  getSettings(): Observable<PitchSetting> {
    return this.http.get<PitchSetting>(this.apiUrl);
  }

  updateSettings(settings: Partial<PitchSetting>): Observable<{ message: string; settings: PitchSetting }> {
    return this.http.put<{ message: string; settings: PitchSetting }>(this.apiUrl, settings);
  }

  getUnavailableSlots(date?: string): Observable<UnavailableSlot[]> {
    const url = date ? `${this.apiUrl}/unavailable-slots?date=${date}` : `${this.apiUrl}/unavailable-slots`;
    return this.http.get<UnavailableSlot[]>(url);
  }

  addUnavailableSlot(data: AddUnavailableSlotRequest): Observable<{ message: string; slot: UnavailableSlot }> {
    return this.http.post<{ message: string; slot: UnavailableSlot }>(`${this.apiUrl}/unavailable-slots`, data);
  }

  removeUnavailableSlot(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/unavailable-slots/${id}`);
  }

  // Admin user approvals
  getPendingUsers(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(`${this.adminUsersUrl}/pending`);
  }

  getAllUsers(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(`${this.adminUsersUrl}/all`);
  }

  getActiveUsersForBooking(): Observable<UserProfile[]> {
    return this.http.get<UserProfile[]>(`${this.bookingsUrl}/active-users`);
  }

  activateUser(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.adminUsersUrl}/activate/${id}`, {});
  }

  deactivateUser(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.adminUsersUrl}/deactivate/${id}`, {});
  }
}
