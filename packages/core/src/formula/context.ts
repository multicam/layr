/**
 * Formula Context
 * Based on specs/formula-system.md
 */

import type { ComponentData } from '@layr/types';

export interface FormulaContext {
  // Current component data
  data: ComponentData;
  
  // Current component definition
  component?: any; // Component type from @layr/types
  
  // Formula memoization cache
  formulaCache?: Record<string, { get: (key: string) => any; set: (key: string, value: any) => void }>;
  
  // DOM root
  root?: Document | ShadowRoot | null;
  
  // Current package namespace
  package?: string;
  
  // Toddle runtime
  toddle: {
    getFormula: (name: string) => Function | undefined;
    getCustomFormula: (name: string, packageName?: string) => any;
    errors: Error[];
  };
  
  // Environment
  env?: {
    isServer: boolean;
    branchName?: string;
    request?: {
      headers: Record<string, string>;
      cookies: Record<string, string>;
      url: string;
    };
    runtime?: 'page' | 'custom-element' | 'preview';
    logErrors?: boolean;
  };
}
