/**
 * Duplicate Event Trigger Rule
 * Detects when the same event trigger is registered multiple times on a node
 */

import type { Rule } from '../../types';
import type { NodeModel } from '@layr/types';

export const duplicateEventTriggerRule: Rule<{
  eventName: string;
  occurrences: number;
}> = {
  code: 'duplicate event trigger',
  level: 'warning',
  category: 'events',
  visit: (report, ctx) => {
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component?.nodes) continue;

      for (const [nodeId, node] of Object.entries(component.nodes)) {
        if (!node?.events) continue;

        // Count event trigger occurrences
        const eventCounts = new Map<string, number>();
        for (const eventName of Object.keys(node.events)) {
          const count = eventCounts.get(eventName) || 0;
          eventCounts.set(eventName, count + 1);
        }

        // Report duplicates (keys are unique in objects, so this checks for
        // the same event being handled via different event handlers if we had that capability)
        // For now, this reports if there are duplicate handler definitions
        for (const [eventName, count] of eventCounts) {
          if (count > 1) {
            report(
              { eventName, occurrences: count },
              ['components', compName, 'nodes', nodeId, 'events', eventName]
            );
          }
        }

        // Note: In the current data model, object keys are unique so this won't fire
        // This rule is more relevant if event triggers can be defined in multiple places
        // For now, it serves as documentation and for future extensibility
      }
    }
  },
};
