import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricsStore } from '../../../core/services/metrics-store.service';
import { MetricCardComponent } from '../components/metric-card/metric-card.component';
import { StreamControlsComponent } from '../components/stream-controls/stream-controls.component';
import { ChartWidgetComponent } from './chart-widget/chart-widget.component';
import { ConnectionStatusComponent } from '../components/connection-status/connection-status.component';
import { ErrorListComponent } from './error-list/error-list.component';
import { StreamConfig } from '../../../core/models/stream-config.model';
import { MetricType } from '../../../core/models/metric.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MetricCardComponent,
    StreamControlsComponent,
    ChartWidgetComponent,
    ConnectionStatusComponent,
    ErrorListComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">
                Real-time Metrics Dashboard
              </h1>
              <p class="mt-1 text-sm text-gray-500">
                Live monitoring with backpressure handling
              </p>
            </div>
            
            <!-- Connection Status -->
            <app-connection-status 
              [status]="connection().status"
              [reconnectAttempts]="connection().reconnectAttempts"
              [lastConnected]="connection().lastConnected"
            />
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <!-- Stream Controls -->
        <div class="mb-6">
          <app-stream-controls
            [isPaused]="isPaused()"
            [isConnected]="isConnected()"
            [config]="config()"
            (start)="onStart()"
            (pause)="onPause()"
            (resume)="onResume()"
            (stop)="onStop()"
            (configChange)="onConfigChange($event)"
            (clear)="onClear()"
          />
        </div>

        <!-- Error List -->
        @if (hasErrors()) {
          <div class="mb-6">
            <app-error-list
              [errors]="errors()"
              (clearErrors)="onClearErrors()"
            />
          </div>
        }

        <!-- Metrics Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          @for (metric of metricsArray(); track metric.type) {
            <app-metric-card
              [metric]="metric"
              [threshold]="getMetricThreshold(metric.type)()"
            />
          } @empty {
            <div class="col-span-full">
              <div class="bg-white rounded-lg shadow-sm p-12 text-center">
                <div class="text-gray-400 mb-4">
                  <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">
                  No metrics yet
                </h3>
                <p class="text-gray-500">
                  {{ isConnected() ? 'Waiting for data...' : 'Connect to start receiving metrics' }}
                </p>
              </div>
            </div>
          }
        </div>

        <!-- Charts Section -->
        @if (metricsArray().length > 0) {
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            @for (metric of metricsArray(); track metric.type) {
              <app-chart-widget
                [metric]="metric"
                [title]="getMetricTitle(metric.type)"
              />
            }
          </div>
        }

        <!-- Debug Info (development only) -->
        @if (!isProduction()) {
          <div class="mt-8 bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs">
            <details>
              <summary class="cursor-pointer hover:text-white">Debug Info</summary>
              <pre class="mt-2">{{ debugInfo() | json }}</pre>
            </details>
          </div>
        }

      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private store = inject(MetricsStore);

  // Signals from store
  readonly metricsArray = this.store.metricsArray;
  readonly connection = this.store.connection;
  readonly isPaused = this.store.isPaused;
  readonly isConnected = this.store.isConnected;
  readonly config = this.store.config;
  readonly errors = this.store.errors;
  readonly hasErrors = this.store.hasErrors;
  readonly lastUpdate = this.store.lastUpdate;

  // Component state
  readonly isProduction = signal(false);

  // Thresholds for metric alerts
  private readonly thresholds = {
    cpu: 80,
    memory: 85,
    network: 90,
    disk: 75,
  };

  ngOnInit(): void {
    // Auto-connect on component init
    this.store.start();
  }

  // ============ Event Handlers ============

  onStart(): void {
    this.store.start();
  }

  onPause(): void {
    this.store.pause();
  }

  onResume(): void {
    this.store.resume();
  }

  onStop(): void {
    this.store.stop();
  }

  onConfigChange(config: Partial<StreamConfig>): void {
    this.store.updateConfig(config);
  }

  onClear(): void {
    this.store.clearMetrics();
  }

  onClearErrors(): void {
    this.store.clearErrors();
  }

  // ============ Helpers ============

  readonly getMetricThreshold = (type: MetricType) => computed(() => 
    this.thresholds[type as keyof typeof this.thresholds] || 80
  );

  getMetricTitle(type: string): string {
    const titles: Record<string, string> = {
      cpu: 'CPU Usage',
      memory: 'Memory Usage',
      network: 'Network Traffic',
      disk: 'Disk I/O',
    };
    return titles[type] || type.toUpperCase();
  }

  debugInfo = computed(() => ({  // zrób computed signal
    connection: this.connection(),
    isPaused: this.isPaused(),
    metricsCount: this.metricsArray().length,
    lastUpdate: this.lastUpdate()?.toISOString(),
    config: this.config(),
  }));
}