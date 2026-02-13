import { clsx } from 'clsx';
import { useProjectStore, useSelectionStore, useIsSelected } from '../stores';
import type { NodeModel } from '@layr/types';

export function Sidebar() {
  const project = useProjectStore(s => s.project);
  const activeComponent = useProjectStore(s => s.activeComponent);
  
  if (!project || !activeComponent) {
    return (
      <div className="p-4 text-gray-500">
        No project loaded
      </div>
    );
  }
  
  const components = project.files?.components || {};
  const component = components[activeComponent];
  
  return (
    <div className="h-full flex flex-col">
      {/* Component selector */}
      <div className="p-2 border-b border-gray-200">
        <select
          value={activeComponent}
          onChange={(e) => useProjectStore.getState().setActiveComponent(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        >
          {Object.entries(components).map(([id, comp]) => (
            <option key={id} value={id}>
              {comp.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Component tree */}
      <div className="flex-1 overflow-auto p-2">
        <ComponentTree nodes={component.nodes} />
      </div>
    </div>
  );
}

interface ComponentTreeProps {
  nodes: Record<string, NodeModel>;
}

function ComponentTree({ nodes }: ComponentTreeProps) {
  const root = nodes['root'];
  if (!root) return null;
  
  return (
    <ul className="space-y-0.5">
      <TreeNode node={root} nodes={nodes} depth={0} />
    </ul>
  );
}

interface TreeNodeProps {
  node: NodeModel;
  nodes: Record<string, NodeModel>;
  depth: number;
}

function TreeNode({ node, nodes, depth }: TreeNodeProps) {
  const nodeId = node.id || 'unknown';
  const isSelected = useIsSelected(nodeId);
  const select = useSelectionStore(s => s.select);
  
  const children = 'children' in node && Array.isArray(node.children) 
    ? (node.children as string[])
    : [];
  
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState(true);
  
  const nodeType = node.type;
  const label = getNodeLabel(node);
  const icon = getNodeIcon(nodeType);
  
  return (
    <li>
      <div
        className={clsx(
          'flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-sm',
          isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={() => select(nodeId)}
      >
        {/* Expand/collapse */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        
        {/* Icon */}
        <span className="text-gray-500">{icon}</span>
        
        {/* Label */}
        <span className="truncate">{label}</span>
      </div>
      
      {/* Children */}
      {expanded && hasChildren && (
        <ul className="space-y-0.5">
          {children.map(childId => {
            const child = nodes[childId];
            if (!child) return null;
            return (
              <TreeNode
                key={childId}
                node={child}
                nodes={nodes}
                depth={depth + 1}
              />
            );
          })}
        </ul>
      )}
    </li>
  );
}

function getNodeLabel(node: NodeModel): string {
  if (node.type === 'text') {
    const val = (node as any).value?.value;
    if (typeof val === 'string') {
      return val.slice(0, 20) || 'Text';
    }
    return 'Text';
  }
  if (node.type === 'element') {
    return (node as any).tag || 'div';
  }
  if (node.type === 'component') {
    return (node as any).name || 'Component';
  }
  if (node.type === 'slot') {
    return 'Slot';
  }
  return node.type;
}

function getNodeIcon(type: string): string {
  switch (type) {
    case 'text': return '📝';
    case 'element': return '📦';
    case 'component': return '🧩';
    case 'slot': return '📁';
    default: return '❓';
  }
}

// Need to import useState
import { useState } from 'react';
