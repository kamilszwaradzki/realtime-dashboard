import { Metric, MetricAggregate, MetricType } from '../models/metric.model';
import { ConnectionState, StreamConfig } from '../models/stream-config.model';
import { AppError } from '../models/error.model';

export interface MetricsState {
  metrics: Map<MetricType, MetricAggregate>;
  rawMetrics: Metric[]; // Last 1000 for history
  connection: ConnectionState;
  config: StreamConfig;
  isPaused: boolean;
  errors: AppError[];
  lastUpdate: Date | null;
}

export const INITIAL_STATE: MetricsState = {
  metrics: new Map(),
  rawMetrics: [],
  connection: {
    status: 'disconnected',
    reconnectAttempts: 0,
  },
  config: {
    strategy: 'throttle',
    interval: 1000,
  },
  isPaused: false,
  errors: [],
  lastUpdate: null,
};