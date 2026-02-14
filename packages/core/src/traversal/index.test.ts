/**
 * Tests for Introspection and Traversal System
 */

import { describe, test, expect } from 'bun:test';
import type {
  Formula,
  ActionModel,
  Component,
  NodeModel,
  ElementNodeModel,
  ComponentNodeModel,
  TextNodeModel,
  SlotNodeModel,
  ComponentAPI,
} from '@layr/types';

import {
  getFormulasInFormula,
  getFormulasInAction,
  getActionsInAction,
  getFormulasInNode,
  getActionsInNode,
  getFormulasInComponent,
  getActionsInComponent,
  getFormulasInApi,
  collectFormulaReferences,
  collectActionReferences,
  collectSubComponentNames,
  type FormulaVisit,
  type ActionVisit,
} from './index';

// ============================================================================
// Test Helpers
// ============================================================================

function makeValue(value: any): Formula {
  return { type: 'value', value };
}

function makePath(path: string[]): Formula {
  return { type: 'path', path };
}

function makeFunction(name: string, args: Array<{ name: string; formula: Formula }> = []): Formula {
  return { type: 'function', name, arguments: args };
}

function makeObject(args: Array<{ name: string; formula: Formula }> = []): Formula {
  return { type: 'object', arguments: args };
}

function makeArray(formulas: Formula[]): Formula {
  return { type: 'array', arguments: formulas.map(formula => ({ formula })) };
}

function makeSwitch(
  cases: Array<{ condition: Formula; formula: Formula }>,
  defaultFormula: Formula
): Formula {
  return { type: 'switch', cases, default: defaultFormula };
}

function makeOr(formulas: Formula[]): Formula {
  return { type: 'or', arguments: formulas.map(formula => ({ formula })) };
}

function makeAnd(formulas: Formula[]): Formula {
  return { type: 'and', arguments: formulas.map(formula => ({ formula })) };
}

function makeApply(name: string, args: Array<{ name: string; formula: Formula }> = []): Formula {
  return { type: 'apply', name, arguments: args };
}

function makeRecord(args: Array<{ name: string; formula: Formula }> = []): Formula {
  return { type: 'record', arguments: args };
}

function makeSetVariable(name: string, data?: Formula): ActionModel {
  return { type: 'SetVariable', name, data };
}

function makeTriggerEvent(name: string, data?: Formula): ActionModel {
  return { type: 'TriggerEvent', name, data };
}

function makeFetch(
  name: string,
  options: {
    inputs?: Array<{ name: string; formula?: Formula }>;
    onSuccess?: ActionModel[];
    onError?: ActionModel[];
    onMessage?: ActionModel[];
  } = {}
): ActionModel {
  return {
    type: 'Fetch',
    name,
    inputs: options.inputs,
    onSuccess: options.onSuccess ? { actions: options.onSuccess } : undefined,
    onError: options.onError ? { actions: options.onError } : undefined,
    onMessage: options.onMessage ? { actions: options.onMessage } : undefined,
  };
}

function makeCustomAction(
  name: string,
  options: {
    args?: Array<{ name: string; formula: Formula }>;
    events?: Record<string, ActionModel[]>;
  } = {}
): ActionModel {
  return {
    type: 'Custom',
    name,
    arguments: options.args,
    events: options.events ? Object.fromEntries(
      Object.entries(options.events).map(([k, v]) => [k, { actions: v }])
    ) : undefined,
  };
}

// ============================================================================
// getFormulasInFormula Tests
// ============================================================================

describe('getFormulasInFormula', () => {
  test('yields nothing for null/undefined', () => {
    expect([...getFormulasInFormula(null)]).toEqual([]);
    expect([...getFormulasInFormula(undefined)]).toEqual([]);
  });

  test('yields single visit for value formula', () => {
    const formula = makeValue(42);
    const visits = [...getFormulasInFormula(formula)];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(formula);
    expect(visits[0].path).toEqual([]);
  });

  test('yields single visit for path formula', () => {
    const formula = makePath(['user', 'name']);
    const visits = [...getFormulasInFormula(formula)];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(formula);
    expect(visits[0].path).toEqual([]);
  });

  test('yields function and its arguments', () => {
    const arg1 = makeValue(1);
    const arg2 = makePath(['x']);
    const formula = makeFunction('add', [
      { name: 'a', formula: arg1 },
      { name: 'b', formula: arg2 },
    ]);

    const visits = [...getFormulasInFormula(formula)];

    expect(visits).toHaveLength(3);
    expect(visits[0].formula).toBe(formula);
    expect(visits[0].path).toEqual([]);
    expect(visits[1].formula).toBe(arg1);
    expect(visits[1].path).toEqual(['arguments', 0, 'formula']);
    expect(visits[2].formula).toBe(arg2);
    expect(visits[2].path).toEqual(['arguments', 1, 'formula']);
  });

  test('yields object with arguments', () => {
    const nameFormula = makeValue('John');
    const ageFormula = makeValue(30);
    const formula = makeObject([
      { name: 'name', formula: nameFormula },
      { name: 'age', formula: ageFormula },
    ]);

    const visits = [...getFormulasInFormula(formula)];

    expect(visits).toHaveLength(3);
    expect(visits[0].formula).toBe(formula);
    expect(visits[1].formula).toBe(nameFormula);
    expect(visits[2].formula).toBe(ageFormula);
  });

  test('yields array with arguments', () => {
    const item1 = makeValue(1);
    const item2 = makeValue(2);
    const formula = makeArray([item1, item2]);

    const visits = [...getFormulasInFormula(formula)];

    expect(visits).toHaveLength(3);
    expect(visits[0].formula).toBe(formula);
    expect(visits[1].formula).toBe(item1);
    expect(visits[2].formula).toBe(item2);
  });

  test('yields record with arguments', () => {
    const val1 = makeValue('a');
    const val2 = makeValue('b');
    const formula = makeRecord([
      { name: 'key1', formula: val1 },
      { name: 'key2', formula: val2 },
    ]);

    const visits = [...getFormulasInFormula(formula)];

    expect(visits).toHaveLength(3);
    expect(visits[0].formula).toBe(formula);
    expect(visits[1].formula).toBe(val1);
    expect(visits[2].formula).toBe(val2);
  });

  test('yields switch with cases and default', () => {
    const cond1 = makeValue(true);
    const result1 = makeValue('yes');
    const cond2 = makeValue(false);
    const result2 = makeValue('no');
    const defaultResult = makeValue('maybe');

    const formula = makeSwitch(
      [
        { condition: cond1, formula: result1 },
        { condition: cond2, formula: result2 },
      ],
      defaultResult
    );

    const visits = [...getFormulasInFormula(formula)];

    expect(visits).toHaveLength(6);
    expect(visits[0].formula).toBe(formula);
    expect(visits[1].formula).toBe(cond1);
    expect(visits[1].path).toEqual(['cases', 0, 'condition']);
    expect(visits[2].formula).toBe(result1);
    expect(visits[2].path).toEqual(['cases', 0, 'formula']);
    expect(visits[3].formula).toBe(cond2);
    expect(visits[4].formula).toBe(result2);
    expect(visits[5].formula).toBe(defaultResult);
    expect(visits[5].path).toEqual(['default']);
  });

  test('yields or operation with arguments', () => {
    const arg1 = makeValue(true);
    const arg2 = makeValue(false);
    const formula = makeOr([arg1, arg2]);

    const visits = [...getFormulasInFormula(formula)];

    expect(visits).toHaveLength(3);
    expect(visits[0].formula).toBe(formula);
    expect(visits[1].formula).toBe(arg1);
    expect(visits[2].formula).toBe(arg2);
  });

  test('yields and operation with arguments', () => {
    const arg1 = makeValue(true);
    const arg2 = makeValue(true);
    const formula = makeAnd([arg1, arg2]);

    const visits = [...getFormulasInFormula(formula)];

    expect(visits).toHaveLength(3);
    expect(visits[0].formula).toBe(formula);
    expect(visits[1].formula).toBe(arg1);
    expect(visits[2].formula).toBe(arg2);
  });

  test('yields apply operation with arguments', () => {
    const arg1 = makeValue(5);
    const formula = makeApply('myFunc', [{ name: 'x', formula: arg1 }]);

    const visits = [...getFormulasInFormula(formula)];

    expect(visits).toHaveLength(2);
    expect(visits[0].formula).toBe(formula);
    expect(visits[1].formula).toBe(arg1);
  });

  test('handles nested formulas deeply', () => {
    const innerValue = makeValue(10);
    const innerFunc = makeFunction('multiply', [{ name: 'x', formula: innerValue }]);
    const outerFunc = makeFunction('add', [{ name: 'y', formula: innerFunc }]);

    const visits = [...getFormulasInFormula(outerFunc)];

    expect(visits).toHaveLength(3);
    expect(visits[0].formula).toBe(outerFunc);
    expect(visits[1].formula).toBe(innerFunc);
    expect(visits[2].formula).toBe(innerValue);
  });

  test('preserves packageName in options', () => {
    const formula = makeValue(1);
    const visits = [...getFormulasInFormula(formula, { packageName: 'test-pkg' })];

    expect(visits).toHaveLength(1);
    expect(visits[0].packageName).toBe('test-pkg');
  });

  test('inherits packageName from function operation', () => {
    const arg = makeValue(1);
    const formula: Formula = {
      type: 'function',
      name: 'myFunc',
      package: 'pkg1',
      arguments: [{ name: 'x', formula: arg }],
    };

    const visits = [...getFormulasInFormula(formula)];

    expect(visits).toHaveLength(2);
    expect(visits[0].packageName).toBeUndefined();
    expect(visits[1].packageName).toBe('pkg1');
  });
});

// ============================================================================
// getFormulasInAction Tests
// ============================================================================

describe('getFormulasInAction', () => {
  test('yields nothing for null/undefined', () => {
    expect([...getFormulasInAction(null)]).toEqual([]);
    expect([...getFormulasInAction(undefined)]).toEqual([]);
  });

  test('handles array of actions', () => {
    const formula1 = makeValue(1);
    const formula2 = makeValue(2);
    const actions = [
      makeSetVariable('x', formula1),
      makeSetVariable('y', formula2),
    ];

    const visits = [...getFormulasInAction(actions)];

    expect(visits).toHaveLength(2);
    expect(visits[0].formula).toBe(formula1);
    expect(visits[0].path).toEqual([0, 'data']);
    expect(visits[1].formula).toBe(formula2);
    expect(visits[1].path).toEqual([1, 'data']);
  });

  test('yields nothing for AbortFetch action', () => {
    const action: ActionModel = { type: 'AbortFetch', name: 'myApi' };
    const visits = [...getFormulasInAction(action)];

    expect(visits).toEqual([]);
  });

  test('extracts formulas from SetVariable action', () => {
    const formula = makeValue(42);
    const action = makeSetVariable('count', formula);
    const visits = [...getFormulasInAction(action)];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(formula);
    expect(visits[0].path).toEqual(['data']);
  });

  test('extracts formulas from TriggerEvent action', () => {
    const formula = makeValue({ status: 'ok' });
    const action = makeTriggerEvent('onComplete', formula);
    const visits = [...getFormulasInAction(action)];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(formula);
  });

  test('extracts formulas from Fetch action inputs', () => {
    const input1 = makeValue('test');
    const input2 = makeValue(123);
    const action = makeFetch('myApi', {
      inputs: [
        { name: 'param1', formula: input1 },
        { name: 'param2', formula: input2 },
      ],
    });

    const visits = [...getFormulasInAction(action)];

    expect(visits).toHaveLength(2);
    expect(visits[0].formula).toBe(input1);
    expect(visits[0].path).toEqual(['inputs', 0, 'formula']);
    expect(visits[1].formula).toBe(input2);
    expect(visits[1].path).toEqual(['inputs', 1, 'formula']);
  });

  test('extracts formulas from Fetch action callbacks', () => {
    const successFormula = makeValue('success');
    const errorFormula = makeValue('error');
    const messageFormula = makeValue('message');

    const action = makeFetch('myApi', {
      onSuccess: [makeSetVariable('result', successFormula)],
      onError: [makeSetVariable('error', errorFormula)],
      onMessage: [makeSetVariable('msg', messageFormula)],
    });

    const visits = [...getFormulasInAction(action)];

    expect(visits).toHaveLength(3);
    expect(visits[0].formula).toBe(successFormula);
    expect(visits[0].path).toEqual(['onSuccess', 'actions', 0, 'data']);
    expect(visits[1].formula).toBe(errorFormula);
    expect(visits[1].path).toEqual(['onError', 'actions', 0, 'data']);
    expect(visits[2].formula).toBe(messageFormula);
    expect(visits[2].path).toEqual(['onMessage', 'actions', 0, 'data']);
  });

  test('extracts formulas from SetURLParameter action', () => {
    const formula = makeValue('newValue');
    const action: ActionModel = { type: 'SetURLParameter', name: 'page', data: formula };
    const visits = [...getFormulasInAction(action)];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(formula);
  });

  test('extracts formulas from SetURLParameters action', () => {
    const formula1 = makeValue('1');
    const formula2 = makeValue('active');
    const action: ActionModel = {
      type: 'SetURLParameters',
      parameters: [
        { name: 'page', formula: formula1 },
        { name: 'status', formula: formula2 },
      ],
    };

    const visits = [...getFormulasInAction(action)];

    expect(visits).toHaveLength(2);
    expect(visits[0].formula).toBe(formula1);
    expect(visits[1].formula).toBe(formula2);
  });

  test('extracts formulas from TriggerWorkflow action', () => {
    const formula1 = makeValue('arg1');
    const formula2 = makeValue('arg2');
    const action: ActionModel = {
      type: 'TriggerWorkflow',
      name: 'myWorkflow',
      parameters: [
        { name: 'param1', formula: formula1 },
        { name: 'param2', formula: formula2 },
      ],
    };

    const visits = [...getFormulasInAction(action)];

    expect(visits).toHaveLength(2);
    expect(visits[0].formula).toBe(formula1);
    expect(visits[1].formula).toBe(formula2);
  });

  test('extracts formulas from TriggerWorkflowCallback action', () => {
    const formula = makeValue({ result: 'done' });
    const action: ActionModel = { type: 'TriggerWorkflowCallback', name: 'onDone', data: formula };
    const visits = [...getFormulasInAction(action)];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(formula);
  });

  test('extracts formulas from Switch action', () => {
    const switchData = makeValue('status');
    const cond1 = makeValue('active');
    const cond2 = makeValue('inactive');
    const action1Formula = makeValue('yes');
    const action2Formula = makeValue('no');
    const defaultFormula = makeValue('unknown');

    const action: ActionModel = {
      type: 'Switch',
      data: switchData,
      cases: [
        { condition: cond1, actions: [makeSetVariable('x', action1Formula)] },
        { condition: cond2, actions: [makeSetVariable('y', action2Formula)] },
      ],
      default: { actions: [makeSetVariable('z', defaultFormula)] },
    };

    const visits = [...getFormulasInAction(action)];

    expect(visits).toHaveLength(6);
    expect(visits[0].formula).toBe(switchData);
    expect(visits[0].path).toEqual(['data']);
    expect(visits[1].formula).toBe(cond1);
    expect(visits[2].formula).toBe(action1Formula);
    expect(visits[3].formula).toBe(cond2);
    expect(visits[4].formula).toBe(action2Formula);
    expect(visits[5].formula).toBe(defaultFormula);
  });

  test('extracts formulas from Custom action arguments', () => {
    const arg1 = makeValue('test');
    const arg2 = makeValue(42);
    const action = makeCustomAction('MyAction', {
      args: [
        { name: 'param1', formula: arg1 },
        { name: 'param2', formula: arg2 },
      ],
    });

    const visits = [...getFormulasInAction(action)];

    expect(visits).toHaveLength(2);
    expect(visits[0].formula).toBe(arg1);
    expect(visits[1].formula).toBe(arg2);
  });

  test('extracts formulas from Custom action events', () => {
    const eventFormula = makeValue('event data');
    const action = makeCustomAction('MyAction', {
      events: {
        onComplete: [makeSetVariable('result', eventFormula)],
      },
    });

    const visits = [...getFormulasInAction(action)];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(eventFormula);
    expect(visits[0].path).toEqual(['events', 'onComplete', 'actions', 0, 'data']);
  });
});

// ============================================================================
// getActionsInAction Tests
// ============================================================================

describe('getActionsInAction', () => {
  test('yields nothing for null/undefined', () => {
    expect([...getActionsInAction(null)]).toEqual([]);
    expect([...getActionsInAction(undefined)]).toEqual([]);
  });

  test('handles array of actions', () => {
    const action1 = makeSetVariable('x');
    const action2 = makeSetVariable('y');
    const actions = [action1, action2];

    const visits = [...getActionsInAction(actions)];

    expect(visits).toHaveLength(2);
    expect(visits[0].action).toBe(action1);
    expect(visits[0].path).toEqual([0]);
    expect(visits[1].action).toBe(action2);
    expect(visits[1].path).toEqual([1]);
  });

  test('yields single action for leaf actions', () => {
    const leafActions = [
      { type: 'AbortFetch' as const, name: 'api' },
      { type: 'SetURLParameter' as const, name: 'page' },
      { type: 'SetURLParameters' as const, parameters: [] },
      makeSetVariable('x'),
      makeTriggerEvent('e'),
      { type: 'TriggerWorkflow' as const, name: 'wf' },
      { type: 'TriggerWorkflowCallback' as const, name: 'cb' },
    ];

    for (const action of leafActions) {
      const visits = [...getActionsInAction(action)];
      expect(visits).toHaveLength(1);
      expect(visits[0].action).toBe(action);
      expect(visits[0].path).toEqual([]);
    }
  });

  test('yields actions from Fetch callbacks', () => {
    const successAction = makeSetVariable('success');
    const errorAction = makeSetVariable('error');
    const messageAction = makeSetVariable('message');

    const action = makeFetch('myApi', {
      onSuccess: [successAction],
      onError: [errorAction],
      onMessage: [messageAction],
    });

    const visits = [...getActionsInAction(action)];

    expect(visits).toHaveLength(4); // Fetch + 3 callbacks
    expect(visits[0].action).toBe(action);
    expect(visits[1].action).toBe(successAction);
    expect(visits[1].path).toEqual(['onSuccess', 'actions', 0]);
    expect(visits[2].action).toBe(errorAction);
    expect(visits[2].path).toEqual(['onError', 'actions', 0]);
    expect(visits[3].action).toBe(messageAction);
    expect(visits[3].path).toEqual(['onMessage', 'actions', 0]);
  });

  test('yields actions from Switch cases and default', () => {
    const case1Action = makeSetVariable('case1');
    const case2Action = makeSetVariable('case2');
    const defaultAction = makeSetVariable('default');

    const action: ActionModel = {
      type: 'Switch',
      cases: [
        { condition: makeValue(1), actions: [case1Action] },
        { condition: makeValue(2), actions: [case2Action] },
      ],
      default: { actions: [defaultAction] },
    };

    const visits = [...getActionsInAction(action)];

    expect(visits).toHaveLength(4); // Switch + 3 nested actions
    expect(visits[0].action).toBe(action);
    expect(visits[1].action).toBe(case1Action);
    expect(visits[2].action).toBe(case2Action);
    expect(visits[3].action).toBe(defaultAction);
  });

  test('yields actions from Custom action events', () => {
    const eventAction1 = makeSetVariable('event1');
    const eventAction2 = makeSetVariable('event2');

    const action = makeCustomAction('MyAction', {
      events: {
        onComplete: [eventAction1],
        onError: [eventAction2],
      },
    });

    const visits = [...getActionsInAction(action)];

    expect(visits).toHaveLength(3); // Custom + 2 event actions
    expect(visits[0].action).toBe(action);
    expect(visits[1].action).toBe(eventAction1);
    expect(visits[2].action).toBe(eventAction2);
  });

  test('handles deeply nested actions', () => {
    const innerAction = makeSetVariable('inner');
    const middleAction = makeFetch('api', { onSuccess: [innerAction] });
    const outerAction = makeFetch('outer', { onSuccess: [middleAction] });

    const visits = [...getActionsInAction(outerAction)];

    expect(visits).toHaveLength(3);
    expect(visits[0].action).toBe(outerAction);
    expect(visits[1].action).toBe(middleAction);
    expect(visits[2].action).toBe(innerAction);
  });
});

// ============================================================================
// getFormulasInNode Tests
// ============================================================================

describe('getFormulasInNode', () => {
  test('extracts condition, repeat, repeatKey from any node type', () => {
    const condition = makeValue(true);
    const repeat = makeArray([makeValue(1), makeValue(2)]);
    const repeatKey = makePath(['id']);

    const node: TextNodeModel = {
      type: 'text',
      value: makeValue('test'),
      condition,
      repeat,
      repeatKey,
    };

    const visits = [...getFormulasInNode(node, 'node1')];

    // Should find: condition, repeat, repeatKey, and value
    expect(visits.length).toBeGreaterThanOrEqual(4);

    const paths = visits.map(v => v.path.join('.'));
    expect(paths).toContain('nodes.node1.condition');
    expect(paths).toContain('nodes.node1.repeat');
    expect(paths).toContain('nodes.node1.repeatKey');
  });

  test('extracts value formula from text node', () => {
    const valueFormula = makeValue('Hello World');
    const node: TextNodeModel = {
      type: 'text',
      value: valueFormula,
    };

    const visits = [...getFormulasInNode(node, 'text1')];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(valueFormula);
    expect(visits[0].path).toEqual(['nodes', 'text1', 'value']);
  });

  test('extracts attrs from element node', () => {
    const idFormula = makeValue('btn-1');
    const classFormula = makeValue('primary');
    const node: ElementNodeModel = {
      type: 'element',
      tag: 'div',
      attrs: {
        id: idFormula,
        class: classFormula,
      },
      children: [],
    };

    const visits = [...getFormulasInNode(node, 'elem1')];

    expect(visits).toHaveLength(2);
    expect(visits[0].formula).toBe(idFormula);
    expect(visits[0].path).toEqual(['nodes', 'elem1', 'attrs', 'id']);
    expect(visits[1].formula).toBe(classFormula);
    expect(visits[1].path).toEqual(['nodes', 'elem1', 'attrs', 'class']);
  });

  test('extracts formulas from element node events', () => {
    const clickFormula = makeValue('clicked');
    const node: ElementNodeModel = {
      type: 'element',
      tag: 'button',
      events: {
        click: { actions: [makeSetVariable('status', clickFormula)] },
      },
      children: [],
    };

    const visits = [...getFormulasInNode(node, 'btn1')];

    expect(visits.length).toBeGreaterThan(0);
    const clickVisit = visits.find(v => v.formula === clickFormula);
    expect(clickVisit).toBeDefined();
  });

  test('extracts formulas from element node classes', () => {
    const activeFormula = makeValue(true);
    const node: ElementNodeModel = {
      type: 'element',
      tag: 'div',
      classes: {
        active: { formula: activeFormula },
        disabled: {},
      },
      children: [],
    };

    const visits = [...getFormulasInNode(node, 'div1')];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(activeFormula);
    expect(visits[0].path).toEqual(['nodes', 'div1', 'classes', 'active', 'formula']);
  });

  test('extracts formulas from element node customProperties', () => {
    const colorFormula = makeValue('#ff0000');
    const node: ElementNodeModel = {
      type: 'element',
      tag: 'div',
      customProperties: {
        '--color': { formula: colorFormula },
      },
      children: [],
    };

    const visits = [...getFormulasInNode(node, 'div1')];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(colorFormula);
    expect(visits[0].path).toEqual(['nodes', 'div1', 'customProperties', '--color', 'formula']);
  });

  test('extracts formulas from element node variants', () => {
    const hoverColorFormula = makeValue('#00ff00');
    const node: ElementNodeModel = {
      type: 'element',
      tag: 'button',
      variants: [
        {
          hover: true,
          customProperties: {
            '--hover-color': { formula: hoverColorFormula },
          },
        },
      ],
      children: [],
    };

    const visits = [...getFormulasInNode(node, 'btn1')];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(hoverColorFormula);
    expect(visits[0].path).toEqual([
      'nodes',
      'btn1',
      'variants',
      0,
      'customProperties',
      '--hover-color',
      'formula',
    ]);
  });

  test('extracts attrs from component node', () => {
    const titleFormula = makeValue('My Title');
    const node: ComponentNodeModel = {
      type: 'component',
      name: 'MyComponent',
      attrs: {
        title: titleFormula,
      },
      children: [],
    };

    const visits = [...getFormulasInNode(node, 'comp1')];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(titleFormula);
    expect(visits[0].path).toEqual(['nodes', 'comp1', 'attrs', 'title']);
  });

  test('extracts formulas from component node events', () => {
    const eventFormula = makeValue('event data');
    const node: ComponentNodeModel = {
      type: 'component',
      name: 'MyComponent',
      attrs: {},
      events: {
        onCustomEvent: { actions: [makeTriggerEvent('log', eventFormula)] },
      },
      children: [],
    };

    const visits = [...getFormulasInNode(node, 'comp1')];

    const eventVisit = visits.find(v => v.formula === eventFormula);
    expect(eventVisit).toBeDefined();
  });

  test('extracts customProperties from component node', () => {
    const propFormula = makeValue('value');
    const node: ComponentNodeModel = {
      type: 'component',
      name: 'MyComponent',
      attrs: {},
      customProperties: {
        '--custom': { formula: propFormula },
      },
      children: [],
    };

    const visits = [...getFormulasInNode(node, 'comp1')];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(propFormula);
  });

  test('yields nothing extra for slot node beyond common fields', () => {
    const node: SlotNodeModel = {
      type: 'slot',
      children: [],
    };

    const visits = [...getFormulasInNode(node, 'slot1')];

    expect(visits).toEqual([]);
  });

  test('respects packageName option', () => {
    const node: TextNodeModel = {
      type: 'text',
      value: makeValue('test'),
    };

    const visits = [...getFormulasInNode(node, 'text1', { packageName: 'my-package' })];

    expect(visits).toHaveLength(1);
    expect(visits[0].packageName).toBe('my-package');
  });

  test('inherits package from component node', () => {
    const attrFormula = makeValue('test');
    const node: ComponentNodeModel = {
      type: 'component',
      name: 'MyComponent',
      package: 'ui-lib',
      attrs: { title: attrFormula },
      children: [],
    };

    const visits = [...getFormulasInNode(node, 'comp1')];

    expect(visits).toHaveLength(1);
    expect(visits[0].packageName).toBe('ui-lib');
  });
});

// ============================================================================
// getActionsInNode Tests
// ============================================================================

describe('getActionsInNode', () => {
  test('yields nothing for text node', () => {
    const node: TextNodeModel = {
      type: 'text',
      value: makeValue('test'),
    };

    const visits = [...getActionsInNode(node, 'text1')];

    expect(visits).toEqual([]);
  });

  test('yields nothing for slot node', () => {
    const node: SlotNodeModel = {
      type: 'slot',
      children: [],
    };

    const visits = [...getActionsInNode(node, 'slot1')];

    expect(visits).toEqual([]);
  });

  test('yields actions from element node events', () => {
    const clickAction = makeSetVariable('clicked', makeValue(true));
    const node: ElementNodeModel = {
      type: 'element',
      tag: 'button',
      events: {
        click: { actions: [clickAction] },
      },
      children: [],
    };

    const visits = [...getActionsInNode(node, 'btn1')];

    expect(visits).toHaveLength(1);
    expect(visits[0].action).toBe(clickAction);
    expect(visits[0].path).toEqual(['nodes', 'btn1', 'events', 'click', 'actions', 0]);
  });

  test('yields actions from component node events', () => {
    const eventAction = makeSetVariable('eventFired', makeValue(true));
    const node: ComponentNodeModel = {
      type: 'component',
      name: 'MyComponent',
      attrs: {},
      events: {
        onCustomEvent: { actions: [eventAction] },
      },
      children: [],
    };

    const visits = [...getActionsInNode(node, 'comp1')];

    expect(visits).toHaveLength(1);
    expect(visits[0].action).toBe(eventAction);
  });

  test('yields multiple actions from multiple events', () => {
    const clickAction = makeSetVariable('click');
    const hoverAction = makeSetVariable('hover');
    const node: ElementNodeModel = {
      type: 'element',
      tag: 'div',
      events: {
        click: { actions: [clickAction] },
        mouseenter: { actions: [hoverAction] },
      },
      children: [],
    };

    const visits = [...getActionsInNode(node, 'div1')];

    expect(visits).toHaveLength(2);
    expect(visits.map(v => v.action)).toContain(clickAction);
    expect(visits.map(v => v.action)).toContain(hoverAction);
  });
});

// ============================================================================
// getFormulasInComponent Tests
// ============================================================================

describe('getFormulasInComponent', () => {
  test('extracts formulas from route info', () => {
    const titleFormula = makeValue('Page Title');
    const descFormula = makeValue('Page Description');
    const component: Component = {
      name: 'MyPage',
      route: {
        path: '/page',
        info: {
          title: { formula: titleFormula },
          description: { formula: descFormula },
        },
      },
      nodes: {},
    };

    const visits = [...getFormulasInComponent(component)];

    expect(visits.length).toBeGreaterThanOrEqual(2);
    const titleVisit = visits.find(v => v.formula === titleFormula);
    const descVisit = visits.find(v => v.formula === descFormula);
    expect(titleVisit?.path).toEqual(['route', 'info', 'title', 'formula']);
    expect(descVisit?.path).toEqual(['route', 'info', 'description', 'formula']);
  });

  test('extracts component formulas', () => {
    const formulaBody = makeValue(42);
    const component: Component = {
      name: 'MyComponent',
      formulas: {
        myFormula: {
          name: 'myFormula',
          formula: formulaBody,
        },
      },
      nodes: {},
    };

    const visits = [...getFormulasInComponent(component)];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(formulaBody);
    expect(visits[0].path).toEqual(['formulas', 'myFormula', 'formula']);
  });

  test('extracts variable initialValues', () => {
    const initValue = makeValue(0);
    const component: Component = {
      name: 'MyComponent',
      variables: {
        counter: { initialValue: initValue },
      },
      nodes: {},
    };

    const visits = [...getFormulasInComponent(component)];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(initValue);
    expect(visits[0].path).toEqual(['variables', 'counter', 'initialValue']);
  });

  test('extracts formulas from workflow actions', () => {
    const actionFormula = makeValue('data');
    const component: Component = {
      name: 'MyComponent',
      workflows: {
        myWorkflow: {
          name: 'myWorkflow',
          parameters: [],
          actions: [makeSetVariable('x', actionFormula)],
        },
      },
      nodes: {},
    };

    const visits = [...getFormulasInComponent(component)];

    expect(visits.length).toBeGreaterThan(0);
    const formulaVisit = visits.find(v => v.formula === actionFormula);
    expect(formulaVisit).toBeDefined();
  });

  test('extracts formulas from APIs', () => {
    const urlFormula = makeValue('https://api.example.com');
    const component: Component = {
      name: 'MyComponent',
      apis: {
        myApi: {
          name: 'myApi',
          type: 'v2',
          url: urlFormula,
        },
      },
      nodes: {},
    };

    const visits = [...getFormulasInComponent(component)];

    expect(visits.length).toBeGreaterThan(0);
    const urlVisit = visits.find(v => v.formula === urlFormula);
    expect(urlVisit?.path).toEqual(['apis', 'myApi', 'url']);
  });

  test('extracts formulas from onLoad lifecycle', () => {
    const loadFormula = makeValue('loaded');
    const component: Component = {
      name: 'MyComponent',
      onLoad: {
        actions: [makeSetVariable('status', loadFormula)],
      },
      nodes: {},
    };

    const visits = [...getFormulasInComponent(component)];

    expect(visits.length).toBeGreaterThan(0);
    const loadVisit = visits.find(v => v.formula === loadFormula);
    expect(loadVisit).toBeDefined();
  });

  test('extracts formulas from onAttributeChange lifecycle', () => {
    const changeFormula = makeValue('changed');
    const component: Component = {
      name: 'MyComponent',
      onAttributeChange: {
        actions: [makeSetVariable('attr', changeFormula)],
      },
      nodes: {},
    };

    const visits = [...getFormulasInComponent(component)];

    const changeVisit = visits.find(v => v.formula === changeFormula);
    expect(changeVisit).toBeDefined();
  });

  test('extracts formulas from nodes', () => {
    const textFormula = makeValue('Hello');
    const component: Component = {
      name: 'MyComponent',
      nodes: {
        text1: {
          type: 'text',
          value: textFormula,
        },
      },
    };

    const visits = [...getFormulasInComponent(component)];

    expect(visits).toHaveLength(1);
    expect(visits[0].formula).toBe(textFormula);
  });

  test('extracts formulas from all component parts', () => {
    const component: Component = {
      name: 'ComplexComponent',
      route: {
        path: '/complex',
        info: { title: { formula: makeValue('Title') } },
      },
      formulas: {
        f1: { name: 'f1', formula: makeValue(1) },
      },
      variables: {
        v1: { initialValue: makeValue(2) },
      },
      workflows: {
        w1: {
          name: 'w1',
          parameters: [],
          actions: [makeSetVariable('x', makeValue(3))],
        },
      },
      apis: {
        api1: {
          name: 'api1',
          type: 'v2',
          url: makeValue('http://example.com'),
        },
      },
      onLoad: {
        actions: [makeSetVariable('loaded', makeValue(4))],
      },
      nodes: {
        text1: { type: 'text', value: makeValue(5) },
      },
    };

    const visits = [...getFormulasInComponent(component)];

    // Should have at least 6 formulas (plus nested ones)
    expect(visits.length).toBeGreaterThanOrEqual(6);
  });
});

// ============================================================================
// getActionsInComponent Tests
// ============================================================================

describe('getActionsInComponent', () => {
  test('extracts actions from workflows', () => {
    const action = makeSetVariable('x');
    const component: Component = {
      name: 'MyComponent',
      workflows: {
        myWorkflow: {
          name: 'myWorkflow',
          parameters: [],
          actions: [action],
        },
      },
      nodes: {},
    };

    const visits = [...getActionsInComponent(component)];

    expect(visits).toHaveLength(1);
    expect(visits[0].action).toBe(action);
    expect(visits[0].path).toEqual(['workflows', 'myWorkflow', 'actions', 0]);
  });

  test('extracts actions from API client callbacks', () => {
    const completedAction = makeSetVariable('done');
    const failedAction = makeSetVariable('error');
    const component: Component = {
      name: 'MyComponent',
      apis: {
        myApi: {
          name: 'myApi',
          type: 'v2',
          client: {
            onCompleted: { actions: [completedAction] },
            onFailed: { actions: [failedAction] },
          },
        },
      },
      nodes: {},
    };

    const visits = [...getActionsInComponent(component)];

    expect(visits).toHaveLength(2);
    expect(visits[0].action).toBe(completedAction);
    expect(visits[1].action).toBe(failedAction);
  });

  test('extracts actions from onLoad lifecycle', () => {
    const loadAction = makeSetVariable('loaded');
    const component: Component = {
      name: 'MyComponent',
      onLoad: { actions: [loadAction] },
      nodes: {},
    };

    const visits = [...getActionsInComponent(component)];

    expect(visits).toHaveLength(1);
    expect(visits[0].action).toBe(loadAction);
    expect(visits[0].path).toEqual(['onLoad', 'actions', 0]);
  });

  test('extracts actions from onAttributeChange lifecycle', () => {
    const changeAction = makeSetVariable('changed');
    const component: Component = {
      name: 'MyComponent',
      onAttributeChange: { actions: [changeAction] },
      nodes: {},
    };

    const visits = [...getActionsInComponent(component)];

    expect(visits).toHaveLength(1);
    expect(visits[0].action).toBe(changeAction);
  });

  test('extracts actions from node events', () => {
    const clickAction = makeSetVariable('clicked');
    const component: Component = {
      name: 'MyComponent',
      nodes: {
        btn1: {
          type: 'element',
          tag: 'button',
          events: {
            click: { actions: [clickAction] },
          },
          children: [],
        },
      },
    };

    const visits = [...getActionsInComponent(component)];

    expect(visits).toHaveLength(1);
    expect(visits[0].action).toBe(clickAction);
  });

  test('extracts actions from all component parts', () => {
    const component: Component = {
      name: 'ComplexComponent',
      workflows: {
        w1: {
          name: 'w1',
          parameters: [],
          actions: [makeSetVariable('a')],
        },
      },
      apis: {
        api1: {
          name: 'api1',
          type: 'v2',
          client: {
            onCompleted: { actions: [makeSetVariable('b')] },
          },
        },
      },
      onLoad: { actions: [makeSetVariable('c')] },
      onAttributeChange: { actions: [makeSetVariable('d')] },
      nodes: {
        btn1: {
          type: 'element',
          tag: 'button',
          events: {
            click: { actions: [makeSetVariable('e')] },
          },
          children: [],
        },
      },
    };

    const visits = [...getActionsInComponent(component)];

    // Should have 5 actions
    expect(visits).toHaveLength(5);
  });
});

// ============================================================================
// getFormulasInApi Tests
// ============================================================================

describe('getFormulasInApi', () => {
  test('extracts url formula', () => {
    const urlFormula = makeValue('https://api.example.com');
    const api: ComponentAPI = {
      name: 'myApi',
      type: 'v2',
      url: urlFormula,
    };

    const visits = [...getFormulasInApi(api)];

    expect(visits.length).toBeGreaterThan(0);
    const urlVisit = visits.find(v => v.formula === urlFormula);
    expect(urlVisit?.path).toEqual(['api', 'url']);
  });

  test('extracts method formula', () => {
    const methodFormula = makeValue('POST');
    const api: ComponentAPI = {
      name: 'myApi',
      type: 'v2',
      method: methodFormula,
    };

    const visits = [...getFormulasInApi(api)];

    const methodVisit = visits.find(v => v.formula === methodFormula);
    expect(methodVisit?.path).toEqual(['api', 'method']);
  });

  test('extracts body formula', () => {
    const bodyFormula = makeObject([{ name: 'key', formula: makeValue('value') }]);
    const api: ComponentAPI = {
      name: 'myApi',
      type: 'v2',
      body: bodyFormula,
    };

    const visits = [...getFormulasInApi(api)];

    const bodyVisit = visits.find(v => v.formula === bodyFormula);
    expect(bodyVisit).toBeDefined();
  });

  test('extracts autoFetch formula', () => {
    const autoFetchFormula = makeValue(true);
    const api: ComponentAPI = {
      name: 'myApi',
      type: 'v2',
      autoFetch: autoFetchFormula,
    };

    const visits = [...getFormulasInApi(api)];

    const autoFetchVisit = visits.find(v => v.formula === autoFetchFormula);
    expect(autoFetchVisit?.path).toEqual(['api', 'autoFetch']);
  });

  test('extracts headers formulas', () => {
    const authFormula = makeValue('Bearer token');
    const enabledFormula = makeValue(true);
    const api: ComponentAPI = {
      name: 'myApi',
      type: 'v2',
      headers: {
        Authorization: {
          formula: authFormula,
          enabled: enabledFormula,
        },
      },
    };

    const visits = [...getFormulasInApi(api)];

    const authVisit = visits.find(v => v.formula === authFormula);
    const enabledVisit = visits.find(v => v.formula === enabledFormula);
    expect(authVisit?.path).toEqual(['api', 'headers', 'Authorization', 'formula']);
    expect(enabledVisit?.path).toEqual(['api', 'headers', 'Authorization', 'enabled']);
  });

  test('extracts queryParams formulas', () => {
    const pageFormula = makeValue(1);
    const limitFormula = makeValue(10);
    const enabledFormula = makeValue(true);
    const api: ComponentAPI = {
      name: 'myApi',
      type: 'v2',
      queryParams: {
        page: { formula: pageFormula },
        limit: {
          formula: limitFormula,
          enabled: enabledFormula,
        },
      },
    };

    const visits = [...getFormulasInApi(api)];

    const pageVisit = visits.find(v => v.formula === pageFormula);
    const limitVisit = visits.find(v => v.formula === limitFormula);
    const enabledVisit = visits.find(v => v.formula === enabledFormula);
    expect(pageVisit?.path).toEqual(['api', 'queryParams', 'page', 'formula']);
    expect(limitVisit?.path).toEqual(['api', 'queryParams', 'limit', 'formula']);
    expect(enabledVisit?.path).toEqual(['api', 'queryParams', 'limit', 'enabled']);
  });

  test('extracts formulas from client callbacks', () => {
    const completedFormula = makeValue('success');
    const failedFormula = makeValue('error');
    const messageFormula = makeValue('message');
    const api: ComponentAPI = {
      name: 'myApi',
      type: 'v2',
      client: {
        onCompleted: { actions: [makeSetVariable('result', completedFormula)] },
        onFailed: { actions: [makeSetVariable('error', failedFormula)] },
        onMessage: { actions: [makeSetVariable('msg', messageFormula)] },
      },
    };

    const visits = [...getFormulasInApi(api)];

    const completedVisit = visits.find(v => v.formula === completedFormula);
    const failedVisit = visits.find(v => v.formula === failedFormula);
    const messageVisit = visits.find(v => v.formula === messageFormula);
    expect(completedVisit).toBeDefined();
    expect(failedVisit).toBeDefined();
    expect(messageVisit).toBeDefined();
  });

  test('extracts all formulas from complex API', () => {
    const api: ComponentAPI = {
      name: 'complexApi',
      type: 'v2',
      url: makeValue('https://api.example.com'),
      method: makeValue('POST'),
      body: makeValue({ data: 'test' }),
      autoFetch: makeValue(false),
      headers: {
        Authorization: { formula: makeValue('Bearer token') },
      },
      queryParams: {
        page: { formula: makeValue(1), enabled: makeValue(true) },
      },
      client: {
        onCompleted: { actions: [makeSetVariable('done', makeValue(true))] },
      },
    };

    const visits = [...getFormulasInApi(api)];

    // Should have: url, method, body, autoFetch, auth header, page param, page enabled, onCompleted data
    expect(visits.length).toBeGreaterThanOrEqual(7);
  });

  test('uses custom path from options', () => {
    const urlFormula = makeValue('https://api.example.com');
    const api: ComponentAPI = {
      name: 'myApi',
      type: 'v2',
      url: urlFormula,
    };

    const visits = [...getFormulasInApi(api, { path: ['custom', 'path'] })];

    const urlVisit = visits.find(v => v.formula === urlFormula);
    expect(urlVisit?.path).toEqual(['custom', 'path', 'url']);
  });
});

// ============================================================================
// collectFormulaReferences Tests
// ============================================================================

describe('collectFormulaReferences', () => {
  test('returns empty set for component with no function formulas', () => {
    const component: Component = {
      name: 'MyComponent',
      nodes: {
        text1: { type: 'text', value: makeValue('hello') },
      },
    };

    const refs = collectFormulaReferences(component);

    expect(refs.size).toBe(0);
  });

  test('collects function formula names', () => {
    const component: Component = {
      name: 'MyComponent',
      formulas: {
        myFormula: {
          name: 'myFormula',
          formula: makeFunction('add', [
            { name: 'a', formula: makeValue(1) },
            { name: 'b', formula: makeFunction('multiply', [
              { name: 'x', formula: makeValue(2) },
            ]) },
          ]),
        },
      },
      nodes: {},
    };

    const refs = collectFormulaReferences(component);

    expect(refs.size).toBe(2);
    expect(refs.has('add')).toBe(true);
    expect(refs.has('multiply')).toBe(true);
  });

  test('includes package-qualified names when formula has nested function with package', () => {
    // The package field on a function affects its children's packageName context
    const component: Component = {
      name: 'MyComponent',
      formulas: {
        myFormula: {
          name: 'myFormula',
          formula: {
            type: 'function',
            name: 'someFunc',
            package: 'my-package',
            arguments: [
              {
                name: 'arg1',
                formula: makeFunction('nestedFunc'),
              },
            ],
          },
        },
      },
      nodes: {},
    };

    const refs = collectFormulaReferences(component);

    expect(refs.has('someFunc')).toBe(true);
    expect(refs.has('nestedFunc')).toBe(true);
    expect(refs.has('my-package/nestedFunc')).toBe(true);
  });

  test('collects from multiple sources in component', () => {
    const component: Component = {
      name: 'MyComponent',
      variables: {
        v1: {
          initialValue: makeFunction('func1'),
        },
      },
      workflows: {
        w1: {
          name: 'w1',
          parameters: [],
          actions: [makeSetVariable('x', makeFunction('func2'))],
        },
      },
      nodes: {
        text1: {
          type: 'text',
          value: makeFunction('func3'),
        },
      },
    };

    const refs = collectFormulaReferences(component);

    expect(refs.size).toBe(3);
    expect(refs.has('func1')).toBe(true);
    expect(refs.has('func2')).toBe(true);
    expect(refs.has('func3')).toBe(true);
  });
});

// ============================================================================
// collectActionReferences Tests
// ============================================================================

describe('collectActionReferences', () => {
  test('returns empty set for component with no custom actions', () => {
    const component: Component = {
      name: 'MyComponent',
      workflows: {
        w1: {
          name: 'w1',
          parameters: [],
          actions: [makeSetVariable('x')],
        },
      },
      nodes: {},
    };

    const refs = collectActionReferences(component);

    expect(refs.size).toBe(0);
  });

  test('collects custom action names', () => {
    const component: Component = {
      name: 'MyComponent',
      workflows: {
        w1: {
          name: 'w1',
          parameters: [],
          actions: [
            makeCustomAction('CustomAction1'),
            makeCustomAction('CustomAction2'),
          ],
        },
      },
      nodes: {},
    };

    const refs = collectActionReferences(component);

    expect(refs.size).toBe(2);
    expect(refs.has('CustomAction1')).toBe(true);
    expect(refs.has('CustomAction2')).toBe(true);
  });

  test('collects from nested custom actions', () => {
    const component: Component = {
      name: 'MyComponent',
      workflows: {
        w1: {
          name: 'w1',
          parameters: [],
          actions: [
            makeCustomAction('Outer', {
              events: {
                onDone: [makeCustomAction('Inner')],
              },
            }),
          ],
        },
      },
      nodes: {},
    };

    const refs = collectActionReferences(component);

    expect(refs.size).toBe(2);
    expect(refs.has('Outer')).toBe(true);
    expect(refs.has('Inner')).toBe(true);
  });

  test('handles actions with undefined/null type as custom', () => {
    const component: Component = {
      name: 'MyComponent',
      workflows: {
        w1: {
          name: 'w1',
          parameters: [],
          actions: [
            { name: 'UntypedAction' } as ActionModel,
          ],
        },
      },
      nodes: {},
    };

    const refs = collectActionReferences(component);

    expect(refs.has('UntypedAction')).toBe(true);
  });
});

// ============================================================================
// collectSubComponentNames Tests
// ============================================================================

describe('collectSubComponentNames', () => {
  test('returns empty array for component with no sub-components', () => {
    const component: Component = {
      name: 'MyComponent',
      nodes: {
        div1: { type: 'element', tag: 'div', children: [] },
      },
    };

    const getComponent = () => undefined;
    const names = collectSubComponentNames(component, getComponent);

    expect(names).toEqual([]);
  });

  test('collects single sub-component name', () => {
    const component: Component = {
      name: 'Parent',
      nodes: {
        child1: {
          type: 'component',
          name: 'ChildComponent',
          attrs: {},
          children: [],
        },
      },
    };

    const getComponent = () => undefined;
    const names = collectSubComponentNames(component, getComponent);

    expect(names).toEqual(['ChildComponent']);
  });

  test('includes package in component name', () => {
    const component: Component = {
      name: 'Parent',
      nodes: {
        child1: {
          type: 'component',
          name: 'Button',
          package: 'ui-lib',
          attrs: {},
          children: [],
        },
      },
    };

    const getComponent = () => undefined;
    const names = collectSubComponentNames(component, getComponent);

    expect(names).toEqual(['ui-lib/Button']);
  });

  test('collects nested sub-components recursively', () => {
    const grandchild: Component = {
      name: 'Grandchild',
      nodes: {},
    };

    const child: Component = {
      name: 'Child',
      nodes: {
        gc1: {
          type: 'component',
          name: 'Grandchild',
          attrs: {},
          children: [],
        },
      },
    };

    const parent: Component = {
      name: 'Parent',
      nodes: {
        c1: {
          type: 'component',
          name: 'Child',
          attrs: {},
          children: [],
        },
      },
    };

    const getComponent = (name: string) => {
      if (name === 'Child') return child;
      if (name === 'Grandchild') return grandchild;
      return undefined;
    };

    const names = collectSubComponentNames(parent, getComponent);

    expect(names).toEqual(['Child', 'Grandchild']);
  });

  test('prevents circular references', () => {
    const component: Component = {
      name: 'Recursive',
      nodes: {
        self: {
          type: 'component',
          name: 'Recursive',
          attrs: {},
          children: [],
        },
      },
    };

    const getComponent = (name: string) => {
      if (name === 'Recursive') return component;
      return undefined;
    };

    const names = collectSubComponentNames(component, getComponent);

    // Should only appear once
    expect(names).toEqual(['Recursive']);
  });

  test('handles multiple instances of same component', () => {
    const component: Component = {
      name: 'Parent',
      nodes: {
        child1: {
          type: 'component',
          name: 'Button',
          attrs: {},
          children: [],
        },
        child2: {
          type: 'component',
          name: 'Button',
          attrs: {},
          children: [],
        },
      },
    };

    const getComponent = () => undefined;
    const names = collectSubComponentNames(component, getComponent);

    // Should only appear once
    expect(names).toEqual(['Button']);
  });

  test('respects packageName parameter', () => {
    const child: Component = {
      name: 'Child',
      nodes: {
        gc1: {
          type: 'component',
          name: 'Grandchild',
          attrs: {},
          children: [],
        },
      },
    };

    const parent: Component = {
      name: 'Parent',
      nodes: {
        c1: {
          type: 'component',
          name: 'Child',
          package: 'pkg1',
          attrs: {},
          children: [],
        },
      },
    };

    const getComponent = (name: string, pkg?: string) => {
      if (name === 'Child' && pkg === 'pkg1') return child;
      return undefined;
    };

    const names = collectSubComponentNames(parent, getComponent);

    expect(names).toContain('pkg1/Child');
  });

  test('collects complex nested tree', () => {
    const leaf: Component = { name: 'Leaf', nodes: {} };
    const branch1: Component = {
      name: 'Branch1',
      nodes: {
        l1: { type: 'component', name: 'Leaf', attrs: {}, children: [] },
      },
    };
    const branch2: Component = {
      name: 'Branch2',
      nodes: {
        l2: { type: 'component', name: 'Leaf', attrs: {}, children: [] },
      },
    };
    const root: Component = {
      name: 'Root',
      nodes: {
        b1: { type: 'component', name: 'Branch1', attrs: {}, children: [] },
        b2: { type: 'component', name: 'Branch2', attrs: {}, children: [] },
      },
    };

    const getComponent = (name: string) => {
      if (name === 'Branch1') return branch1;
      if (name === 'Branch2') return branch2;
      if (name === 'Leaf') return leaf;
      return undefined;
    };

    const names = collectSubComponentNames(root, getComponent);

    expect(names).toEqual(['Branch1', 'Leaf', 'Branch2']);
  });
});
