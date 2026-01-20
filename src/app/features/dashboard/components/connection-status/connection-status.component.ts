import { Component, Input, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectionState } from '../../../../core/models/stream-config.model';

@Component({
  selector: 'app-connection-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center space-x-3">
      <!-- Status Indicator -->
      <div class="flex items-center space-x-2">
        <div class="relative">
          <!-- Pulsing dot -->
          <span [class]="pulseClass()"></span>
          <!-- Main dot -->
          <span [class]="dotClass()"></span>
        </div>
        <span [class]="textClass()" class="text-sm font-medium">
          {{ statusText() }}
        </span>
      </div>

      <!-- Details Badge -->
      @if (showDetails()) {
        <div class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {{ detailsText() }}
        </div>
      }

      <!-- Latency (if available) -->
      @if (latency && status === 'connected') {
        <div class="flex items-center text-xs text-gray-500">
          <svg class="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {{ latency }}ms
        </div>
      }
    </div>
  `,
  styles: [`
    /* Pulsing animation */
    .pulse-green {
      animation: pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .pulse-yellow {
      animation: pulse-yellow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .pulse-red {
      animation: pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse-green {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    @keyframes pulse-yellow {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    @keyframes pulse-red {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionStatusComponent {
  @Input({ required: true }) status: ConnectionState['status'] = 'disconnected';
  @Input() reconnectAttempts = 0;
  @Input() lastConnected?: Date;
  @Input() latency?: number;

  // Computed values
  readonly statusText = computed(() => {
    switch (this.status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  });

  readonly dotClass = computed(() => {
    const base = 'absolute inline-flex h-3 w-3 rounded-full';
    switch (this.status) {
      case 'connected':
        return `${base} bg-green-500`;
      case 'connecting':
        return `${base} bg-yellow-500`;
      case 'disconnected':
        return `${base} bg-gray-400`;
      case 'error':
        return `${base} bg-red-500`;
      default:
        return `${base} bg-gray-400`;
    }
  });

  readonly pulseClass = computed(() => {
    const base = 'relative inline-flex h-3 w-3 rounded-full opacity-75';
    if (this.status === 'connected') {
      return `${base} bg-green-400 pulse-green`;
    }
    if (this.status === 'connecting') {
      return `${base} bg-yellow-400 pulse-yellow`;
    }
    if (this.status === 'error') {
      return `${base} bg-red-400 pulse-red`;
    }
    return `${base}`;
  });

  readonly textClass = computed(() => {
    switch (this.status) {
      case 'connected':
        return 'text-green-700';
      case 'connecting':
        return 'text-yellow-700';
      case 'disconnected':
        return 'text-gray-600';
      case 'error':
        return 'text-red-700';
      default:
        return 'text-gray-600';
    }
  });

  readonly showDetails = computed(() => {
    return this.reconnectAttempts > 0 || this.lastConnected;
  });

  readonly detailsText = computed(() => {
    if (this.reconnectAttempts > 0) {
      return `Retry ${this.reconnectAttempts}/10`;
    }
    if (this.lastConnected) {
      const minutesAgo = Math.floor(
        (Date.now() - this.lastConnected.getTime()) / 1000 / 60
      );
      if (minutesAgo < 1) return 'Just now';
      if (minutesAgo === 1) return '1 min ago';
      return `${minutesAgo} mins ago`;
    }
    return '';
  });
}