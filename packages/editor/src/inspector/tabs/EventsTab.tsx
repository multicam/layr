import type { NodeModel } from '@layr/types';

interface EventsTabProps {
  node: NodeModel;
}

export function EventsTab({ node }: EventsTabProps) {
  const events = 'events' in node ? node.events : {};
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Events</h3>
      
      {Object.keys(events || {}).length === 0 ? (
        <div className="text-sm text-gray-500">
          No events configured
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(events || {}).map(([eventName, handler]) => (
            <div key={eventName} className="p-2 bg-gray-50 rounded">
              <div className="text-sm font-medium">{eventName}</div>
              <div className="text-xs text-gray-500">
                {Array.isArray((handler as any)?.actions) 
                  ? `${(handler as any).actions.length} actions` 
                  : 'No actions'}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add event button */}
      <button className="w-full py-2 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50">
        + Add Event
      </button>
    </div>
  );
}
