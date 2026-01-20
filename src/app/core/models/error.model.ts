
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: Date;
  retryable: boolean;
  metadata?: Record<string, unknown>;
}

// Known error codes
export const ERROR_CODES = {
  WEBSOCKET_CONNECTION_FAILED: 'WS_CONN_FAILED',
  WEBSOCKET_CLOSED: 'WS_CLOSED',
  INVALID_MESSAGE: 'INVALID_MSG',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;