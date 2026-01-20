import { Observable, OperatorFunction } from 'rxjs';
import { windowTime, mergeMap, take } from 'rxjs/operators';
import { throwError } from 'rxjs';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  throwOnLimit?: boolean;
}

/**
 * Rate limiting operator - throws error if limit exceeded
 */
export function rateLimit<T>(
  config: RateLimitConfig
): OperatorFunction<T, T> {
  return (source$: Observable<T>) => {
    return source$.pipe(
      windowTime(config.windowMs),
      mergeMap((window$, index) => {
        return window$.pipe(
          take(config.maxRequests),
          mergeMap((value, valueIndex) => {
            if (valueIndex >= config.maxRequests && config.throwOnLimit) {
              return throwError(() => ({
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Rate limit exceeded: ${config.maxRequests} requests per ${config.windowMs}ms`,
              }));
            }
            return [value];
          })
        );
      })
    );
  };
}