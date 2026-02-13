import type { Formula } from '@layr/types';
import { applyFormula } from '@layr/core';

interface FormulaPreviewProps {
  formula: Formula | undefined;
  data?: any;
}

export function FormulaPreview({ formula, data }: FormulaPreviewProps) {
  if (!formula) {
    return (
      <div className="text-xs text-gray-400 italic">
        No formula
      </div>
    );
  }
  
  try {
    const ctx = {
      data: data || { Variables: {}, Attributes: {}, Apis: {} },
      toddle: {
        getCustomFormula: () => undefined,
        errors: [],
      },
    };
    
    const result = applyFormula(formula, ctx);
    const type = typeof result;
    
    return (
      <div className="text-xs space-y-1">
        <div className="text-gray-500">
          Result ({type}):
        </div>
        <div className="font-mono bg-gray-50 p-1 rounded overflow-auto max-h-20">
          {JSON.stringify(result)}
        </div>
      </div>
    );
  } catch (e: any) {
    return (
      <div className="text-xs text-red-500">
        Error: {e.message}
      </div>
    );
  }
}
