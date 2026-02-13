import { useState } from 'react';
import type { Formula } from '@layr/types';

interface FormulaFieldProps {
  label: string;
  value: Formula | undefined;
  onChange?: (value: Formula) => void;
}

export function FormulaField({ label, value, onChange }: FormulaFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const displayValue = value?.type === 'value' 
    ? String(value.value ?? '')
    : value?.type === 'path'
    ? value.path.join('.')
    : value?.type === 'function'
    ? `${value.name}()`
    : '';
  
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
          onChange={(e) => {
            // For now, create a value formula
            onChange?.({ type: 'value', value: e.target.value });
          }}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
        />
        
        {/* Formula indicator */}
        {value?.type !== 'value' && value?.type !== undefined && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600">
            f
          </div>
        )}
      </div>
      
      {/* Preview */}
      {isEditing && (
        <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
          <div className="text-gray-500 mb-1">Preview:</div>
          <div className="font-mono">{displayValue}</div>
        </div>
      )}
    </div>
  );
}
