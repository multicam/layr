import { describe, test, expect } from 'bun:test';

describe('types package', () => {
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
