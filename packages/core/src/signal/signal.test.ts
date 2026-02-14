import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Signal, createSignal } from './signal';

describe('Signal', () => {
  describe('constructor and get', () => {
    test('initializes with value', () => {
      const signal = new Signal(42);
      expect(signal.get()).toBe(42);
    });

    test('initializes with null', () => {
      const signal = new Signal<string | null>(null);
      expect(signal.get()).toBeNull();
    });

    test('initializes with object', () => {
      const obj = { name: 'test' };
      const signal = new Signal(obj);
      expect(signal.get()).toBe(obj);
    });

    test('initializes with array', () => {
      const arr = [1, 2, 3];
      const signal = new Signal(arr);
      expect(signal.get()).toBe(arr);
    });
  });

  describe('set', () => {
    test('updates value', () => {
      const signal = new Signal(0);
      signal.set(10);
      expect(signal.get()).toBe(10);
    });

    test('does not notify if value is deeply equal', () => {
      const signal = new Signal({ a: 1 });
      let callCount = 0;
      signal.subscribe(() => { callCount++ });
      
      signal.set({ a: 1 }); // Deep equal
      expect(callCount).toBe(1); // Only initial call
    });

    test('notifies if value changes', () => {
      const signal = new Signal({ a: 1 });
      let callCount = 0;
      signal.subscribe(() => { callCount++ });
      
      signal.set({ a: 2 }); // Different
      expect(callCount).toBe(2); // Initial + change
    });

    test('does not update if destroying', () => {
      const signal = new Signal(0);
      signal.destroy();
      signal.set(10);
      expect(signal.get()).toBe(0); // Unchanged
    });
  });

  describe('update', () => {
    test('functional update', () => {
      const signal = new Signal(10);
      signal.update(x => x + 5);
      expect(signal.get()).toBe(15);
    });

    test('functional update with object', () => {
      const signal = new Signal({ count: 0 });
      signal.update(obj => ({ ...obj, count: obj.count + 1 }));
      expect(signal.get().count).toBe(1);
    });
  });

  describe('subscribe', () => {
    test('immediately invokes with current value', () => {
      const signal = new Signal('hello');
      let received: string | null = null;
      signal.subscribe(value => { received = value });
      expect(received).toBe('hello');
    });

    test('notifies on value change', () => {
      const signal = new Signal(0);
      const values: number[] = [];
      signal.subscribe(value => { values.push(value) });
      
      signal.set(1);
      signal.set(2);
      signal.set(3);
      
      expect(values).toEqual([0, 1, 2, 3]);
    });

    test('returns unsubscribe function', () => {
      const signal = new Signal(0);
      const values: number[] = [];
      const unsubscribe = signal.subscribe(value => { values.push(value) });
      
      signal.set(1);
      unsubscribe();
      signal.set(2);
      
      expect(values).toEqual([0, 1]);
    });

    test('calls destroy callback on signal destroy', () => {
      const signal = new Signal(0);
      let destroyed = false;
      signal.subscribe(() => {}, { destroy: () => { destroyed = true } });
      
      signal.destroy();
      expect(destroyed).toBe(true);
    });

    test('handles errors in subscriber gracefully', () => {
      const signal = new Signal(0);
      let secondCalled = false;
      
      signal.subscribe(() => { throw new Error('test error') });
      signal.subscribe(() => { secondCalled = true });
      
      signal.set(1);
      expect(secondCalled).toBe(true); // Second subscriber still called
    });
  });

  describe('destroy', () => {
    test('clears all subscribers', () => {
      const signal = new Signal(0);
      let callCount = 0;
      signal.subscribe(() => { callCount++ });
      
      signal.destroy();
      signal.set(1); // Should not notify
      
      expect(callCount).toBe(1); // Only initial call
    });

    test('calls all destroy callbacks', () => {
      const signal = new Signal(0);
      const destroyed: number[] = [];
      
      signal.subscribe(() => {}, { destroy: () => destroyed.push(1) });
      signal.subscribe(() => {}, { destroy: () => destroyed.push(2) });
      signal.subscribe(() => {}, { destroy: () => destroyed.push(3) });
      
      signal.destroy();
      expect(destroyed).toEqual([1, 2, 3]);
    });

    test('calls config onDestroy', () => {
      let configDestroyed = false;
      const signal = new Signal(0, { onDestroy: () => { configDestroyed = true } });
      
      signal.destroy();
      expect(configDestroyed).toBe(true);
    });

    test('is idempotent', () => {
      const signal = new Signal(0);
      let destroyCount = 0;
      signal.subscribe(() => {}, { destroy: () => destroyCount++ });
      
      signal.destroy();
      signal.destroy(); // Second call
      signal.destroy(); // Third call
      
      expect(destroyCount).toBe(1);
    });
  });

  describe('map', () => {
    test('creates derived signal', () => {
      const signal = new Signal(5);
      const doubled = signal.map(x => x * 2);
      
      expect(doubled.get()).toBe(10);
    });

    test('updates when parent updates', () => {
      const signal = new Signal(5);
      const doubled = signal.map(x => x * 2);
      
      signal.set(10);
      expect(doubled.get()).toBe(20);
    });

    test('destroys when parent destroys', () => {
      const signal = new Signal(5);
      const doubled = signal.map(x => x * 2);

      // Track if derived's subscriber destroy callbacks fire
      let derivedSubscriberDestroyed = false;
      doubled.subscribe(() => {}, { destroy: () => { derivedSubscriberDestroyed = true } });

      signal.destroy();

      // Derived signal's subscribers should have been destroyed via cascade
      expect(derivedSubscriberDestroyed).toBe(true);
    });

    test('supports chaining', () => {
      const signal = new Signal(2);
      const result = signal
        .map(x => x * 3)  // 6
        .map(x => x + 4); // 10
      
      expect(result.get()).toBe(10);
      
      signal.set(5);
      expect(result.get()).toBe(19); // (5 * 3) + 4
    });
  });
});

describe('createSignal', () => {
  test('creates signal with initial value', () => {
    const signal = createSignal('test');
    expect(signal.get()).toBe('test');
  });

  test('creates signal with config', () => {
    let destroyed = false;
    const signal = createSignal('test', { onDestroy: () => destroyed = true });
    
    signal.destroy();
    expect(destroyed).toBe(true);
  });
});

describe('map cleanup', () => {
  test('unsubscribes from parent when derived signal is destroyed directly', () => {
    const signal = new Signal(5);
    const doubled = signal.map(x => x * 2);

    expect(doubled.get()).toBe(10);

    doubled.destroy();

    signal.set(20);
    expect(doubled.get()).toBe(10); // Still 10, not 40
  });

  test('cascades destruction through chained maps', () => {
    const signal = new Signal(2);
    const tripled = signal.map(x => x * 3);
    const plusFour = tripled.map(x => x + 4);

    let leafDestroyed = false;
    plusFour.subscribe(() => {}, { destroy: () => { leafDestroyed = true } });

    // Destroying root should cascade through tripled → plusFour
    signal.destroy();
    expect(leafDestroyed).toBe(true);
  });

  test('derived destroy is idempotent after parent destroy', () => {
    const signal = new Signal(5);
    const doubled = signal.map(x => x * 2);

    let destroyCount = 0;
    doubled.subscribe(() => {}, { destroy: () => { destroyCount++ } });

    signal.destroy();    // Cascades to doubled
    doubled.destroy();   // Should be no-op (already destroyed)

    expect(destroyCount).toBe(1);
  });
});

describe('cleanSubscribers', () => {
  test('destroys subscribers but keeps signal alive', () => {
    const signal = new Signal(5);
    let destroyed = false;
    signal.subscribe(() => {}, { destroy: () => { destroyed = true } });

    signal.cleanSubscribers();
    expect(destroyed).toBe(true);

    // Signal still works — can subscribe and update
    let received: number | null = null;
    signal.subscribe(v => { received = v });
    expect(received).toBe(5);

    signal.set(10);
    expect(received).toBe(10);
  });

  test('destroys derived signals created by map', () => {
    const signal = new Signal(5);
    const doubled = signal.map(x => x * 2);

    let derivedSubscriberDestroyed = false;
    doubled.subscribe(() => {}, { destroy: () => { derivedSubscriberDestroyed = true } });

    signal.cleanSubscribers();
    expect(derivedSubscriberDestroyed).toBe(true);

    // Parent signal still alive — can create new derived signals
    const tripled = signal.map(x => x * 3);
    signal.set(10);
    expect(tripled.get()).toBe(30);
  });
});
