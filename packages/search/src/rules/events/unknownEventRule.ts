/**
 * Unknown Event Rule
 * Checks for references to non-existent events
 */

import type { Rule } from '../../types';

export const unknownEventRule: Rule = {
  code: 'unknown event',
  level: 'error',
  category: 'events',
  visit: (report, ctx) => {
    // Standard DOM events that are always valid for elements
    const standardEvents = new Set([
      'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseenter', 'mouseleave',
      'mouseover', 'mouseout', 'keydown', 'keyup', 'keypress', 'focus', 'blur', 'change',
      'input', 'submit', 'reset', 'select', 'copy', 'cut', 'paste', 'drag', 'dragend',
      'dragenter', 'dragleave', 'dragover', 'dragstart', 'drop', 'scroll', 'wheel',
      'touchstart', 'touchend', 'touchmove', 'touchcancel', 'animationend', 'animationstart',
      'transitionend', 'load', 'error', 'contextmenu', 'resize', 'pointerdown', 'pointerup',
      'pointermove', 'pointerenter', 'pointerleave', 'pointercancel', 'gotpointercapture',
      'lostpointercapture'
    ]);
    
    // Walk all components to find event references
    for (const [compName, component] of Object.entries(ctx.files.components || {})) {
      if (!component) continue;
      
      // Collect component-defined events (custom events that can be triggered)
      const componentEvents = new Set<string>();
      for (const evtName of Object.keys(component.events || {})) {
        componentEvents.add(evtName);
      }
      
      // Check nodes for event handlers
      for (const [nodeId, node] of Object.entries(component.nodes || {})) {
        if (!node) continue;
        
        if (node.type === 'element') {
          // Element nodes can have standard DOM events
          for (const evtName of Object.keys(node.events || {})) {
            // Standard events are always valid for elements
            // Non-standard events might be custom events - we don't warn for elements
          }
        } else if (node.type === 'component') {
          // Component nodes must reference events defined on that component
          const refName = node.name as string;
          if (refName) {
            // Get the referenced component's events
            let refComponent = ctx.files.components?.[refName];
            if (!refName.includes('/')) {
              // Check packages
              for (const pkg of Object.values(ctx.files.packages || {})) {
                if (pkg?.components?.[refName]) {
                  refComponent = pkg.components[refName];
                  break;
                }
              }
            } else {
              // Package component reference
              const [pkgName, compName] = refName.split('/');
              refComponent = ctx.files.packages?.[pkgName]?.components?.[compName];
            }
            
            if (refComponent) {
              // Get events defined on the referenced component
              const refEvents = new Set(Object.keys(refComponent.events || {}));
              
              for (const evtName of Object.keys(node.events || {})) {
                if (!refEvents.has(evtName)) {
                  report({ eventName: evtName, componentName: refName }, 
                    ['components', compName, 'nodes', nodeId, 'events', evtName]);
                }
              }
            }
          }
        }
      }
    }
  }
};
