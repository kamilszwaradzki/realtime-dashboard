import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  timer,
  merge,
  NEVER,
  fromEvent,
  throwError,
} from 'rxjs';
import {
  map,
  filter,
  switchMap,
  retry,
  shareReplay,
  tap,
  catchError,
  startWith,
  distinctUntilChanged,
} from 'rxjs/operators';
import { Metric } from '../../core/models/metric.model';
import { ConnectionState } from '../../core/models/stream-config.model';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private destroyRef = inject(DestroyRef);
  
  // WebSocket URL - można to przenieść do environment
  private readonly WS_URL = 'ws://localhost:3000';
  
  // Subjects for connection management
  private connectionSubject = new Subject<ConnectionState>();
  private messageSubject = new Subject<Metric>();
  private errorSubject = new Subject<Error>();
  
  // WebSocket instance
  private socket: WebSocket | null = null;
  
  // Reconnection state
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  
  /**
   * Observable for connection state changes
   */
  readonly connectionState$: Observable<ConnectionState> = 
    this.connectionSubject.asObservable().pipe(
      startWith({
        status: 'disconnected' as const,
        reconnectAttempts: 0,
      }),
      distinctUntilChanged((a, b) => a.status === b.status),
      shareReplay({ bufferSize: 1, refCount: true })
    );

  /**
   * Observable for incoming metrics
   * Auto-reconnects with exponential backoff
   */
  readonly metrics$: Observable<Metric> = this.createMetricsStream();

  /**
   * Observable for errors
   */
  readonly errors$ = this.errorSubject.asObservable();

  constructor() {
    // Auto-cleanup on service destroy
    this.destroyRef.onDestroy(() => this.disconnect());
  }

  /**
   * Manually connect to WebSocket
   */
  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected');
      return;
    }

    this.createConnection();
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    
    this.updateConnectionState({
      status: 'disconnected',
      reconnectAttempts: 0,
    });
  }

  /**
   * Create WebSocket connection and set up event handlers
   */
  private createConnection(): void {
    try {
      this.updateConnectionState({
        status: 'connecting',
        reconnectAttempts: this.reconnectAttempts,
      });

      this.socket = new WebSocket(this.WS_URL);

      // Connection opened
      this.socket.addEventListener('open', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        
        this.updateConnectionState({
          status: 'connected',
          lastConnected: new Date(),
          reconnectAttempts: 0,
        });
      });

      // Message received
      this.socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Check if it's an error message from server
          if (data.error) {
            this.handleError(new Error(data.error));
            return;
          }

          // Parse and emit metric
          const metric: Metric = {
            ...data,
            timestamp: new Date(data.timestamp),
          };
          
          this.messageSubject.next(metric);
        } catch (error) {
          this.handleError(new Error('Failed to parse message'));
        }
      });

      // Connection closed
      this.socket.addEventListener('close', (event) => {
        console.warn('WebSocket closed', event.code, event.reason);
        
        this.updateConnectionState({
          status: 'disconnected',
          reconnectAttempts: this.reconnectAttempts,
        });

        // Auto-reconnect if not a clean close
        if (event.code !== 1000 && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.scheduleReconnect();
        }
      });

      // Error occurred
      this.socket.addEventListener('error', (event) => {
        console.error('WebSocket error', event);
        this.handleError(new Error('WebSocket connection error'));
      });

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`
    );

    timer(delay)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.createConnection();
      });
  }

  /**
   * Create the metrics stream with error handling
   */
  private createMetricsStream(): Observable<Metric> {
    return this.messageSubject.asObservable().pipe(
      // Add timestamp if missing
      map(metric => ({
        ...metric,
        timestamp: metric.timestamp || new Date(),
      })),
      // Share among subscribers
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  /**
   * Update connection state
   */
  private updateConnectionState(state: Partial<ConnectionState>): void {
    this.connectionSubject.next({
      status: state.status || 'disconnected',
      reconnectAttempts: state.reconnectAttempts || 0,
      lastConnected: state.lastConnected,
      latency: state.latency,
    });
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('WebSocket Service Error:', error);
    this.errorSubject.next(error);
    
    this.updateConnectionState({
      status: 'error',
      reconnectAttempts: this.reconnectAttempts,
    });
  }
  
  /**
   * Send message to server (for future use)
   */
  send(message: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message - WebSocket not connected');
    }
  }
}