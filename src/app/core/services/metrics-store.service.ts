import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Metric, MetricAggregate, MetricType } from '../models/metric.model';
import { MetricsState, INITIAL_STATE } from '../models/state.model';
import { StreamConfig } from '../models/stream-config.model';
import { WebSocketService } from './websocket.service';
import { applyBackpressure } from '../../shared/operators/backpressure.operator';
import { tap, filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class MetricsStore {
  private ws = inject(WebSocketService);

  // Immutable state signal
  private state = signal<MetricsState>(INITIAL_STATE);

  // Selectors (computed signals)
  readonly metrics = computed(() => this.state().metrics);
  readonly connection = computed(() => this.state().connection);
  readonly isPaused = computed(() => this.state().isPaused);
  readonly config = computed(() => this.state().config);
  readonly errors = computed(() => this.state().errors);
  readonly lastUpdate = computed(() => this.state().lastUpdate);

  // Derived selectors
  readonly isConnected = computed(() => 
    this.state().connection.status === 'connected'
  );

  readonly metricsArray = computed(() => 
    Array.from(this.state().metrics.values())
  );

  readonly hasErrors = computed(() => 
    this.state().errors.length > 0
  );

  // Get specific metric aggregate
  readonly getMetric = (type: MetricType) => computed(() => 
    this.state().metrics.get(type)
  );

  constructor() {
    this.initializeMetricsStream();
    this.initializeConnectionSync();
    
    // Debug effect (development only)
    if (!this.isProduction()) {
      effect(() => {
        console.log('📊 Metrics State Updated:', {
          metricsCount: this.state().metrics.size,
          isPaused: this.state().isPaused,
          connection: this.state().connection.status,
        });
      });
    }
  }

  /**
   * Initialize metrics stream from WebSocket
   */
  private initializeMetricsStream(): void {
    this.ws.metrics$
      .pipe(
        // Don't process if paused
        filter(() => !this.state().isPaused),
        
        // Apply backpressure based on config
        applyBackpressure(this.state().config),
        
        // Log in development
        tap((metric) => {
          if (!this.isProduction()) {
            console.log('📈 Metric received:', metric);
          }
        }),
        
        takeUntilDestroyed()
      )
      .subscribe({
        next: (metric: Metric | Metric[]) => {
          // Handle both single metrics and batches (from buffer strategy)
          const metrics = Array.isArray(metric) ? metric : [metric];
          this.addMetrics(metrics);
        },
        error: (error) => {
          this.addError({
            code: 'METRICS_STREAM_ERROR',
            message: error.message || 'Failed to process metrics',
            severity: 'error',
            timestamp: new Date(),
            retryable: true,
          });
        },
      });
  }

  /**
   * Sync connection state from WebSocket service
   */
  private initializeConnectionSync(): void {
    this.ws.connectionState$
      .pipe(takeUntilDestroyed())
      .subscribe((connectionState) => {
        this.updateState({ connection: connectionState });
      });
  }

  /**
   * Add metrics and update aggregates
   */
  private addMetrics(metrics: Metric[]): void {
    const currentState = this.state();
    const newRawMetrics = [...currentState.rawMetrics, ...metrics].slice(-1000); // Keep last 1000
    const newMetricsMap = new Map(currentState.metrics);

    metrics.forEach((metric) => {
      const existing = newMetricsMap.get(metric.type);
      const aggregate = this.calculateAggregate(metric, existing, newRawMetrics);
      newMetricsMap.set(metric.type, aggregate);
    });

    this.updateState({
      metrics: newMetricsMap,
      rawMetrics: newRawMetrics,
      lastUpdate: new Date(),
    });
  }

  /**
   * Calculate metric aggregate
   */
  private calculateAggregate(
    newMetric: Metric,
    existing: MetricAggregate | undefined,
    allMetrics: Metric[]
  ): MetricAggregate {
    // Get last 50 values of this type for history
    const typeMetrics = allMetrics
      .filter((m) => m.type === newMetric.type)
      .slice(-50)
      .map((m) => m.value);

    const values = [...typeMetrics, newMetric.value];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (existing) {
      const diff = newMetric.value - existing.current;
      const threshold = existing.avg * 0.1; // 10% threshold
      if (diff > threshold) trend = 'up';
      else if (diff < -threshold) trend = 'down';
    }

    return {
      type: newMetric.type,
      current: newMetric.value,
      avg: Math.round(avg * 100) / 100,
      max: Math.round(max * 100) / 100,
      min: Math.round(min * 100) / 100,
      trend,
      history: typeMetrics.slice(-20), // Last 20 for sparkline
    };
  }

  // ============ Public Actions ============

  /**
   * Start the stream
   */
  start(): void {
    this.ws.connect();
    this.updateState({ isPaused: false });
  }

  /**
   * Pause metric processing (keep connection)
   */
  pause(): void {
    this.updateState({ isPaused: true });
  }

  /**
   * Resume metric processing
   */
  resume(): void {
    this.updateState({ isPaused: false });
  }

  /**
   * Stop and disconnect
   */
  stop(): void {
    this.ws.disconnect();
    this.updateState({ isPaused: true });
  }

  /**
   * Update backpressure strategy
   */
  updateConfig(config: Partial<StreamConfig>): void {
    this.updateState({
      config: { ...this.state().config, ...config },
    });
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.updateState({
      metrics: new Map(),
      rawMetrics: [],
      lastUpdate: null,
    });
  }

  /**
   * Clear errors
   */
  clearErrors(): void {
    this.updateState({ errors: [] });
  }

  /**
   * Add error to state
   */
  private addError(error: MetricsState['errors'][0]): void {
    const errors = [...this.state().errors, error].slice(-10); // Keep last 10
    this.updateState({ errors });
  }

  /**
   * Update state immutably
   */
  private updateState(partial: Partial<MetricsState>): void {
    this.state.update((current) => ({
      ...current,
      ...partial,
    }));
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.ws.disconnect();
    this.state.set(INITIAL_STATE);
  }

  /**
   * Check if production environment
   */
  private isProduction(): boolean {
    // Replace with actual environment check
    return false; // Set to true for production
  }
}