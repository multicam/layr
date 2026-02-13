import { useState } from 'react';
import type { Formula } from '@layr/types';
import { FormulaEditor } from '../../formula-editor';
import { FormulaPreview } from '../../formula-editor';

interface FormulaFieldProps {
  label: string;
  value: Formula | undefined;
  onChange?: (value: Formula) => void;
}

export function FormulaField({ label, value, onChange }: FormulaFieldProps) {
  const [showPreview, setShowPreview] = useState(false);
  
  const isComplex = value?.type !== 'value';
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="block text-xs text-gray-500">{label}</label>
        {isComplex && (
          <span className="text-xs text-blue-600 font-medium">f</span>
        )}
      </div>
      
      <FormulaEditor
        value={value}
        onChange={onChange}
        minHeight={40}
      />
      
      {/* Preview toggle */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        {showPreview ? 'Hide preview' : 'Show preview'}
      </button>
      
      {showPreview && (
        <FormulaPreview formula={value} />
      )}
    </div>
  );
}
