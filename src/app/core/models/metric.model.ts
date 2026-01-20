export type MetricType = 'cpu' | 'memory' | 'network' | 'disk';

export interface Metric {
  id: string;
  type: MetricType;
  value: number;
  timestamp: Date;
  metadata?: {
    source?: string;
    region?: string;
  };
}

export interface MetricAggregate {
  type: MetricType;
  current: number;
  avg: number;
  max: number;
  min: number;
  trend: 'up' | 'down' | 'stable';
  history: number[]; // Last N values for sparkline
}