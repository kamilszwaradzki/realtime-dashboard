import { Observable, OperatorFunction, interval } from 'rxjs';
import { 
  throttleTime, 
  debounceTime, 
  bufferTime, 
  sample,
  filter,
} from 'rxjs/operators';
import { BackpressureStrategy } from '../../core/models/stream-config.model';

export interface BackpressureConfig {
  strategy: BackpressureStrategy;
  interval: number;
  bufferSize?: number;
}

/**
 * Applies backpressure strategy to handle high-frequency data streams
 * 
 * @example
 * metrics$.pipe(
 *   applyBackpressure({ strategy: 'throttle', interval: 1000 })
 * )
 */
export function applyBackpressure<T>(
  config: BackpressureConfig
): OperatorFunction<T, T | T[]> {
  return (source$: Observable<T>) => {
    switch (config.strategy) {
      case 'throttle':
        // Emit first value, then ignore for interval duration
        return source$.pipe(
          throttleTime(config.interval, undefined, { 
            leading: true, 
            trailing: false 
          })
        );

      case 'debounce':
        // Wait for silence before emitting
        return source$.pipe(
          debounceTime(config.interval)
        );

      case 'buffer':
        // Collect values and emit as batch
        return source$.pipe(
          bufferTime(config.interval),
          filter(arr => arr.length > 0)
        );

      case 'sample':
        // Emit most recent value at regular intervals
        return source$.pipe(
          sample(interval(config.interval))
        );

      default:
        return source$;
    }
  };
}