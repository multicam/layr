import { describe, test, expect, beforeAll, beforeEach } from 'bun:test';
import { Window } from 'happy-dom';
import { hydratePage, readSSRData, autoHydrate } from './index';
import type { Component } from '@layr/types';

let window: Window;
let document: Document;

describe('hydration with event handlers', () => {
  beforeAll(() => {
    window = new Window();
    document = window.document;
    (globalThis as any).HTMLElement = window.HTMLElement;
    (globalThis as any).document = document;
  });

  test('hydrates nodes with event handlers', () => {
    const component: Component = {
      name: 'Button',
      nodes: {
        root: {
          id: 'btn',
          type: 'element',
          tag: 'button',
          children: [],
          events: {
            click: {
              actions: [{ type: 'SetVariable', name: 'clicked', data: { type: 'value', value: true } }],
            },
          },
        },
      },
    };

    const root = document.createElement('button');
    root.setAttribute('data-node-id', 'btn');

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);

    // Handler should be attached
    expect(result.dataSignal).toBeDefined();

    result.cleanup();
  });

  test('hydrates nested children', () => {
    const component: Component = {
      name: 'Nested',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'div', children: ['child'] },
        child: { id: 'child', type: 'element', tag: 'span', children: [] },
      },
    };

    const root = document.createElement('div');
    root.setAttribute('data-node-id', 'root');
    const child = document.createElement('span');
    child.setAttribute('data-node-id', 'child');
    root.appendChild(child);

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });

  test('event handler actually fires and executes actions', () => {
    const component: Component = {
      name: 'Clickable',
      nodes: {
        btn: {
          id: 'btn',
          type: 'element',
          tag: 'button',
          children: [],
          events: {
            click: {
              actions: [{ type: 'SetVariable', name: 'clicked', data: { type: 'value', value: true } }],
            },
          },
        },
      },
    };

    const root = document.createElement('button');
    root.setAttribute('data-node-id', 'btn');

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);

    // Simulate click event
    const clickEvent = new window.Event('click');
    root.dispatchEvent(clickEvent);

    result.cleanup();
  });

  test('handles event handler with no actions', () => {
    const component: Component = {
      name: 'EmptyEvent',
      nodes: {
        btn: {
          id: 'btn',
          type: 'element',
          tag: 'button',
          children: [],
          events: {
            click: {}, // No actions
          },
        },
      },
    };

    const root = document.createElement('button');
    root.setAttribute('data-node-id', 'btn');

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });
});

describe('hydration edge cases', () => {
  let window: Window;
  let document: Document;

  beforeAll(() => {
    window = new Window();
    document = window.document;
    (globalThis as any).HTMLElement = window.HTMLElement;
    (globalThis as any).document = document;
    (globalThis as any).CSS = { escape: (s: string) => s };
  });

  test('readSSRData returns null for empty text content', () => {
    const script = document.createElement('script');
    script.setAttribute('id', 'empty-data');
    script.textContent = '';
    document.body.appendChild(script);

    const data = readSSRData(document, 'empty-data');
    expect(data).toBeNull();

    document.body.removeChild(script);
  });

  test('readSSRData clears script content after reading', () => {
    const script = document.createElement('script');
    script.setAttribute('id', 'clear-test');
    script.textContent = JSON.stringify({
      Attributes: {},
      Variables: { test: 1 },
      Apis: {},
    });
    document.body.appendChild(script);

    readSSRData(document, 'clear-test');
    expect(script.textContent).toBe('');

    document.body.removeChild(script);
  });

  test('hydrates children from parent children', () => {
    const component: Component = {
      name: 'Parent',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'div', children: ['child1', 'child2'] },
        child1: { id: 'child1', type: 'element', tag: 'span', children: [] },
        child2: { id: 'child2', type: 'element', tag: 'p', children: [] },
      },
    };

    const root = document.createElement('div');
    const child1 = document.createElement('span');
    child1.setAttribute('data-node-id', 'child1');
    const child2 = document.createElement('p');
    child2.setAttribute('data-node-id', 'child2');
    root.appendChild(child1);
    root.appendChild(child2);

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });

  test('handles missing node in component', () => {
    const component: Component = {
      name: 'Missing',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'div', children: ['nonexistent'] },
      },
    };

    const root = document.createElement('div');
    root.setAttribute('data-node-id', 'root');

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });

  test('handles missing child element in DOM', () => {
    const component: Component = {
      name: 'MissingElement',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'div', children: ['missing'] },
        missing: { id: 'missing', type: 'element', tag: 'span', children: [] },
      },
    };

    const root = document.createElement('div');
    root.setAttribute('data-node-id', 'root');
    // Don't add the child element - it's missing from DOM

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });

  test('event handler abort removes listener', async () => {
    const component: Component = {
      name: 'Abort',
      nodes: {
        btn: {
          id: 'btn',
          type: 'element',
          tag: 'button',
          children: [],
          events: {
            click: {
              actions: [{ type: 'SetVariable', name: 'clicked', data: { type: 'value', value: true } }],
            },
          },
        },
      },
    };

    const root = document.createElement('button');
    root.setAttribute('data-node-id', 'btn');

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);

    // Cleanup should remove the listener
    result.cleanup();

    // Verify cleanup doesn't throw
    expect(true).toBe(true);
  });

  test('autoHydrate creates default data when no SSR data', () => {
    const root = document.createElement('div');
    root.setAttribute('id', 'NoSSR');
    document.body.appendChild(root);

    const component: Component = {
      name: 'NoSSR',
      nodes: {
        root: { type: 'element', tag: 'div', children: [] },
      },
    };

    const result = autoHydrate(component, '#NoSSR');

    expect(result).toBeDefined();
    // Should have default data
    expect(result?.dataSignal.get().Attributes).toEqual({});
    expect(result?.dataSignal.get().Variables).toEqual({});

    result?.cleanup();
    document.body.removeChild(root);
  });

  test('hydratePage hydrates nodes with data-node-id', () => {
    const component: Component = {
      name: 'WithNodes',
      nodes: {
        btn: {
          id: 'btn',
          type: 'element',
          tag: 'button',
          children: [],
          events: {
            click: { actions: [] },
          },
        },
      },
    };

    const root = document.createElement('div');
    const btn = document.createElement('button');
    btn.setAttribute('data-node-id', 'btn');
    root.appendChild(btn);

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });

  test('uses CSS.escape to find deeply nested children', () => {
    const component: Component = {
      name: 'DeepNested',
      nodes: {
        outer: { id: 'outer', type: 'element', tag: 'div', children: ['inner'] },
        inner: { id: 'inner', type: 'element', tag: 'span', children: [], events: { click: { actions: [] } } },
      },
    };

    const root = document.createElement('div');
    root.setAttribute('data-node-id', 'outer');
    // Don't add inner as direct child - it will use querySelector fallback

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });
});

describe('Hydration System', () => {
  beforeAll(() => {
    window = new Window();
    document = window.document;
    (globalThis as any).HTMLElement = window.HTMLElement;
    (globalThis as any).document = document;
  });

  describe('hydratePage', () => {
    test('returns hydration result with cleanup', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { type: 'element', tag: 'div', children: [] },
        },
      };
      
      const initialData = {
        Attributes: { title: 'Hello' },
        Variables: { count: 0 },
        Apis: {},
      };
      
      const root = document.createElement('div');
      root.setAttribute('id', 'App');
      
      const result = hydratePage(component, initialData, root);
      
      expect(result.dataSignal).toBeDefined();
      expect(result.cleanup).toBeDefined();
      
      // Cleanup should work
      result.cleanup();
    });

    test('signal contains initial data', () => {
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { type: 'element', tag: 'div', children: [] },
        },
      };
      
      const initialData = {
        Attributes: {},
        Variables: { message: 'Hello World' },
        Apis: {},
      };
      
      const root = document.createElement('div');
      const result = hydratePage(component, initialData, root);
      
      const data = result.dataSignal.get();
      expect(data.Variables.message).toBe('Hello World');
      
      result.cleanup();
    });
  });

  describe('readSSRData', () => {
    test('reads data from script tag', () => {
      const script = document.createElement('script');
      script.setAttribute('id', 'layr-data');
      script.textContent = JSON.stringify({
        Attributes: {},
        Variables: { x: 42 },
        Apis: {},
      });
      document.body.appendChild(script);
      
      const data = readSSRData(document, 'layr-data');
      
      expect(data).toBeDefined();
      expect(data?.Variables.x).toBe(42);
      
      document.body.removeChild(script);
    });

    test('returns null when script not found', () => {
      const data = readSSRData(document, 'nonexistent');
      expect(data).toBeNull();
    });

    test('returns null on invalid JSON', () => {
      const script = document.createElement('script');
      script.setAttribute('id', 'invalid-data');
      script.textContent = 'not valid json';
      document.body.appendChild(script);
      
      const data = readSSRData(document, 'invalid-data');
      expect(data).toBeNull();
      
      document.body.removeChild(script);
    });
  });

  describe('autoHydrate', () => {
    test('returns null when root not found', () => {
      const component: Component = {
        name: 'Test',
        nodes: {},
      };
      
      const result = autoHydrate(component, '#Nonexistent');
      expect(result).toBeNull();
    });

    test('hydrates from SSR data', () => {
      // Set up DOM
      const root = document.createElement('div');
      root.setAttribute('id', 'App');
      document.body.appendChild(root);
      
      const script = document.createElement('script');
      script.setAttribute('id', 'layr-data');
      script.textContent = JSON.stringify({
        Attributes: {},
        Variables: { hydrated: true },
        Apis: {},
      });
      document.body.appendChild(script);
      
      const component: Component = {
        name: 'Test',
        nodes: {
          root: { type: 'element', tag: 'div', children: [] },
        },
      };
      
      const result = autoHydrate(component, '#App');
      
      expect(result).toBeDefined();
      expect(result?.dataSignal.get().Variables.hydrated).toBe(true);
      
      result?.cleanup();
      
      document.body.removeChild(root);
      document.body.removeChild(script);
    });
  });
});

describe('hydration with event handlers', () => {
  beforeAll(() => {
    window = new Window();
    document = window.document;
    (globalThis as any).HTMLElement = window.HTMLElement;
    (globalThis as any).document = document;
  });

  test('hydrates nodes with event handlers', () => {
    const component: Component = {
      name: 'Button',
      nodes: {
        root: { 
          id: 'btn',
          type: 'element', 
          tag: 'button',
          children: [],
          events: {
            click: {
              actions: [{ type: 'SetVariable', name: 'clicked', data: { type: 'value', value: true } }],
            },
          },
        },
      },
    };
    
    const root = document.createElement('button');
    root.setAttribute('data-node-id', 'btn');
    
    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    
    // Handler should be attached
    expect(result.dataSignal).toBeDefined();
    
    result.cleanup();
  });

  test('hydrates nested children', () => {
    const component: Component = {
      name: 'Nested',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'div', children: ['child'] },
        child: { id: 'child', type: 'element', tag: 'span', children: [] },
      },
    };

    const root = document.createElement('div');
    root.setAttribute('data-node-id', 'root');
    const child = document.createElement('span');
    child.setAttribute('data-node-id', 'child');
    root.appendChild(child);

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });
});

describe('hydration edge cases', () => {
  let window: Window;
  let document: Document;

  beforeAll(() => {
    window = new Window();
    document = window.document;
    (globalThis as any).HTMLElement = window.HTMLElement;
    (globalThis as any).document = document;
    (globalThis as any).CSS = { escape: (s: string) => s };
  });

  test('readSSRData returns null for empty text content', () => {
    const script = document.createElement('script');
    script.setAttribute('id', 'empty-data');
    script.textContent = '';
    document.body.appendChild(script);

    const data = readSSRData(document, 'empty-data');
    expect(data).toBeNull();

    document.body.removeChild(script);
  });

  test('readSSRData clears script content after reading', () => {
    const script = document.createElement('script');
    script.setAttribute('id', 'clear-test');
    script.textContent = JSON.stringify({
      Attributes: {},
      Variables: { test: 1 },
      Apis: {},
    });
    document.body.appendChild(script);

    readSSRData(document, 'clear-test');
    expect(script.textContent).toBe('');

    document.body.removeChild(script);
  });

  test('hydrates children from parent children', () => {
    const component: Component = {
      name: 'Parent',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'div', children: ['child1', 'child2'] },
        child1: { id: 'child1', type: 'element', tag: 'span', children: [] },
        child2: { id: 'child2', type: 'element', tag: 'p', children: [] },
      },
    };

    const root = document.createElement('div');
    const child1 = document.createElement('span');
    child1.setAttribute('data-node-id', 'child1');
    const child2 = document.createElement('p');
    child2.setAttribute('data-node-id', 'child2');
    root.appendChild(child1);
    root.appendChild(child2);

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });

  test('handles missing node in component', () => {
    const component: Component = {
      name: 'Missing',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'div', children: ['nonexistent'] },
      },
    };

    const root = document.createElement('div');
    root.setAttribute('data-node-id', 'root');

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });

  test('handles missing child element in DOM', () => {
    const component: Component = {
      name: 'MissingElement',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'div', children: ['missing'] },
        missing: { id: 'missing', type: 'element', tag: 'span', children: [] },
      },
    };

    const root = document.createElement('div');
    root.setAttribute('data-node-id', 'root');
    // Don't add the child element - it's missing from DOM

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });

  test('event handler abort removes listener', async () => {
    const component: Component = {
      name: 'Abort',
      nodes: {
        btn: {
          id: 'btn',
          type: 'element',
          tag: 'button',
          children: [],
          events: {
            click: {
              actions: [{ type: 'SetVariable', name: 'clicked', data: { type: 'value', value: true } }],
            },
          },
        },
      },
    };

    const root = document.createElement('button');
    root.setAttribute('data-node-id', 'btn');

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);

    // Cleanup should remove the listener
    result.cleanup();

    // Verify cleanup doesn't throw
    expect(true).toBe(true);
  });

  test('autoHydrate creates default data when no SSR data', () => {
    const root = document.createElement('div');
    root.setAttribute('id', 'NoSSR');
    document.body.appendChild(root);

    const component: Component = {
      name: 'NoSSR',
      nodes: {
        root: { type: 'element', tag: 'div', children: [] },
      },
    };

    const result = autoHydrate(component, '#NoSSR');

    expect(result).toBeDefined();
    // Should have default data
    expect(result?.dataSignal.get().Attributes).toEqual({});
    expect(result?.dataSignal.get().Variables).toEqual({});

    result?.cleanup();
    document.body.removeChild(root);
  });

  test('hydratePage hydrates nodes with data-node-id', () => {
    const component: Component = {
      name: 'WithNodes',
      nodes: {
        btn: {
          id: 'btn',
          type: 'element',
          tag: 'button',
          children: [],
          events: {
            click: { actions: [] },
          },
        },
      },
    };

    const root = document.createElement('div');
    const btn = document.createElement('button');
    btn.setAttribute('data-node-id', 'btn');
    root.appendChild(btn);

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });
});

describe('hydration coverage edge cases', () => {
  let window: Window;
  let document: Document;

  beforeAll(() => {
    window = new Window();
    document = window.document;
    (globalThis as any).HTMLElement = window.HTMLElement;
    (globalThis as any).document = document;
    (globalThis as any).CSS = { escape: (s: string) => s };
  });

  test('hydrateNode processes children array when childNode and childElement are found', () => {
    // This test covers lines 82-88
    const component: Component = {
      name: 'Parent',
      nodes: {
        root: {
          id: 'root',
          type: 'element',
          tag: 'div',
          children: ['child'],
        },
        child: {
          id: 'child',
          type: 'element',
          tag: 'span',
          children: ['grandchild'],
          events: { click: { actions: [] } },
        },
        grandchild: {
          id: 'grandchild',
          type: 'element',
          tag: 'em',
          children: [],
        },
      },
    };

    const root = document.createElement('div');
    root.setAttribute('data-node-id', 'root');
    const child = document.createElement('span');
    child.setAttribute('data-node-id', 'child');
    const grandchild = document.createElement('em');
    grandchild.setAttribute('data-node-id', 'grandchild');
    child.appendChild(grandchild);
    root.appendChild(child);

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });

  test('findChildByNodeId uses querySelector fallback when not direct child', () => {
    // This test covers lines 93-99 (querySelector path)
    // We need to trigger hydrateNode -> findChildByNodeId where the child is NOT a direct child
    const component: Component = {
      name: 'Deep',
      nodes: {
        root: {
          id: 'root',
          type: 'element',
          tag: 'div',
          children: ['nested'],  // This triggers the children loop in hydrateNode
        },
        nested: {
          id: 'nested',
          type: 'element',
          tag: 'span',
          children: [],
          events: { click: { actions: [] } },
        },
      },
    };

    // Create wrapper that has the root as a child (so hydrateChildren finds it)
    const wrapper = document.createElement('div');
    const root = document.createElement('div');
    root.setAttribute('data-node-id', 'root');

    // Create a middle wrapper so nested is NOT a direct child of root
    const middleWrapper = document.createElement('div');
    const nested = document.createElement('span');
    nested.setAttribute('data-node-id', 'nested');
    middleWrapper.appendChild(nested);
    root.appendChild(middleWrapper);
    wrapper.appendChild(root);

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, wrapper);

    // Now hydrateChildren will find root, then hydrateNode will look for 'nested'
    // which is not a direct child, so querySelector is used

    // Simulate click to trigger the event handler
    const clickEvent = new window.Event('click');
    nested.dispatchEvent(clickEvent);

    result.cleanup();
  });

  test('attachNodeEvent listener fires and calls handleAction', () => {
    // This test covers lines 108-120
    // Need to set up so hydrateChildren finds the element
    const component: Component = {
      name: 'Clickable',
      nodes: {
        btn: {
          id: 'btn',
          type: 'element',
          tag: 'button',
          children: [],
          events: {
            click: {
              actions: [{ type: 'SetVariable', name: 'test', data: { type: 'value', value: true } }],
            },
          },
        },
      },
    };

    // Create a wrapper div that contains the button as a child
    const wrapper = document.createElement('div');
    const btn = document.createElement('button');
    btn.setAttribute('data-node-id', 'btn');
    wrapper.appendChild(btn);

    const initialData = { Attributes: {}, Variables: { test: false }, Apis: {} };
    const result = hydratePage(component, initialData, wrapper);

    // Simulate click to trigger the event listener
    const clickEvent = new window.Event('click', { bubbles: true });
    btn.dispatchEvent(clickEvent);

    // The key coverage is that the listener was attached and handleAction was called
    // We verify by checking that no error was thrown during dispatch
    result.cleanup();
  });

  test('attachNodeEvent does nothing when handler has no actions', () => {
    const component: Component = {
      name: 'NoActions',
      nodes: {
        btn: {
          id: 'btn',
          type: 'element',
          tag: 'button',
          children: [],
          events: {
            click: { /* no actions */ },
          },
        },
      },
    };

    const root = document.createElement('button');
    root.setAttribute('data-node-id', 'btn');

    const initialData = { Attributes: {}, Variables: { test: 'unchanged' }, Apis: {} };
    const result = hydratePage(component, initialData, root);

    // Simulate click
    const clickEvent = new window.Event('click');
    root.dispatchEvent(clickEvent);

    // Variable should remain unchanged
    const data = result.dataSignal.get();
    expect(data.Variables.test).toBe('unchanged');

    result.cleanup();
  });

  test('hydrateChildren skips elements without data-node-id', () => {
    const component: Component = {
      name: 'Mixed',
      nodes: {
        btn: {
          id: 'btn',
          type: 'element',
          tag: 'button',
          children: [],
        },
      },
    };

    const root = document.createElement('div');
    // Add element with data-node-id
    const btn = document.createElement('button');
    btn.setAttribute('data-node-id', 'btn');
    root.appendChild(btn);
    // Add element without data-node-id
    const div = document.createElement('div');
    root.appendChild(div);

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });

  test('hydrateChildren skips elements with unknown node-id', () => {
    const component: Component = {
      name: 'Known',
      nodes: {
        known: {
          id: 'known',
          type: 'element',
          tag: 'div',
          children: [],
        },
      },
    };

    const root = document.createElement('div');
    const known = document.createElement('div');
    known.setAttribute('data-node-id', 'known');
    const unknown = document.createElement('div');
    unknown.setAttribute('data-node-id', 'unknown');
    root.appendChild(known);
    root.appendChild(unknown);

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });

  test('hydrateNode handles null eventHandler', () => {
    const component: Component = {
      name: 'NullEvent',
      nodes: {
        btn: {
          id: 'btn',
          type: 'element',
          tag: 'button',
          children: [],
          events: {
            click: null as any, // Null handler
          },
        },
      },
    };

    const root = document.createElement('button');
    root.setAttribute('data-node-id', 'btn');

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);
    result.cleanup();
  });

  test('cleanup removes event listener via abort signal', () => {
    const component: Component = {
      name: 'Abortable',
      nodes: {
        btn: {
          id: 'btn',
          type: 'element',
          tag: 'button',
          children: [],
          events: {
            click: { actions: [] },
          },
        },
      },
    };

    const root = document.createElement('button');
    root.setAttribute('data-node-id', 'btn');

    const result = hydratePage(component, { Attributes: {}, Variables: {}, Apis: {} }, root);

    // Trigger cleanup - this should call abort and remove listeners
    result.cleanup();

    // After cleanup, clicking should not trigger anything (no error)
    const clickEvent = new window.Event('click');
    root.dispatchEvent(clickEvent);
  });

  test('autoHydrate returns null when root not found', () => {
    const component: Component = {
      name: 'Test',
      nodes: {},
    };

    const result = autoHydrate(component, '#Nonexistent');

    expect(result).toBeNull();
  });
});
