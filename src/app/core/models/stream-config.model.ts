export type BackpressureStrategy = 'throttle' | 'debounce' | 'buffer' | 'sample';

export interface StreamConfig {
  strategy: BackpressureStrategy;
  interval: number; // milliseconds
  bufferSize?: number; // for buffer strategy
}

export interface ConnectionState {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastConnected?: Date;
  reconnectAttempts: number;
  latency?: number; // ms
}