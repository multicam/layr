/**
 * Tests for event linting rules
 */

import { describe, test, expect } from 'bun:test';
import { duplicateEventTriggerRule } from './duplicateEventTriggerRule';
import { noReferenceEventRule } from './noReferenceEventRule';
import { unknownTriggerEventRule } from './unknownTriggerEventRule';
import type { ProjectFiles, Component } from '@layr/types';

// Helper to create a minimal project files structure
function createProjectFiles(components: Record<string, Component>): ProjectFiles {
  return { components };
}

describe('duplicateEventTriggerRule', () => {
  // Note: In the current data model, object keys are unique so this rule
  // primarily serves as documentation and for future extensibility

  test('handles components without node events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
      },
    });

    duplicateEventTriggerRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles components with unique events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'button',
            events: {
              click: { actions: [] },
            },
          },
        },
      },
    });

    duplicateEventTriggerRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('noReferenceEventRule', () => {
  test('reports events that are never triggered', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: [
          { name: 'onDataLoaded' }, // defined but never triggered
          { name: 'onError' }, // defined but never triggered
        ],
      },
    });

    noReferenceEventRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(2);
    const eventNames = issues.map(i => i.data.eventName);
    expect(eventNames).toContain('onDataLoaded');
    expect(eventNames).toContain('onError');
  });

  test('does not report events that are triggered', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {
          node1: {
            type: 'element',
            tag: 'button',
            events: {
              click: {
                actions: [
                  { type: 'TriggerEvent', name: 'onDataLoaded' },
                ],
              },
            },
          },
        },
        events: [
          { name: 'onDataLoaded' }, // triggered by click handler
        ],
      },
    });

    noReferenceEventRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles events triggered from workflows', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: [
          { name: 'onComplete' },
        ],
        workflows: {
          fetchData: {
            name: 'fetchData',
            parameters: [],
            actions: [
              { type: 'TriggerEvent', name: 'onComplete' },
            ],
          },
        },
      },
    });

    noReferenceEventRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles components without events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
      },
    });

    noReferenceEventRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });
});

describe('unknownTriggerEventRule', () => {
  test('reports TriggerEvent actions for undefined events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        workflows: {
          myWorkflow: {
            name: 'myWorkflow',
            parameters: [],
            actions: [
              { type: 'TriggerEvent', name: 'nonExistentEvent' }, // not defined!
            ],
          },
        },
      },
    });

    unknownTriggerEventRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.eventName).toBe('nonExistentEvent');
  });

  test('does not report TriggerEvent actions for defined events', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: [
          { name: 'onComplete' },
        ],
        workflows: {
          myWorkflow: {
            name: 'myWorkflow',
            parameters: [],
            actions: [
              { type: 'TriggerEvent', name: 'onComplete' }, // defined!
            ],
          },
        },
      },
    });

    unknownTriggerEventRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(0);
  });

  test('handles nested actions in Switch', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: [
          { name: 'validEvent' },
        ],
        workflows: {
          myWorkflow: {
            name: 'myWorkflow',
            parameters: [],
            actions: [
              {
                type: 'Switch',
                data: { type: 'value', value: true },
                cases: [
                  {
                    condition: { type: 'value', value: true },
                    actions: [
                      { type: 'TriggerEvent', name: 'invalidEvent' }, // not defined!
                    ],
                  },
                ],
                default: { actions: [] },
              },
            ],
          },
        },
      },
    });

    unknownTriggerEventRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.eventName).toBe('invalidEvent');
  });

  test('handles TriggerEvent in Fetch callbacks', () => {
    const issues: any[] = [];
    const files = createProjectFiles({
      Component1: {
        name: 'Component1',
        nodes: {},
        events: [
          { name: 'onSuccess' },
        ],
        workflows: {
          fetchData: {
            name: 'fetchData',
            parameters: [],
            actions: [
              {
                type: 'Fetch',
                name: 'myApi',
                onSuccess: {
                  actions: [
                    { type: 'TriggerEvent', name: 'onSuccess' }, // valid
                  ],
                },
                onError: {
                  actions: [
                    { type: 'TriggerEvent', name: 'onError' }, // not defined!
                  ],
                },
              },
            ],
          },
        },
      },
    });

    unknownTriggerEventRule.visit(
      (data, path, fixes) => issues.push({ data, path, fixes }),
      {
        files,
        memo: (key, factory) => factory(),
      }
    );

    expect(issues).toHaveLength(1);
    expect(issues[0].data.eventName).toBe('onError');
  });
});
