import { Observable, OperatorFunction, tap } from 'rxjs';

/**
 * Development helper - logs stream events
 */
export function logStream<T>(
  label: string,
  detailed = false
): OperatorFunction<T, T> {
  return (source$: Observable<T>) => {
    return source$.pipe(
      tap({
        next: (value) => {
          if (detailed) {
            console.log(`[${label}] Next:`, value);
          } else {
            console.log(`[${label}] ✓`);
          }
        },
        error: (error) => console.error(`[${label}] Error:`, error),
        complete: () => console.log(`[${label}] Complete`),
      })
    );
  };
}