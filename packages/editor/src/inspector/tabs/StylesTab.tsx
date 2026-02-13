import type { NodeModel } from '@layr/types';
import { useProjectStore } from '../../stores';
import { TextField } from '../fields/TextField';

interface StylesTabProps {
  node: NodeModel;
  componentId: string;
  nodeId: string;
}

const STYLE_FIELDS = [
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
  { key: 'padding', label: 'Padding' },
  { key: 'margin', label: 'Margin' },
  { key: 'backgroundColor', label: 'Background' },
  { key: 'color', label: 'Color' },
  { key: 'fontSize', label: 'Font Size' },
  { key: 'borderRadius', label: 'Border Radius' },
] as const;

export function StylesTab({ node, componentId, nodeId }: StylesTabProps) {
  const updateNode = useProjectStore(s => s.updateNode);
  const styles = 'style' in node ? (node.style ?? {}) : {};

  const setStyle = (property: string, value: string) => {
    const currentStyle = 'style' in node ? (node.style ?? {}) : {};
    const newStyle = { ...currentStyle };

    if (value === '') {
      delete newStyle[property];
    } else {
      newStyle[property] = { type: 'value' as const, value };
    }

    updateNode(componentId, nodeId, { style: newStyle } as Partial<NodeModel>);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Styles</h3>

      <div className="space-y-2">
        {STYLE_FIELDS.map(({ key, label }) => (
          <TextField
            key={key}
            label={label}
            value={styles[key]?.type === 'value' ? String(styles[key].value ?? '') : ''}
            onChange={(v) => setStyle(key, v)}
            placeholder={key}
          />
        ))}
      </div>
    </div>
  );
}
