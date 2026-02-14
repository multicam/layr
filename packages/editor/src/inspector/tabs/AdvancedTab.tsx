import type { NodeModel, Formula } from '@layr/types';
import { useProjectStore } from '../../stores';
import { FormulaField } from '../fields/FormulaField';

interface AdvancedTabProps {
  node: NodeModel;
  componentId: string;
  nodeId: string;
}

export function AdvancedTab({ node, componentId, nodeId }: AdvancedTabProps) {
  const updateNode = useProjectStore(s => s.updateNode);

  const updateCondition = (formula: Formula) => {
    updateNode(componentId, nodeId, { condition: formula } as Partial<NodeModel>);
  };

  const updateRepeat = (formula: Formula) => {
    updateNode(componentId, nodeId, { repeat: formula } as Partial<NodeModel>);
  };

  const updateRepeatKey = (formula: Formula) => {
    updateNode(componentId, nodeId, { repeatKey: formula } as Partial<NodeModel>);
  };

  const updateSlot = (formula: Formula) => {
    // Slot is a string, not a formula - extract value
    const slotValue = formula?.type === 'value' ? String(formula.value ?? '') : undefined;
    updateNode(componentId, nodeId, { slot: slotValue || undefined } as Partial<NodeModel>);
  };

  // Convert slot string to formula for editing
  const slotFormula: Formula | undefined = node.slot 
    ? { type: 'value', value: node.slot } 
    : undefined;

  return (
    <div className="space-y-6">
      {/* Visibility Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Visibility</h3>
        <div className="space-y-3">
          <FormulaField
            label="Condition"
            value={node.condition}
            onChange={updateCondition}
          />
        </div>
      </div>

      {/* Repeat Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Repeat (List Rendering)</h3>
        <div className="space-y-3">
          <FormulaField
            label="Repeat for each"
            value={node.repeat}
            onChange={updateRepeat}
          />
          <FormulaField
            label="Item key"
            value={node.repeatKey}
            onChange={updateRepeatKey}
          />
        </div>
      </div>

      {/* Slot Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Slot Assignment</h3>
        <div className="space-y-3">
          <FormulaField
            label="Slot name"
            value={slotFormula}
            onChange={updateSlot}
          />
        </div>
      </div>

      {/* Custom Properties Section */}
      {'customProperties' in node && node.customProperties && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Custom Properties</h3>
          <div className="space-y-2">
            {Object.entries(node.customProperties).map(([name, prop]) => (
              <div key={name} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="text-sm font-mono text-gray-600">--{name}</span>
                <span className="text-xs text-gray-400">
                  {prop.formula?.type === 'value' ? String(prop.formula.value ?? '') : 'formula'}
                  {prop.unit || ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Node ID Display */}
      <div className="pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-400">
          Node ID: <code className="font-mono">{nodeId}</code>
        </div>
      </div>
    </div>
  );
}
