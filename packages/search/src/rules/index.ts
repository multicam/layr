/**
 * Rule exports
 */

// Actions
export { unknownActionRule } from './actions/unknownActionRule';

// APIs
export { unknownApiRule } from './apis/unknownApiRule';
export { unknownApiInputRule } from './apis/unknownApiInputRule';

// Attributes
export { noReferenceAttributeRule } from './attributes/noReferenceAttributeRule';
export { unknownAttributeRule } from './attributes/unknownAttributeRule';

// Components
export { unknownComponentRule } from './components/unknownComponentRule';

// DOM
export { nonEmptyVoidElementRule } from './dom/nonEmptyVoidElementRule';
export { missingAltAttributeRule } from './dom/missingAltAttributeRule';

// Events
export { unknownEventRule } from './events/unknownEventRule';

// Formulas
export { unknownFormulaRule } from './formulas/unknownFormulaRule';

// Logic
export { noStaticNodeConditionRule, noUnnecessaryConditionTruthyRule, noUnnecessaryConditionFalsyRule } from './logic/staticConditionRule';

// Routing
export { duplicateRouteRule } from './routing/duplicateRouteRule';
export { duplicateUrlParameterRule } from './routing/duplicateUrlParameterRule';

// Variables
export { unknownVariableRule } from './variables/unknownVariableRule';
export { noReferenceVariableRule } from './variables/noReferenceVariableRule';
export { unknownVariableSetterRule } from './variables/unknownVariableSetterRule';

// Workflows
export { unknownTriggerWorkflowRule } from './workflows/unknownTriggerWorkflowRule';
export { unknownWorkflowParameterRule } from './workflows/unknownWorkflowParameterRule';
