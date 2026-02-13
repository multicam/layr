import type { NodeModel } from '@layr/types';
import { useProjectStore } from '../../stores';
import { TextField } from '../fields/TextField';
import { FormulaField } from '../fields/FormulaField';

interface PropertiesTabProps {
  node: NodeModel;
  componentId: string;
  nodeId: string;
}

export function PropertiesTab({ node, componentId, nodeId }: PropertiesTabProps) {
  const updateNode = useProjectStore(s => s.updateNode);
  const nodeType = node.type;
  const attrs = 'attrs' in node ? (node.attrs ?? {}) : {};

  const setAttr = (key: string, value: string) => {
    const currentAttrs = 'attrs' in node ? { ...node.attrs } : {};

    if (value === '') {
      delete currentAttrs[key];
    } else {
      currentAttrs[key] = { type: 'value' as const, value };
    }

    updateNode(componentId, nodeId, { attrs: currentAttrs } as Partial<NodeModel>);
  };

  const setTag = (tag: string) => {
    if (tag) {
      updateNode(componentId, nodeId, { tag } as Partial<NodeModel>);
    }
  };

  const setTextValue = (value: string) => {
    updateNode(componentId, nodeId, {
      value: { type: 'value' as const, value },
    } as Partial<NodeModel>);
  };

  return (
    <div className="space-y-4">
      {/* Node info */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Node</h3>
        <div className="text-sm text-gray-500 mb-1">
          ID: {node.id || 'unknown'}
        </div>
        {nodeType === 'element' && (
          <TextField
            label="Tag"
            value={(node as any).tag || 'div'}
            onChange={setTag}
          />
        )}
        {nodeType === 'component' && (
          <div className="text-sm text-gray-500">
            Component: {(node as any).name || 'Unknown'}
          </div>
        )}
      </div>

      {/* Attributes */}
      {Object.keys(attrs).length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Attributes</h3>
          <div className="space-y-2">
            {Object.entries(attrs).map(([key, value]) => (
              <TextField
                key={key}
                label={key}
                value={(value as any)?.type === 'value' ? String((value as any).value ?? '') : ''}
                onChange={(v) => setAttr(key, v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Text content for text nodes */}
      {nodeType === 'text' && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Content</h3>
          <TextField
            label="Text"
            value={(node as any).value?.type === 'value' ? String((node as any).value.value ?? '') : ''}
            onChange={setTextValue}
          />
        </div>
      )}
    </div>
  );
}
