import type { Component, NodeModel } from '@layr/types';
import { useIsSelected, useIsHovered, useSelectionStore } from '../stores';
import { clsx } from 'clsx';

const ALLOWED_TAGS = new Set(['div','span','p','h1','h2','h3','h4','h5','h6',
  'button','a','img','input','section','article','header','footer','nav',
  'aside','main','ul','ol','li','form','label','textarea','select','option',
  'table','thead','tbody','tr','td','th','br','hr','strong','em','b','i',
  'video','audio','figure','figcaption','blockquote','pre','code','small','sub','sup']);

interface NodeRendererProps {
  component: Component;
}

export function NodeRenderer({ component }: NodeRendererProps) {
  const nodes = component.nodes;
  const root = nodes['root'];
  
  if (!root) return null;
  
  return (
    <div className="p-8">
      {renderNode(root, nodes, 0)}
    </div>
  );
}

function renderNode(node: NodeModel, allNodes: Record<string, NodeModel>, depth: number): React.ReactNode {
  const nodeId = node.id || 'unknown';
  
  switch (node.type) {
    case 'text':
      return <TextWrapper key={nodeId} node={node} />;
    case 'element':
      return <ElementWrapper key={nodeId} node={node as any} allNodes={allNodes} depth={depth} />;
    case 'component':
      return <ComponentWrapper key={nodeId} node={node as any} />;
    case 'slot':
      return <SlotWrapper key={nodeId} node={node as any} allNodes={allNodes} depth={depth} />;
    default:
      return null;
  }
}

function TextWrapper({ node }: { node: NodeModel }) {
  const nodeId = node.id || 'unknown';
  const isSelected = useIsSelected(nodeId);
  const isHovered = useIsHovered(nodeId);
  const hover = useSelectionStore(s => s.hover);
  const select = useSelectionStore(s => s.select);
  
  const value = (node as any).value?.type === 'value' 
    ? String((node as any).value.value ?? '') 
    : '';
  
  return (
    <span
      data-id={nodeId}
      className={clsx(
        'outline-none',
        isSelected && 'ring-2 ring-blue-500',
        isHovered && !isSelected && 'ring-1 ring-blue-300',
      )}
      onMouseEnter={() => hover(nodeId)}
      onMouseLeave={() => hover(null)}
      onClick={(e) => {
        e.stopPropagation();
        select(nodeId);
      }}
    >
      {value}
    </span>
  );
}

function ElementWrapper({ node, allNodes, depth }: { 
  node: any; 
  allNodes: Record<string, NodeModel>;
  depth: number;
}) {
  const nodeId = node.id || 'unknown';
  const tag = node.tag || 'div';
  const isSelected = useIsSelected(nodeId);
  const isHovered = useIsHovered(nodeId);
  const hover = useSelectionStore(s => s.hover);
  const select = useSelectionStore(s => s.select);
  
  const children = (node.children || []).map((childId: string) => {
    const child = allNodes[childId];
    if (!child) return null;
    return renderNode(child, allNodes, depth + 1);
  });
  
  const attrs: Record<string, string> = {};
  if (node.attrs) {
    for (const [key, value] of Object.entries(node.attrs)) {
      if ((value as any)?.type === 'value') {
        attrs[key] = String((value as any).value ?? '');
      }
    }
  }
  
  // Build className
  const className = clsx(
    attrs.class || attrs.className || '',
    isSelected && 'ring-2 ring-blue-500',
    isHovered && !isSelected && 'ring-1 ring-blue-300',
  );

  const safeTag = ALLOWED_TAGS.has(tag) ? tag : 'div';
  const Element = safeTag as keyof JSX.IntrinsicElements;
  
  return (
    <Element
      data-id={nodeId}
      className={className}
      style={{
        position: 'relative' as const,
      }}
      onMouseEnter={() => hover(nodeId)}
      onMouseLeave={() => hover(null)}
      onClick={(e) => {
        e.stopPropagation();
        select(nodeId);
      }}
    >
      {children}
    </Element>
  );
}

function ComponentWrapper({ node }: { node: any }) {
  const nodeId = node.id || 'unknown';
  const name = node.name || 'Unknown';
  const isSelected = useIsSelected(nodeId);
  const isHovered = useIsHovered(nodeId);
  const hover = useSelectionStore(s => s.hover);
  const select = useSelectionStore(s => s.select);
  
  return (
    <div
      data-id={nodeId}
      data-component={name}
      className={clsx(
        'border-2 border-dashed border-purple-400 p-4',
        isSelected && 'ring-2 ring-blue-500',
        isHovered && !isSelected && 'ring-1 ring-blue-300',
      )}
      onMouseEnter={() => hover(nodeId)}
      onMouseLeave={() => hover(null)}
      onClick={(e) => {
        e.stopPropagation();
        select(nodeId);
      }}
    >
      <div className="text-sm text-purple-600 mb-2">
        Component: {name}
      </div>
    </div>
  );
}

function SlotWrapper({ node, allNodes, depth }: {
  node: any;
  allNodes: Record<string, NodeModel>;
  depth: number;
}) {
  const children = (node.children || []).map((childId: string) => {
    const child = allNodes[childId];
    if (!child) return null;
    return renderNode(child, allNodes, depth + 1);
  });
  
  return <>{children}</>;
}
