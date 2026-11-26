import { TestScheduler } from 'rxjs/testing';
import { applyBackpressure } from './backpressure.operator';

describe('applyBackpressure', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('throttle: emits the first value and drops the rest within the interval', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source = cold('abc 7ms d|');
      const result = source.pipe(applyBackpressure({ strategy: 'throttle', interval: 5 }));
      expectObservable(result).toBe('a 9ms d|');
    });
  });

  it('debounce: emits only after the stream goes quiet', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source = cold('abc 10ms d|');
      const result = source.pipe(applyBackpressure({ strategy: 'debounce', interval: 5 }));
      expectObservable(result).toBe('7ms c 6ms (d|)');
    });
  });

  it('buffer: groups values into batches and skips empty windows', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source = cold('ab 10ms c|');
      const result = source.pipe(applyBackpressure({ strategy: 'buffer', interval: 5 }));
      expectObservable(result).toBe('5ms x 7ms (y|)', { x: ['a', 'b'], y: ['c'] });
    });
  });

  it('sample: emits the latest value on each tick', () => {
    scheduler.run(({ cold, expectObservable }) => {
      const source = cold('ab 5ms c 10ms |');
      const result = source.pipe(applyBackpressure({ strategy: 'sample', interval: 5 }));
      expectObservable(result).toBe('5ms b 4ms c 7ms |');
    });
  });
});
