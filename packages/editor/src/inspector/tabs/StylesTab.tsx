import type { NodeModel } from '@layr/types';
import { TextField } from '../fields/TextField';

interface StylesTabProps {
  node: NodeModel;
}

export function StylesTab({ node }: StylesTabProps) {
  const styles = 'style' in node ? node.style : {};
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Styles</h3>
      
      {/* Common style fields */}
      <div className="space-y-2">
        <TextField label="Width" value={styles?.width || ''} />
        <TextField label="Height" value={styles?.height || ''} />
        <TextField label="Padding" value={styles?.padding || ''} />
        <TextField label="Margin" value={styles?.margin || ''} />
        <TextField label="Background" value={styles?.backgroundColor || ''} />
        <TextField label="Color" value={styles?.color || ''} />
        <TextField label="Font Size" value={styles?.fontSize || ''} />
        <TextField label="Border Radius" value={styles?.borderRadius || ''} />
      </div>
      
      {/* Style hint */}
      <div className="text-xs text-gray-400">
        Style editing coming soon
      </div>
    </div>
  );
}
