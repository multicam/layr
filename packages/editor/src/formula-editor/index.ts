// Lightweight exports (pure logic, no React/Monaco)
export { tokenize, TokenType, LayrFormulaLanguage } from './tokenizer';
export type { Token } from './tokenizer';
export {
  resolveAutocompleteContext,
  getSuggestions,
  type AutocompleteContext,
  type AutocompleteSuggestion,
} from './contextResolver';

// Heavy exports (React/Monaco) — use direct imports for these
// to avoid pulling Monaco into tests and server bundles:
//   import { FormulaEditor } from './formula-editor/FormulaEditor';
//   import { FormulaPreview } from './formula-editor/FormulaPreview';
//   import { Autocomplete } from './formula-editor/Autocomplete';
