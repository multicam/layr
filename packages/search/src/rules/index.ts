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
export { noReferenceComponentRule } from './components/noReferenceComponentRule';

// Contexts
export { unknownContextProviderRule } from './contexts/unknownContextProviderRule';
export { unknownContextProviderFormulaRule } from './contexts/unknownContextProviderFormulaRule';
export { unknownContextProviderWorkflowRule } from './contexts/unknownContextProviderWorkflowRule';
export { noContextConsumersRule } from './contexts/noContextConsumersRule';
export { unknownContextFormulaRule } from './contexts/unknownContextFormulaRule';
export { unknownContextWorkflowRule } from './contexts/unknownContextWorkflowRule';

// DOM
export { nonEmptyVoidElementRule } from './dom/nonEmptyVoidElementRule';
export { missingAltAttributeRule } from './dom/missingAltAttributeRule';

// Events
export { unknownEventRule } from './events/unknownEventRule';
export { duplicateEventTriggerRule } from './events/duplicateEventTriggerRule';
export { noReferenceEventRule } from './events/noReferenceEventRule';

// Formulas
export { unknownFormulaRule } from './formulas/unknownFormulaRule';
export { duplicateFormulaArgumentNameRule } from './formulas/duplicateFormulaArgumentNameRule';
export { noReferenceComponentFormulaRule } from './formulas/noReferenceComponentFormulaRule';
export { noReferenceProjectFormulaRule } from './formulas/noReferenceProjectFormulaRule';

// Logic
export { noStaticNodeConditionRule, noUnnecessaryConditionTruthyRule, noUnnecessaryConditionFalsyRule } from './logic/staticConditionRule';

// Routing
export { duplicateRouteRule } from './routing/duplicateRouteRule';
export { duplicateUrlParameterRule } from './routing/duplicateUrlParameterRule';
export { unknownUrlParameterRule } from './routing/unknownUrlParameterRule';
export { unknownSetUrlParameterRule } from './routing/unknownSetUrlParameterRule';

// Variables
export { unknownVariableRule } from './variables/unknownVariableRule';
export { noReferenceVariableRule } from './variables/noReferenceVariableRule';
export { unknownVariableSetterRule } from './variables/unknownVariableSetterRule';

// Workflows
export { unknownTriggerWorkflowRule } from './workflows/unknownTriggerWorkflowRule';
export { unknownWorkflowParameterRule } from './workflows/unknownWorkflowParameterRule';
export { duplicateWorkflowParameterRule } from './workflows/duplicateWorkflowParameterRule';
export { noPostNavigateAction } from './workflows/noPostNavigateAction';
