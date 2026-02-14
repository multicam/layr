import { useUIStore, useSelectionStore, useProjectStore } from '../stores';
import { PropertiesTab } from './tabs/PropertiesTab';
import { StylesTab } from './tabs/StylesTab';
import { EventsTab } from './tabs/EventsTab';
import { AnimationTab } from './tabs/AnimationTab';
import { AdvancedTab } from './tabs/AdvancedTab';
import type { Component } from '@layr/types';

type Tab = 'properties' | 'styles' | 'events' | 'animation' | 'advanced';

export function Inspector() {
  const activeTab = useUIStore(s => s.activeTab);
  const setActiveTab = useUIStore(s => s.setActiveTab);
  
  const selectedIds = useSelectionStore(s => s.selectedIds);
  const project = useProjectStore(s => s.project);
  const activeComponent = useProjectStore(s => s.activeComponent);
  
  const selectedId = selectedIds[0];
  const components = project?.files?.components;
  const component: Component | undefined = activeComponent ? components?.[activeComponent] : undefined;
  const selectedNode = selectedId && component?.nodes?.[selectedId];
  
  const tabs: Tab[] = ['properties', 'styles', 'events', 'animation', 'advanced'];
  
  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-shrink-0 px-3 py-2 text-sm font-medium capitalize
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
            {activeTab === 'properties' && <PropertiesTab node={selectedNode} componentId={activeComponent!} nodeId={selectedId} />}
            {activeTab === 'styles' && <StylesTab node={selectedNode} componentId={activeComponent!} nodeId={selectedId} />}
            {activeTab === 'events' && <EventsTab node={selectedNode} componentId={activeComponent!} nodeId={selectedId} />}
            {activeTab === 'animation' && <AnimationTab node={selectedNode} />}
            {activeTab === 'advanced' && <AdvancedTab node={selectedNode} componentId={activeComponent!} nodeId={selectedId} />}
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
