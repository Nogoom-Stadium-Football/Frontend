import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';

export interface BookingUpdatedEvent {
  date: string;
  action: string;
}

export interface UnavailableSlotsUpdatedEvent {
  date?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeService {
  private hubConnection: signalR.HubConnection | null = null;

  // Angular Signals for connection status
  public isConnectedSignal = signal<boolean>(false);

  // Observable and Signal triggers for events
  public readonly bookingUpdated$ = new Subject<BookingUpdatedEvent>();
  public readonly settingsUpdated$ = new Subject<void>();
  public readonly unavailableSlotsUpdated$ = new Subject<UnavailableSlotsUpdatedEvent>();
  public readonly userUpdated$ = new Subject<void>();

  // Signals for quick inspection
  public readonly lastBookingEventSignal = signal<BookingUpdatedEvent | null>(null);

  constructor() {
    this.startConnection();
  }

  private startConnection(): void {
    const hubUrl = 'http://localhost:5194/hubs/pitch';

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.registerListeners();

    this.hubConnection
      .start()
      .then(() => {
        this.isConnectedSignal.set(true);
      })
      .catch(() => {
        this.isConnectedSignal.set(false);
      });

    this.hubConnection.onreconnected(() => {
      this.isConnectedSignal.set(true);
    });

    this.hubConnection.onclose(() => {
      this.isConnectedSignal.set(false);
    });
  }

  private registerListeners(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('BookingUpdated', (data: BookingUpdatedEvent) => {
      this.lastBookingEventSignal.set(data);
      this.bookingUpdated$.next(data);
    });

    this.hubConnection.on('SettingsUpdated', () => {
      this.settingsUpdated$.next();
    });

    this.hubConnection.on('UnavailableSlotsUpdated', (data: UnavailableSlotsUpdatedEvent) => {
      this.unavailableSlotsUpdated$.next(data);
    });

    this.hubConnection.on('UserUpdated', () => {
      this.userUpdated$.next();
    });
  }
}
