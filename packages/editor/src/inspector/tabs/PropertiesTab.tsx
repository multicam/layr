import type { NodeModel } from '@layr/types';
import { TextField } from '../fields/TextField';
import { FormulaField } from '../fields/FormulaField';

interface PropertiesTabProps {
  node: NodeModel;
}

export function PropertiesTab({ node }: PropertiesTabProps) {
  const nodeType = node.type;
  const attrs = 'attrs' in node ? node.attrs : {};
  
  return (
    <div className="space-y-4">
      {/* Node info */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Node</h3>
        <div className="text-sm text-gray-500">
          Type: {nodeType}
          {nodeType === 'element' && ` <${(node as any).tag || 'div'}>`}
          {nodeType === 'component' && ` ${(node as any).name || 'Unknown'}`}
        </div>
        <div className="text-sm text-gray-500">
          ID: {node.id || 'unknown'}
        </div>
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
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Text content for text nodes */}
      {nodeType === 'text' && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Content</h3>
          <FormulaField
            label="Text"
            value={(node as any).value}
          />
        </div>
      )}
    </div>
  );
}
