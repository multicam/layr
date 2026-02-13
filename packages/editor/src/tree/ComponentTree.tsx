import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useProjectStore, useSelectionStore, useIsSelected } from '../stores';
import type { NodeModel } from '@layr/types';
import { clsx } from 'clsx';

export function ComponentTree() {
  const project = useProjectStore(s => s.project);
  const activeComponent = useProjectStore(s => s.activeComponent);
  const moveNode = useProjectStore(s => s.moveNode);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const [activeId, setActiveId] = useState<string | null>(null);
  
  if (!project || !activeComponent) {
    return (
      <div className="p-4 text-gray-500">
        No project loaded
      </div>
    );
  }
  
  const components = project.files?.components || {};
  const component = components[activeComponent];
  const root = component.nodes['root'];
  
  if (!root) return null;
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      // Find parent and index
      const findParent = (nodeId: string, nodes: Record<string, NodeModel>): { parentId: string; index: number } | null => {
        for (const [parentId, node] of Object.entries(nodes)) {
          if ('children' in node && Array.isArray(node.children)) {
            const idx = node.children.indexOf(nodeId);
            if (idx !== -1) {
              return { parentId, index: idx };
            }
          }
        }
        return null;
      };
      
      const activeParent = findParent(active.id as string, component.nodes);
      const overParent = findParent(over.id as string, component.nodes);
      
      if (activeParent && overParent) {
        // For now, just reorder within same parent
        if (activeParent.parentId === overParent.parentId) {
          const parent = component.nodes[activeParent.parentId];
          if ('children' in parent && Array.isArray(parent.children)) {
            const newChildren = [...parent.children];
            const [removed] = newChildren.splice(activeParent.index, 1);
            newChildren.splice(overParent.index, 0, removed);
            (parent as any).children = newChildren;
          }
        }
      }
    }
  };
  
  // Get all node IDs for sortable context
  const getAllNodeIds = (node: NodeModel, nodes: Record<string, NodeModel>): string[] => {
    const ids = [node.id || 'unknown'];
    if ('children' in node && Array.isArray(node.children)) {
      for (const childId of node.children) {
        const child = nodes[childId];
        if (child) {
          ids.push(...getAllNodeIds(child, nodes));
        }
      }
    }
    return ids;
  };
  
  const nodeIds = getAllNodeIds(root, component.nodes);
  
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={nodeIds} strategy={verticalListSortingStrategy}>
            <ul className="space-y-0.5">
              <SortableTreeNode 
                node={root} 
                nodes={component.nodes} 
                depth={0} 
              />
            </ul>
          </SortableContext>
          
          <DragOverlay>
            {activeId ? (
              <div className="bg-blue-100 px-2 py-1 rounded text-sm">
                {activeId}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

interface SortableTreeNodeProps {
  node: NodeModel;
  nodes: Record<string, NodeModel>;
  depth: number;
}

function SortableTreeNode({ node, nodes, depth }: SortableTreeNodeProps) {
  const nodeId = node.id || 'unknown';
  const isSelected = useIsSelected(nodeId);
  const select = useSelectionStore(s => s.select);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: nodeId });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  const children = 'children' in node && Array.isArray(node.children) 
    ? (node.children as string[])
    : [];
  const hasChildren = children.length > 0;
  const [expanded, setExpanded] = useState(true);
  
  const nodeType = node.type;
  const label = getNodeLabel(node);
  const icon = getNodeIcon(nodeType);
  
  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={clsx(
          'flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-sm',
          isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100',
          isDragging && 'shadow-lg'
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={() => select(nodeId)}
        {...attributes}
        {...listeners}
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
        <span className="truncate flex-1">{label}</span>
      </div>
      
      {/* Children */}
      {expanded && hasChildren && (
        <ul className="space-y-0.5">
          {children.map(childId => {
            const child = nodes[childId];
            if (!child) return null;
            return (
              <SortableTreeNode
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
