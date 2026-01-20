import { Injectable } from '@angular/core';
import { fromEvent, timer } from 'rxjs';
import { map, throttleTime, retry, shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DataStreamService {
  private socket = new WebSocket('ws://localhost:3000/metrics');

  metrics$ = fromEvent<MessageEvent>(this.socket, 'message').pipe(
    throttleTime(1000),
    map(event => {
      try {
        return JSON.parse(event.data);
      } catch (err) {
        console.error('Invalid JSON from WS:', event.data);
        throw err; // albo return null / custom error
      }
    }),

    retry({
      count: 5,
      delay: (error, retryCount) => timer(100 * Math.pow(2, retryCount)), // 100ms → 200 → 400 → 800 → 1600
    }),

    shareReplay({ bufferSize: 1, refCount: true })
  );
}