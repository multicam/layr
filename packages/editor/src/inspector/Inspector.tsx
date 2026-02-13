import { useUIStore, useSelectionStore, useProjectStore } from '../stores';
import { PropertiesTab } from './tabs/PropertiesTab';
import { StylesTab } from './tabs/StylesTab';
import { EventsTab } from './tabs/EventsTab';

type Tab = 'properties' | 'styles' | 'events' | 'advanced';

export function Inspector() {
  const activeTab = useUIStore(s => s.activeTab);
  const setActiveTab = useUIStore(s => s.setActiveTab);
  
  const selectedIds = useSelectionStore(s => s.selectedIds);
  const project = useProjectStore(s => s.project);
  const activeComponent = useProjectStore(s => s.activeComponent);
  
  // Get selected node
  const selectedId = selectedIds[0];
  const component = activeComponent && project?.files?.components?.[activeComponent];
  const selectedNode = selectedId && component?.nodes[selectedId];
  
  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['properties', 'styles', 'events', 'advanced'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 px-3 py-2 text-sm font-medium capitalize
              ${activeTab === tab 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'}
            `}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {selectedNode ? (
          <>
            {activeTab === 'properties' && <PropertiesTab node={selectedNode} />}
            {activeTab === 'styles' && <StylesTab node={selectedNode} />}
            {activeTab === 'events' && <EventsTab node={selectedNode} />}
            {activeTab === 'advanced' && <div>Advanced settings</div>}
          </>
        ) : (
          <div className="text-gray-500 text-sm">
            Select an element to inspect
          </div>
        )}
      </div>
    </div>
  );
}
