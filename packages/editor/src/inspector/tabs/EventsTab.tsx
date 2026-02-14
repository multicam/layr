import { useState } from 'react';
import type { NodeModel, EventModel, ActionModel } from '@layr/types';
import { useProjectStore } from '../../stores';
import { clsx } from 'clsx';

interface EventsTabProps {
  node: NodeModel;
  componentId: string;
  nodeId: string;
}

const COMMON_EVENTS = [
  { name: 'click', label: 'Click' },
  { name: 'dblclick', label: 'Double Click' },
  { name: 'mouseenter', label: 'Mouse Enter' },
  { name: 'mouseleave', label: 'Mouse Leave' },
  { name: 'focus', label: 'Focus' },
  { name: 'blur', label: 'Blur' },
  { name: 'change', label: 'Change' },
  { name: 'input', label: 'Input' },
  { name: 'submit', label: 'Submit' },
  { name: 'keydown', label: 'Key Down' },
  { name: 'keyup', label: 'Key Up' },
  { name: 'scroll', label: 'Scroll' },
];

const ACTION_TYPES = [
  { type: 'SetVariable', label: 'Set Variable' },
  { type: 'TriggerEvent', label: 'Trigger Event' },
  { type: 'TriggerWorkflow', label: 'Trigger Workflow' },
  { type: 'Fetch', label: 'Fetch API' },
  { type: 'AbortFetch', label: 'Abort Fetch' },
  { type: 'Switch', label: 'Switch/Conditional' },
  { type: 'SetURLParameter', label: 'Set URL Parameter' },
  { type: 'Custom', label: 'Custom Action' },
] as const;

export function EventsTab({ node, componentId, nodeId }: EventsTabProps) {
  const updateNode = useProjectStore(s => s.updateNode);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);

  const events = 'events' in node ? (node.events ?? {}) : {};

  const addEvent = (eventName: string) => {
    const currentEvents = 'events' in node ? { ...node.events } : {};
    if (!(eventName in currentEvents)) {
      currentEvents[eventName] = { actions: [] };
      updateNode(componentId, nodeId, { events: currentEvents } as Partial<NodeModel>);
    }
    setShowAddEvent(false);
    setExpandedEvent(eventName);
  };

  const removeEvent = (eventName: string) => {
    const currentEvents = 'events' in node ? { ...node.events } : {};
    delete currentEvents[eventName];
    updateNode(componentId, nodeId, { events: currentEvents } as Partial<NodeModel>);
    if (expandedEvent === eventName) {
      setExpandedEvent(null);
    }
  };

  const addAction = (eventName: string, actionType: string) => {
    const currentEvents = 'events' in node ? { ...node.events } : {};
    const event = currentEvents[eventName];
    if (!event) return;

    let newAction: ActionModel;
    switch (actionType) {
      case 'SetVariable':
        newAction = { type: 'SetVariable', name: '', data: { type: 'value', value: '' } };
        break;
      case 'TriggerEvent':
        newAction = { type: 'TriggerEvent', name: '', data: { type: 'value', value: '' } };
        break;
      case 'TriggerWorkflow':
        newAction = { type: 'TriggerWorkflow', name: '' };
        break;
      case 'Fetch':
        newAction = { type: 'Fetch', name: '' };
        break;
      case 'AbortFetch':
        newAction = { type: 'AbortFetch', name: '' };
        break;
      case 'SetURLParameter':
        newAction = { type: 'SetURLParameter', name: '', data: { type: 'value', value: '' } };
        break;
      case 'Custom':
        newAction = { type: 'Custom', name: '' };
        break;
      default:
        return;
    }

    event.actions = [...(event.actions || []), newAction];
    updateNode(componentId, nodeId, { events: currentEvents } as Partial<NodeModel>);
  };

  const removeAction = (eventName: string, actionIndex: number) => {
    const currentEvents = 'events' in node ? { ...node.events } : {};
    const event = currentEvents[eventName];
    if (!event) return;

    event.actions = event.actions.filter((_, i) => i !== actionIndex);
    updateNode(componentId, nodeId, { events: currentEvents } as Partial<NodeModel>);
  };

  const updateAction = (eventName: string, actionIndex: number, updates: Partial<ActionModel>) => {
    const currentEvents = 'events' in node ? { ...node.events } : {};
    const event = currentEvents[eventName];
    if (!event) return;

    event.actions[actionIndex] = { ...event.actions[actionIndex], ...updates } as ActionModel;
    updateNode(componentId, nodeId, { events: currentEvents } as Partial<NodeModel>);
  };

  const existingEventNames = Object.keys(events);
  const availableEvents = COMMON_EVENTS.filter(e => !existingEventNames.includes(e.name));

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Events</h3>

      {Object.keys(events).length === 0 && !showAddEvent ? (
        <div className="text-sm text-gray-500 text-center py-4">
          No events configured
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(events).map(([eventName, handler]) => {
            const isExpanded = expandedEvent === eventName;
            const actions = (handler as EventModel)?.actions || [];

            return (
              <div key={eventName} className="border border-gray-200 rounded overflow-hidden">
                {/* Event header */}
                <div
                  className={clsx(
                    'flex items-center justify-between px-3 py-2 cursor-pointer',
                    isExpanded ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'
                  )}
                  onClick={() => setExpandedEvent(isExpanded ? null : eventName)}
                >
                  <div className="flex items-center gap-2">
                    <span className={clsx('transition-transform', isExpanded && 'rotate-90')}>
                      ▶
                    </span>
                    <span className="text-sm font-medium">{eventName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{actions.length} actions</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeEvent(eventName);
                      }}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="p-3 border-t border-gray-200 space-y-2">
                    {/* Actions list */}
                    {actions.map((action, index) => (
                      <div key={index} className="bg-gray-50 rounded p-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-blue-600">
                            {action.type || 'Custom'}
                          </span>
                          <button
                            onClick={() => removeAction(eventName, index)}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <ActionEditor
                          action={action}
                          onChange={(updates) => updateAction(eventName, index, updates)}
                        />
                      </div>
                    ))}

                    {/* Add action dropdown */}
                    <div className="pt-2">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            addAction(eventName, e.target.value);
                          }
                        }}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="">+ Add action...</option>
                        {ACTION_TYPES.map(({ type, label }) => (
                          <option key={type} value={type}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add event section */}
      {showAddEvent ? (
        <div className="border border-blue-300 rounded p-2 space-y-2">
          <div className="text-xs font-medium text-gray-600 mb-2">Select event type:</div>
          <div className="grid grid-cols-2 gap-1">
            {availableEvents.map(({ name, label }) => (
              <button
                key={name}
                onClick={() => addEvent(name)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-blue-100 rounded text-left"
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddEvent(false)}
            className="w-full text-xs text-gray-500 hover:text-gray-700 py-1"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddEvent(true)}
          className="w-full py-2 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
        >
          + Add Event
        </button>
      )}
    </div>
  );
}

interface ActionEditorProps {
  action: ActionModel;
  onChange: (updates: Partial<ActionModel>) => void;
}

function ActionEditor({ action, onChange }: ActionEditorProps) {
  switch (action.type) {
    case 'SetVariable':
      return (
        <div className="space-y-1">
          <input
            type="text"
            placeholder="Variable name"
            value={action.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full text-xs border rounded px-2 py-1"
          />
          <input
            type="text"
            placeholder="Value (formula)"
            value={(action.data as any)?.value || ''}
            onChange={(e) => onChange({ data: { type: 'value', value: e.target.value } })}
            className="w-full text-xs border rounded px-2 py-1"
          />
        </div>
      );

    case 'TriggerEvent':
      return (
        <input
          type="text"
          placeholder="Event name"
          value={action.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full text-xs border rounded px-2 py-1"
        />
      );

    case 'TriggerWorkflow':
      return (
        <input
          type="text"
          placeholder="Workflow name"
          value={action.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full text-xs border rounded px-2 py-1"
        />
      );

    case 'Fetch':
      return (
        <input
          type="text"
          placeholder="API name"
          value={action.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full text-xs border rounded px-2 py-1"
        />
      );

    case 'AbortFetch':
      return (
        <input
          type="text"
          placeholder="API name to abort"
          value={action.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full text-xs border rounded px-2 py-1"
        />
      );

    case 'SetURLParameter':
      return (
        <div className="space-y-1">
          <input
            type="text"
            placeholder="Parameter name"
            value={action.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full text-xs border rounded px-2 py-1"
          />
          <input
            type="text"
            placeholder="Value (formula)"
            value={(action.data as any)?.value || ''}
            onChange={(e) => onChange({ data: { type: 'value', value: e.target.value } })}
            className="w-full text-xs border rounded px-2 py-1"
          />
        </div>
      );

    case 'Custom':
    case undefined:
      return (
        <div className="space-y-1">
          <input
            type="text"
            placeholder="Action name"
            value={action.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full text-xs border rounded px-2 py-1"
          />
          {action.package && (
            <div className="text-xs text-gray-500">Package: {action.package}</div>
          )}
        </div>
      );

    default:
      return (
        <div className="text-xs text-gray-500">
          Configure in advanced editor
        </div>
      );
  }
}
