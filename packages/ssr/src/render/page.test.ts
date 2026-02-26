import { describe, test, expect } from 'bun:test';
import { renderPageBody, escapeHtml } from './page';
import type { Component } from '@layr/types';

describe('escapeHtml', () => {
  test('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('escapes less than', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  test('escapes greater than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  test('escapes double quote', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  test('escapes single quote', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  test('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  test('leaves normal text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  test('escapes multiple special chars', () => {
    expect(escapeHtml('<div class="test">&</div>')).toBe('&lt;div class=&quot;test&quot;&gt;&amp;&lt;/div&gt;');
  });
});

describe('renderPageBody', () => {
  test('renders empty component', () => {
    const component: Component = {
      name: 'Empty',
      nodes: { root: { type: 'element', tag: 'div', children: [] } },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('<div');
    expect(result.html).toContain('</div>');
  });

  test('renders text node', () => {
    const component: Component = {
      name: 'Text',
      nodes: {
        root: { type: 'element', tag: 'div', children: ['text1'] },
        text1: { type: 'text', value: { type: 'value', value: 'Hello' } },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('Hello');
  });

  test('escapes text content', () => {
    const component: Component = {
      name: 'Escaped',
      nodes: {
        root: { type: 'element', tag: 'div', children: ['text1'] },
        text1: { type: 'text', value: { type: 'value', value: '<script>alert(1)</script>' } },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('&lt;script&gt;');
    expect(result.html).not.toContain('<script>');
  });

  test('renders void element', () => {
    const component: Component = {
      name: 'Void',
      nodes: {
        root: { type: 'element', tag: 'img', children: [] },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('<img');
    expect(result.html).toContain('/>');
  });

  test('renders nested elements', () => {
    const component: Component = {
      name: 'Nested',
      nodes: {
        root: { type: 'element', tag: 'div', children: ['child'] },
        child: { type: 'element', tag: 'span', children: [] },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('<div');
    expect(result.html).toContain('<span');
    expect(result.html).toContain('</span>');
    expect(result.html).toContain('</div>');
  });

  test('returns apiCache', () => {
    const component: Component = {
      name: 'Test',
      nodes: { root: { type: 'element', tag: 'div', children: [] } },
    };

    const result = renderPageBody(component);
    expect(result.apiCache).toBeDefined();
    expect(typeof result.apiCache).toBe('object');
  });

  test('returns customProperties', () => {
    const component: Component = {
      name: 'Test',
      nodes: { root: { type: 'element', tag: 'div', children: [] } },
    };

    const result = renderPageBody(component);
    expect(result.customProperties).toBeDefined();
    expect(typeof result.customProperties).toBe('object');
  });

  test('renders with component variables', () => {
    const component: Component = {
      name: 'WithVariables',
      nodes: { root: { type: 'element', tag: 'div', children: [] } },
      variables: {
        message: { initialValue: { type: 'value', value: 'Hello World' } }
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('<div');
  });
});

describe('renderPageBody edge cases', () => {
  test('renders nested elements', () => {
    const component: Component = {
      name: 'Nested',
      nodes: {
        root: { type: 'element', tag: 'div', children: ['child'] },
        child: { type: 'element', tag: 'span', children: ['grandchild'] },
        grandchild: { type: 'element', tag: 'em', children: [] },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('<div');
    expect(result.html).toContain('<span');
    expect(result.html).toContain('<em');
    expect(result.html).toContain('</em>');
    expect(result.html).toContain('</span>');
    expect(result.html).toContain('</div>');
  });

  test('renders void elements correctly', () => {
    const voidTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];

    for (const tag of voidTags) {
      const component: Component = {
        name: 'Void',
        nodes: {
          root: { type: 'element', tag, children: [] },
        },
      };

      const result = renderPageBody(component);
      expect(result.html).toContain(`<${tag}`);
      expect(result.html).toContain('/>');
    }
  });

  test('renders component nodes', () => {
    const component: Component = {
      name: 'WithComponent',
      nodes: {
        root: { type: 'component', name: 'ChildComponent', attrs: {}, children: [] },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('data-component="ChildComponent"');
  });

  test('renders slot nodes with children', () => {
    const component: Component = {
      name: 'WithSlot',
      nodes: {
        root: { type: 'slot', children: ['child1'] },
        child1: { type: 'element', tag: 'span', children: [] },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('<span');
  });

  test('handles empty component', () => {
    const component: Component = {
      name: 'Empty',
      nodes: {},
    };

    const result = renderPageBody(component);
    expect(result.html).toBe('');
  });

  test('handles component without root', () => {
    const component: Component = {
      name: 'NoRoot',
      nodes: {
        other: { type: 'element', tag: 'div', children: [] },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toBe('');
  });

  test('renders multiple text nodes', () => {
    const component: Component = {
      name: 'MultipleText',
      nodes: {
        root: { type: 'element', tag: 'p', children: ['t1', 't2'] },
        t1: { type: 'text', value: { type: 'value', value: 'First' } },
        t2: { type: 'text', value: { type: 'value', value: 'Second' } },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('First');
    expect(result.html).toContain('Second');
  });

  test('escapes HTML in text values', () => {
    const component: Component = {
      name: 'Escaped',
      nodes: {
        root: { type: 'text', value: { type: 'value', value: '<script>alert(1)</script>' } },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('&lt;script&gt;');
    expect(result.html).not.toContain('<script>');
  });

  test('escapes quotes in text', () => {
    const component: Component = {
      name: 'Quotes',
      nodes: {
        root: { type: 'text', value: { type: 'value', value: 'Say "hello"' } },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('&quot;');
  });
});

describe('renderPageBody condition handling', () => {
  test('renders element with true condition', () => {
    const component: Component = {
      name: 'Conditional',
      nodes: {
        root: {
          type: 'element',
          tag: 'div',
          children: [],
          condition: { type: 'value', value: true }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('<div');
  });

  test('hides element with false condition', () => {
    const component: Component = {
      name: 'Conditional',
      nodes: {
        root: {
          type: 'element',
          tag: 'div',
          children: [],
          condition: { type: 'value', value: false }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toBe('');
  });

  test('hides element with falsy condition', () => {
    const component: Component = {
      name: 'Conditional',
      nodes: {
        root: {
          type: 'element',
          tag: 'div',
          children: [],
          condition: { type: 'value', value: null }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toBe('');
  });

  test('shows element with truthy string condition', () => {
    const component: Component = {
      name: 'Conditional',
      nodes: {
        root: {
          type: 'element',
          tag: 'div',
          children: [],
          condition: { type: 'value', value: 'yes' }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('<div');
  });
});

describe('renderPageBody repeat handling', () => {
  test('repeats element for array items', () => {
    const component: Component = {
      name: 'Repeat',
      nodes: {
        root: {
          type: 'element',
          tag: 'li',
          children: [],
          repeat: { type: 'value', value: [1, 2, 3] }
        },
      },
    };

    const result = renderPageBody(component);
    // Should render 3 li elements
    const matches = result.html.match(/<li/g);
    expect(matches?.length).toBe(3);
  });

  test('does not repeat for non-array', () => {
    const component: Component = {
      name: 'Repeat',
      nodes: {
        root: {
          type: 'element',
          tag: 'div',
          children: [],
          repeat: { type: 'value', value: 'not an array' }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toBe('');
  });

  test('does not repeat for null', () => {
    const component: Component = {
      name: 'Repeat',
      nodes: {
        root: {
          type: 'element',
          tag: 'div',
          children: [],
          repeat: { type: 'value', value: null }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toBe('');
  });

  test('handles empty array', () => {
    const component: Component = {
      name: 'Repeat',
      nodes: {
        root: {
          type: 'element',
          tag: 'div',
          children: [],
          repeat: { type: 'value', value: [] }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toBe('');
  });
});

describe('renderPageBody attributes', () => {
  test('renders element with attributes', () => {
    const component: Component = {
      name: 'Attrs',
      nodes: {
        root: {
          type: 'element',
          tag: 'div',
          children: [],
          attrs: {
            id: { type: 'value', value: 'main' },
            class: { type: 'value', value: 'container' }
          }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('id="main"');
    expect(result.html).toContain('class="container"');
  });

  test('renders boolean attribute as present', () => {
    const component: Component = {
      name: 'BoolAttr',
      nodes: {
        root: {
          type: 'element',
          tag: 'input',
          children: [],
          attrs: {
            disabled: { type: 'value', value: true }
          }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('disabled');
  });

  test('omits false boolean attribute', () => {
    const component: Component = {
      name: 'BoolAttr',
      nodes: {
        root: {
          type: 'element',
          tag: 'input',
          children: [],
          attrs: {
            disabled: { type: 'value', value: false }
          }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).not.toContain('disabled');
  });

  test('omits null attribute value', () => {
    const component: Component = {
      name: 'NullAttr',
      nodes: {
        root: {
          type: 'element',
          tag: 'div',
          children: [],
          attrs: {
            title: { type: 'value', value: null }
          }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).not.toContain('title=');
  });

  test('omits undefined attribute value', () => {
    const component: Component = {
      name: 'UndefAttr',
      nodes: {
        root: {
          type: 'element',
          tag: 'div',
          children: [],
          attrs: {
            title: { type: 'value', value: undefined }
          }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).not.toContain('title=');
  });

  test('escapes attribute values', () => {
    const component: Component = {
      name: 'EscapedAttr',
      nodes: {
        root: {
          type: 'element',
          tag: 'div',
          children: [],
          attrs: {
            'data-value': { type: 'value', value: '"hello" & <world>' }
          }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('&quot;hello&quot;');
    expect(result.html).toContain('&amp;');
    expect(result.html).toContain('&lt;world&gt;');
  });

  test('rejects invalid attribute names', () => {
    const component: Component = {
      name: 'InvalidAttr',
      nodes: {
        root: {
          type: 'element',
          tag: 'div',
          children: [],
          attrs: {
            'onclick="alert(1)"': { type: 'value', value: 'bad' }
          }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).not.toContain('onclick');
  });
});

describe('renderPageBody security', () => {
  test('rejects invalid tag names', () => {
    const component: Component = {
      name: 'InvalidTag',
      nodes: {
        root: {
          type: 'element',
          tag: 'script>alert(1)</script',
          children: [],
        },
      },
    };

    const result = renderPageBody(component);
    // Should fall back to div
    expect(result.html).toContain('<div');
  });

  test('rejects numeric tag names', () => {
    const component: Component = {
      name: 'NumericTag',
      nodes: {
        root: {
          type: 'element',
          tag: '123',
          children: [],
        },
      },
    };

    const result = renderPageBody(component);
    // Should fall back to div
    expect(result.html).toContain('<div');
  });

  test('handles missing tag name', () => {
    const component: Component = {
      name: 'NoTag',
      nodes: {
        root: {
          type: 'element',
          tag: '',
          children: [],
        },
      },
    };

    const result = renderPageBody(component);
    // Should fall back to div
    expect(result.html).toContain('<div');
  });
});

describe('renderPageBody with getComponent', () => {
  test('resolves sub-component', () => {
    const subComponent: Component = {
      name: 'SubComponent',
      nodes: {
        root: { type: 'element', tag: 'span', children: [] },
      },
    };

    const component: Component = {
      name: 'Main',
      nodes: {
        root: {
          type: 'component',
          name: 'SubComponent',
          attrs: {},
          children: []
        },
      },
    };

    const result = renderPageBody(component, {
      getComponent: (name) => name === 'SubComponent' ? subComponent : undefined
    });

    expect(result.html).toContain('<span');
    expect(result.html).not.toContain('data-component');
  });

  test('passes attributes to sub-component', () => {
    const subComponent: Component = {
      name: 'SubComponent',
      nodes: {
        root: { type: 'element', tag: 'span', children: [] },
      },
      variables: {
        message: { initialValue: { type: 'value', value: 'default' } }
      }
    };

    const component: Component = {
      name: 'Main',
      nodes: {
        root: {
          type: 'component',
          name: 'SubComponent',
          attrs: {
            message: { type: 'value', value: 'Hello from parent' }
          },
          children: []
        },
      },
    };

    const result = renderPageBody(component, {
      getComponent: (name) => name === 'SubComponent' ? subComponent : undefined
    });

    expect(result.html).toContain('<span');
  });

  test('falls back when component not found', () => {
    const component: Component = {
      name: 'Main',
      nodes: {
        root: {
          type: 'component',
          name: 'MissingComponent',
          attrs: {},
          children: ['child1']
        },
        child1: { type: 'element', tag: 'span', children: [] },
      },
    };

    const result = renderPageBody(component, {
      getComponent: () => undefined
    });

    expect(result.html).toContain('data-component="MissingComponent"');
    expect(result.html).toContain('<span');
  });

  test('renders component node children as fallback', () => {
    const component: Component = {
      name: 'Main',
      nodes: {
        root: {
          type: 'component',
          name: 'MissingComponent',
          attrs: {},
          children: ['text1']
        },
        text1: { type: 'text', value: { type: 'value', value: 'Child content' } },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('Child content');
  });
});

describe('renderPageBody text node handling', () => {
  test('renders text node with data attributes', () => {
    const component: Component = {
      name: 'TextAttrs',
      nodes: {
        root: {
          type: 'text',
          id: 'text-123',
          value: { type: 'value', value: 'Hello' }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('data-node-type="text"');
    expect(result.html).toContain('data-node-id="text-123"');
    expect(result.html).toContain('Hello');
  });

  test('handles text node without value', () => {
    const component: Component = {
      name: 'NoValue',
      nodes: {
        root: {
          type: 'text',
          value: undefined as any
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('data-node-type="text"');
    // Should render empty string
  });

  test('handles null text value', () => {
    const component: Component = {
      name: 'NullValue',
      nodes: {
        root: {
          type: 'text',
          value: { type: 'value', value: null }
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toContain('data-node-type="text"');
  });
});

describe('renderPageBody unknown node types', () => {
  test('handles unknown node type', () => {
    const component: Component = {
      name: 'Unknown',
      nodes: {
        root: {
          type: 'unknown' as any,
        },
      },
    };

    const result = renderPageBody(component);
    expect(result.html).toBe('');
  });
});

describe('renderPageBody depth limit', () => {
  test('stops at max depth', () => {
    // Create a deeply nested structure that would exceed MAX_RENDER_DEPTH
    const nodes: Record<string, any> = {};
    let current = 'root';

    for (let i = 0; i < 150; i++) {
      const next = `node${i}`;
      nodes[current] = {
        type: 'element',
        tag: 'div',
        children: [next]
      };
      current = next;
    }
    nodes[current] = { type: 'element', tag: 'span', children: [] };

    const component: Component = {
      name: 'Deep',
      nodes,
    };

    const result = renderPageBody(component);
    // Should stop and add comment at max depth
    expect(result.html).toContain('max depth');
  });
});
