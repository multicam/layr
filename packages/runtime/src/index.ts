// Core rendering
export { renderComponent } from './render/component';
export { createNode } from './render/node';
export { 
  evaluateCondition, 
  evaluateRepeat, 
  shouldRender, 
  createRepeatedNodes 
} from './render/condition';

// DOM utilities
export { setAttribute, setClass, setClasses, setCustomProperty, setStyles } from './dom/attributes';

// Events
export { 
  attachEvent, 
  handleEvent, 
  extractEventData, 
  EventConfigs,
  delegateEvent,
} from './events/index';
export type { EventHandler, EventContext } from './events/index';

// Hydration
export { 
  hydratePage, 
  readSSRData, 
  autoHydrate,
} from './hydration/index';
export type { HydrationResult, HydrationContext } from './hydration/index';

// API Client
export { createApiClient, createApiSignal } from './api/client';
export type { ApiClient, ApiClientConfig, ApiRequestConfig } from './api/client';

// Navigation
export {
  parseQuery,
  parseUrl,
  getLocationUrl,
  navigate,
  setUrlParameter,
  setUrlParameters,
  storeScrollState,
  restoreScrollState,
  tryStartViewTransition,
  validateUrl,
  isLocalhostUrl,
  isLocalhostHostname,
} from './navigation/index';
export type { Location, LocationSignal } from './navigation/index';

// Responsive Styling
export {
  BREAKPOINTS,
  renderMediaQuery,
  renderBreakpointQuery,
  variantSelector,
  CustomPropertyStyleSheet,
  SYNTAX_FALLBACKS,
  renderPropertyDefinition,
  styleToCss,
  prefersReducedMotion,
  getCurrentBreakpoint,
} from './styles/index';
export type { 
  MediaQuery, 
  BreakpointName, 
  StyleVariant, 
  CustomProperty,
  CssSyntaxNode,
  CssSyntax,
  CssCustomSyntax,
} from './styles/index';
