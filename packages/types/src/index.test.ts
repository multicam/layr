import { describe, test, expect } from 'bun:test';

describe('types package', () => {
  describe('element type guards', async () => {
    const {
      isVoidElement,
      isPopularElement,
      isElementDefinition,
      VOID_ELEMENTS,
      POPULAR_ELEMENTS
    } = await import('./element');

    describe('isVoidElement', () => {
      test('returns true for all void elements', () => {
        const expectedVoidElements = [
          'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
          'link', 'meta', 'source', 'track', 'wbr'
        ];
        for (const tag of expectedVoidElements) {
          expect(isVoidElement(tag)).toBe(true);
        }
      });

      test('returns false for non-void elements', () => {
        const nonVoidElements = ['div', 'span', 'button', 'a', 'p', 'h1', 'ul', 'li', 'form'];
        for (const tag of nonVoidElements) {
          expect(isVoidElement(tag)).toBe(false);
        }
      });

      test('returns false for unknown/custom elements', () => {
        expect(isVoidElement('my-custom-element')).toBe(false);
        expect(isVoidElement('custom-tag')).toBe(false);
      });

      test('VOID_ELEMENTS array contains all expected elements', () => {
        expect(VOID_ELEMENTS).toEqual([
          'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
          'link', 'meta', 'source', 'track', 'wbr'
        ]);
      });
    });

    describe('isPopularElement', () => {
      test('returns true for all popular elements', () => {
        const expectedPopular = [
          'a', 'button', 'div', 'form', 'h1', 'h2', 'h3', 'img',
          'input', 'label', 'li', 'p', 'span', 'ul'
        ];
        for (const tag of expectedPopular) {
          expect(isPopularElement(tag)).toBe(true);
        }
      });

      test('returns false for non-popular elements', () => {
        const nonPopular = ['article', 'section', 'nav', 'aside', 'header', 'footer', 'main'];
        for (const tag of nonPopular) {
          expect(isPopularElement(tag)).toBe(false);
        }
      });

      test('returns false for void elements that are not popular', () => {
        expect(isPopularElement('br')).toBe(false);
        expect(isPopularElement('hr')).toBe(false);
        expect(isPopularElement('meta')).toBe(false);
      });

      test('POPULAR_ELEMENTS array contains all expected elements', () => {
        expect(POPULAR_ELEMENTS).toEqual([
          'a', 'button', 'div', 'form', 'h1', 'h2', 'h3', 'img',
          'input', 'label', 'li', 'p', 'span', 'ul'
        ]);
      });
    });

    describe('isElementDefinition', () => {
      test('returns true for valid ElementDefinition objects', () => {
        const validDef = {
          metadata: {
            name: 'div',
            categories: ['container']
          },
          element: {
            type: 'nodes',
            source: 'catalog',
            nodes: {}
          }
        };
        expect(isElementDefinition(validDef)).toBe(true);
      });

      test('returns false for null', () => {
        expect(isElementDefinition(null)).toBe(false);
      });

      test('returns false for undefined', () => {
        expect(isElementDefinition(undefined)).toBe(false);
      });

      test('returns false for non-objects (strings)', () => {
        expect(isElementDefinition('div')).toBe(false);
      });

      test('returns false for non-objects (numbers)', () => {
        expect(isElementDefinition(123)).toBe(false);
      });

      test('returns false for non-objects (arrays)', () => {
        expect(isElementDefinition(['div'])).toBe(false);
      });

      test('returns false for objects without metadata', () => {
        expect(isElementDefinition({ element: { type: 'nodes', source: 'catalog', nodes: {} } })).toBe(false);
      });

      test('returns false for objects without element', () => {
        expect(isElementDefinition({ metadata: { name: 'div' } })).toBe(false);
      });

      test('returns false when metadata is not an object', () => {
        expect(isElementDefinition({
          metadata: 'div',
          element: { type: 'nodes', source: 'catalog', nodes: {} }
        })).toBe(false);
      });

      test('returns false when metadata is null', () => {
        expect(isElementDefinition({
          metadata: null,
          element: { type: 'nodes', source: 'catalog', nodes: {} }
        })).toBe(false);
      });

      test('returns false when metadata.name is not a string', () => {
        expect(isElementDefinition({
          metadata: { name: 123 },
          element: { type: 'nodes', source: 'catalog', nodes: {} }
        })).toBe(false);
      });

      test('returns true for minimal valid definition', () => {
        const minimal = {
          metadata: { name: 'span' },
          element: { type: 'nodes', source: 'catalog', nodes: {} }
        };
        expect(isElementDefinition(minimal)).toBe(true);
      });

      test('returns true for definition with optional metadata fields', () => {
        const withOptional = {
          metadata: {
            name: 'button',
            categories: ['form', 'interactive'],
            description: 'A button element',
            link: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button',
            aliases: ['btn'],
            isPopular: true
          },
          element: { type: 'nodes', source: 'catalog', nodes: {} }
        };
        expect(isElementDefinition(withOptional)).toBe(true);
      });
    });
  });

  describe('schema validation', async () => {
    const {
      validateComponent,
      validatePage,
      validateFormula,
      validateAction,
      validateNode
    } = await import('./schemas');

    describe('validateFormula', () => {
      test('validates value operations', () => {
        expect(validateFormula({ type: 'value', value: 'hello' })).toEqual({ success: true, errors: [] });
        expect(validateFormula({ type: 'value', value: 42 })).toEqual({ success: true, errors: [] });
        expect(validateFormula({ type: 'value', value: true })).toEqual({ success: true, errors: [] });
        expect(validateFormula({ type: 'value', value: null })).toEqual({ success: true, errors: [] });
      });

      test('validates path operations', () => {
        expect(validateFormula({ type: 'path', path: ['Variables', 'name'] })).toEqual({ success: true, errors: [] });
        expect(validateFormula({ type: 'path', path: [] })).toEqual({ success: true, errors: [] });
      });

      test('validates function operations', () => {
        expect(validateFormula({ type: 'function', name: '@toddle/map' })).toEqual({ success: true, errors: [] });
        expect(validateFormula({
          type: 'function',
          name: '@toddle/filter',
          arguments: [{ formula: { type: 'value', value: 'x' } }]
        })).toEqual({ success: true, errors: [] });
      });

      test('validates apply operations', () => {
        expect(validateFormula({ type: 'apply', name: 'myFormula' })).toEqual({ success: true, errors: [] });
      });

      test('validates array operations', () => {
        expect(validateFormula({ type: 'array', arguments: [] })).toEqual({ success: true, errors: [] });
        expect(validateFormula({
          type: 'array',
          arguments: [
            { formula: { type: 'value', value: 1 } },
            { formula: { type: 'value', value: 2 } }
          ]
        })).toEqual({ success: true, errors: [] });
      });

      test('validates object operations', () => {
        expect(validateFormula({ type: 'object', arguments: [] })).toEqual({ success: true, errors: [] });
        expect(validateFormula({
          type: 'object',
          arguments: [
            { name: 'key', formula: { type: 'value', value: 'value' } }
          ]
        })).toEqual({ success: true, errors: [] });
      });

      test('validates record operations (deprecated)', () => {
        expect(validateFormula({ type: 'record', arguments: [] })).toEqual({ success: true, errors: [] });
      });

      test('validates or operations', () => {
        expect(validateFormula({ type: 'or', arguments: [] })).toEqual({ success: true, errors: [] });
        expect(validateFormula({
          type: 'or',
          arguments: [
            { formula: { type: 'value', value: true } },
            { formula: { type: 'value', value: false } }
          ]
        })).toEqual({ success: true, errors: [] });
      });

      test('validates and operations', () => {
        expect(validateFormula({ type: 'and', arguments: [] })).toEqual({ success: true, errors: [] });
      });

      test('validates switch operations', () => {
        expect(validateFormula({
          type: 'switch',
          cases: [{ condition: { type: 'value', value: true }, formula: { type: 'value', value: 1 } }],
          default: { type: 'value', value: 0 }
        })).toEqual({ success: true, errors: [] });
      });

      test('returns errors for invalid formula', () => {
        const result = validateFormula({ type: 'invalid' });
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('returns errors for missing type', () => {
        const result = validateFormula({ value: 'test' });
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('returns errors for null', () => {
        const result = validateFormula(null);
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('returns errors for non-object', () => {
        const result = validateFormula('formula');
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('validateAction', () => {
      test('validates SetVariable action', () => {
        expect(validateAction({
          type: 'SetVariable',
          name: 'myVar',
          data: { type: 'value', value: 1 }
        })).toEqual({ success: true, errors: [] });
      });

      test('validates TriggerEvent action', () => {
        expect(validateAction({
          type: 'TriggerEvent',
          name: 'click',
          data: { type: 'value', value: null }
        })).toEqual({ success: true, errors: [] });
      });

      test('validates Switch action', () => {
        expect(validateAction({
          type: 'Switch',
          cases: [],
          default: { actions: [] }
        })).toEqual({ success: true, errors: [] });
      });

      test('validates Fetch action', () => {
        expect(validateAction({
          type: 'Fetch',
          name: 'myApi'
        })).toEqual({ success: true, errors: [] });
      });

      test('validates Custom action', () => {
        expect(validateAction({
          type: 'Custom',
          name: 'myAction'
        })).toEqual({ success: true, errors: [] });
      });

      test('validates SetURLParameter action', () => {
        expect(validateAction({
          type: 'SetURLParameter',
          name: 'page',
          data: { type: 'value', value: '1' }
        })).toEqual({ success: true, errors: [] });
      });

      test('validates SetURLParameters action', () => {
        expect(validateAction({
          type: 'SetURLParameters',
          parameters: []
        })).toEqual({ success: true, errors: [] });
      });

      test('validates TriggerWorkflow action', () => {
        expect(validateAction({
          type: 'TriggerWorkflow',
          name: 'myWorkflow'
        })).toEqual({ success: true, errors: [] });
      });

      test('validates TriggerWorkflowCallback action', () => {
        expect(validateAction({
          type: 'TriggerWorkflowCallback',
          name: 'done',
          data: { type: 'value', value: null }
        })).toEqual({ success: true, errors: [] });
      });

      test('validates AbortFetch action', () => {
        expect(validateAction({
          type: 'AbortFetch',
          name: 'myApi'
        })).toEqual({ success: true, errors: [] });
      });

      test('returns errors for invalid action type', () => {
        const result = validateAction({ type: 'Invalid' });
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('returns errors for completely invalid action', () => {
        const result = validateAction({ invalid: 'field' });
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('validates action with name only (treated as Custom)', () => {
        // Custom action has optional type, so name-only is valid
        const result = validateAction({ name: 'test' });
        expect(result.success).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      test('returns errors for null', () => {
        const result = validateAction(null);
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('validateNode', () => {
      test('validates text node', () => {
        expect(validateNode({
          type: 'text',
          value: { type: 'value', value: 'Hello' }
        })).toEqual({ success: true, errors: [] });
      });

      test('validates slot node', () => {
        expect(validateNode({
          type: 'slot',
          children: []
        })).toEqual({ success: true, errors: [] });
      });

      test('validates element node', () => {
        expect(validateNode({
          type: 'element',
          tag: 'div',
          children: []
        })).toEqual({ success: true, errors: [] });
      });

      test('validates component node', () => {
        expect(validateNode({
          type: 'component',
          name: 'Button',
          children: []
        })).toEqual({ success: true, errors: [] });
      });

      test('validates element node with optional fields', () => {
        expect(validateNode({
          type: 'element',
          tag: 'button',
          children: [],
          attrs: { class: { type: 'value', value: 'btn' } },
          style: { color: 'red' },
          events: { click: { actions: [] } }
        })).toEqual({ success: true, errors: [] });
      });

      test('returns errors for invalid node type', () => {
        const result = validateNode({ type: 'invalid' });
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('returns errors for missing type', () => {
        const result = validateNode({ tag: 'div' });
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('returns errors for null', () => {
        const result = validateNode(null);
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('validateComponent', () => {
      test('validates minimal component', () => {
        const result = validateComponent({
          name: 'TestComponent',
          nodes: {}
        });
        expect(result).toEqual({ success: true, errors: [] });
      });

      test('validates component with attributes', () => {
        const result = validateComponent({
          name: 'Button',
          attributes: {
            variant: { name: 'Variant' }
          },
          nodes: {}
        });
        expect(result).toEqual({ success: true, errors: [] });
      });

      test('validates component with variables', () => {
        const result = validateComponent({
          name: 'Counter',
          variables: {
            count: { initialValue: { type: 'value', value: 0 } }
          },
          nodes: {}
        });
        expect(result).toEqual({ success: true, errors: [] });
      });

      test('validates component with formulas', () => {
        const result = validateComponent({
          name: 'Calculator',
          formulas: {
            double: {
              name: 'Double',
              formula: { type: 'value', value: 2 }
            }
          },
          nodes: {}
        });
        expect(result).toEqual({ success: true, errors: [] });
      });

      test('validates component with workflows', () => {
        const result = validateComponent({
          name: 'FormComponent',
          workflows: {
            submit: {
              name: 'Submit',
              actions: []
            }
          },
          nodes: {}
        });
        expect(result).toEqual({ success: true, errors: [] });
      });

      test('returns errors for missing name', () => {
        const result = validateComponent({
          nodes: {}
        });
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('returns errors for missing nodes', () => {
        const result = validateComponent({
          name: 'Test'
        });
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('returns errors for null', () => {
        const result = validateComponent(null);
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('returns errors for invalid nodes structure', () => {
        const result = validateComponent({
          name: 'Test',
          nodes: 'invalid'
        });
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('includes error path information', () => {
        const result = validateComponent({
          name: 'Test',
          nodes: {
            node1: { type: 'invalid' }
          }
        });
        expect(result.success).toBe(false);
        expect(result.errors[0].path).toBeDefined();
        expect(Array.isArray(result.errors[0].path)).toBe(true);
      });
    });

    describe('validatePage', () => {
      test('validates page with route', () => {
        const result = validatePage({
          name: 'HomePage',
          route: {
            path: [{ type: 'static', name: '' }]
          },
          nodes: {}
        });
        expect(result).toEqual({ success: true, errors: [] });
      });

      test('validates page with dynamic route', () => {
        const result = validatePage({
          name: 'UserPage',
          route: {
            path: [
              { type: 'static', name: 'users' },
              { type: 'param', name: 'id' }
            ]
          },
          nodes: {}
        });
        expect(result).toEqual({ success: true, errors: [] });
      });

      test('validates page with route info', () => {
        const result = validatePage({
          name: 'ProductPage',
          route: {
            path: [{ type: 'static', name: 'products' }],
            info: {
              title: { formula: { type: 'value', value: 'Products' } }
            }
          },
          nodes: {}
        });
        expect(result).toEqual({ success: true, errors: [] });
      });

      test('returns errors for missing route', () => {
        const result = validatePage({
          name: 'NoRoutePage',
          nodes: {}
        });
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('returns errors for invalid route structure', () => {
        const result = validatePage({
          name: 'BadRoutePage',
          route: { path: 'invalid' },
          nodes: {}
        });
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      test('returns errors for null', () => {
        const result = validatePage(null);
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('formula type guards', async () => {
    const {
      isValueOperation,
      isPathOperation,
      isFunctionOperation,
      isObjectOperation,
      isArrayOperation,
      isSwitchOperation,
      isOrOperation,
      isAndOperation,
      isApplyOperation,
      isRecordOperation
    } = await import('./formula');

    test('isValueOperation returns true for value operations', () => {
      expect(isValueOperation({ type: 'value', value: 'hello' })).toBe(true);
      expect(isValueOperation({ type: 'path', path: ['a'] })).toBe(false);
    });

    test('isPathOperation returns true for path operations', () => {
      expect(isPathOperation({ type: 'path', path: ['Variables', 'name'] })).toBe(true);
      expect(isPathOperation({ type: 'value', value: 'test' })).toBe(false);
    });

    test('isFunctionOperation returns true for function operations', () => {
      expect(isFunctionOperation({ type: 'function', name: '@toddle/map', arguments: [] })).toBe(true);
      expect(isFunctionOperation({ type: 'value', value: 1 })).toBe(false);
    });

    test('isObjectOperation returns true for object operations', () => {
      expect(isObjectOperation({ type: 'object', arguments: [] })).toBe(true);
      expect(isObjectOperation({ type: 'array', arguments: [] })).toBe(false);
    });

    test('isArrayOperation returns true for array operations', () => {
      expect(isArrayOperation({ type: 'array', arguments: [] })).toBe(true);
      expect(isArrayOperation({ type: 'object', arguments: [] })).toBe(false);
    });

    test('isSwitchOperation returns true for switch operations', () => {
      expect(isSwitchOperation({ type: 'switch', cases: [], default: { type: 'value', value: null } })).toBe(true);
      expect(isSwitchOperation({ type: 'or', arguments: [] })).toBe(false);
    });

    test('isOrOperation returns true for or operations', () => {
      expect(isOrOperation({ type: 'or', arguments: [] })).toBe(true);
      expect(isOrOperation({ type: 'and', arguments: [] })).toBe(false);
    });

    test('isAndOperation returns true for and operations', () => {
      expect(isAndOperation({ type: 'and', arguments: [] })).toBe(true);
      expect(isAndOperation({ type: 'or', arguments: [] })).toBe(false);
    });

    test('isApplyOperation returns true for apply operations', () => {
      expect(isApplyOperation({ type: 'apply', name: 'myFormula', arguments: [] })).toBe(true);
      expect(isApplyOperation({ type: 'function', name: 'test', arguments: [] })).toBe(false);
    });

    test('isRecordOperation returns true for record operations', () => {
      expect(isRecordOperation({ type: 'record', arguments: [] })).toBe(true);
      expect(isRecordOperation({ type: 'object', arguments: [] })).toBe(false);
    });
  });

  describe('action type guards', async () => {
    const {
      isSetVariableAction,
      isTriggerEventAction,
      isSwitchAction,
      isFetchAction,
      isAbortFetchAction,
      isCustomAction,
      isSetURLParameterAction,
      isSetURLParametersAction,
      isTriggerWorkflowAction,
      isWorkflowCallbackAction
    } = await import('./action');

    test('isSetVariableAction returns true for SetVariable', () => {
      expect(isSetVariableAction({ type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } })).toBe(true);
      expect(isSetVariableAction({ type: 'TriggerEvent', name: 'click', data: { type: 'value', value: null } })).toBe(false);
    });

    test('isTriggerEventAction returns true for TriggerEvent', () => {
      expect(isTriggerEventAction({ type: 'TriggerEvent', name: 'submit', data: { type: 'value', value: null } })).toBe(true);
      expect(isTriggerEventAction({ type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } })).toBe(false);
    });

    test('isSwitchAction returns true for Switch', () => {
      expect(isSwitchAction({ type: 'Switch', cases: [], default: { actions: [] } })).toBe(true);
      expect(isSwitchAction({ type: 'Fetch', name: 'test' })).toBe(false);
    });

    test('isFetchAction returns true for Fetch', () => {
      expect(isFetchAction({ type: 'Fetch', name: 'myApi' })).toBe(true);
      expect(isFetchAction({ type: 'AbortFetch', name: 'myApi' })).toBe(false);
    });

    test('isAbortFetchAction returns true for AbortFetch', () => {
      expect(isAbortFetchAction({ type: 'AbortFetch', name: 'myApi' })).toBe(true);
      expect(isAbortFetchAction({ type: 'Fetch', name: 'myApi' })).toBe(false);
    });

    test('isCustomAction returns true for Custom', () => {
      expect(isCustomAction({ type: 'Custom', name: 'myAction' })).toBe(true);
      expect(isCustomAction({ type: 'SetVariable', name: 'x', data: { type: 'value', value: 1 } })).toBe(false);
    });

    test('isSetURLParameterAction returns true for SetURLParameter', () => {
      expect(isSetURLParameterAction({ type: 'SetURLParameter', name: 'page', data: { type: 'value', value: '1' } })).toBe(true);
      expect(isSetURLParameterAction({ type: 'SetURLParameters', parameters: [] })).toBe(false);
    });

    test('isSetURLParametersAction returns true for SetURLParameters', () => {
      expect(isSetURLParametersAction({ type: 'SetURLParameters', parameters: [] })).toBe(true);
      expect(isSetURLParametersAction({ type: 'SetURLParameter', name: 'p', data: { type: 'value', value: '1' } })).toBe(false);
    });

    test('isTriggerWorkflowAction returns true for TriggerWorkflow', () => {
      expect(isTriggerWorkflowAction({ type: 'TriggerWorkflow', name: 'myWorkflow' })).toBe(true);
      expect(isTriggerWorkflowAction({ type: 'TriggerWorkflowCallback', name: 'done', data: { type: 'value', value: null } })).toBe(false);
    });

    test('isWorkflowCallbackAction returns true for TriggerWorkflowCallback', () => {
      expect(isWorkflowCallbackAction({ type: 'TriggerWorkflowCallback', name: 'done', data: { type: 'value', value: null } })).toBe(true);
      expect(isWorkflowCallbackAction({ type: 'TriggerWorkflow', name: 'test' })).toBe(false);
    });
  });
});
