/**
 * Hydration Mismatch Detection
 * 
 * Detects and reports differences between server-rendered HTML
 * and client-side rendered content.
 * 
 * @module @layr/runtime/hydration
 */

import { HydrationError } from '../core/errors';

/**
 * Hydration mismatch types
 */
export type MismatchType = 'text' | 'attribute' | 'element' | 'structure';

/**
 * Hydration mismatch detail
 */
export interface HydrationMismatch {
  /** Type of mismatch */
  type: MismatchType;
  /** Path to the mismatched node */
  path: string;
  /** Expected (server) value */
  expected: string;
  /** Actual (client) value */
  actual: string;
  /** Node ID if available */
  nodeId?: string;
  /** Component name if available */
  componentName?: string;
}

/**
 * Hydration checker configuration
 */
export interface HydrationConfig {
  /** Enable strict mode (throw on any mismatch) */
  strict: boolean;
  /** Log warnings for mismatches */
  warn: boolean;
  /** Maximum depth to check */
  maxDepth: number;
  /** Attributes to ignore during comparison */
  ignoreAttributes: Set<string>;
  /** Callback for mismatch detection */
  onMismatch?: (mismatch: HydrationMismatch) => void;
}

/**
 * Default hydration configuration
 */
export const DEFAULT_HYDRATION_CONFIG: HydrationConfig = {
  strict: false,
  warn: true,
  maxDepth: 100,
  ignoreAttributes: new Set([
    'data-hydrated',
    'data-reactroot',
    'data-reactid',
  ]),
};

/**
 * Check if hydration is in progress
 */
let hydrationInProgress = false;

/**
 * Mark hydration as started
 */
export function startHydration(): void {
  hydrationInProgress = true;
}

/**
 * Mark hydration as complete
 */
export function endHydration(): void {
  hydrationInProgress = false;
}

/**
 * Check if currently hydrating
 */
export function isHydrating(): boolean {
  return hydrationInProgress;
}

/**
 * Compare text content
 */
function compareTextContent(
  ssrNode: Text,
  csrNode: Text,
  path: string
): HydrationMismatch | null {
  const ssrText = ssrNode.textContent?.trim() ?? '';
  const csrText = csrNode.textContent?.trim() ?? '';

  if (ssrText !== csrText) {
    return {
      type: 'text',
      path,
      expected: ssrText.slice(0, 100),
      actual: csrText.slice(0, 100),
    };
  }

  return null;
}

/**
 * Compare element attributes
 */
function compareAttributes(
  ssrElement: Element,
  csrElement: Element,
  path: string,
  ignoreAttributes: Set<string>
): HydrationMismatch[] {
  const mismatches: HydrationMismatch[] = [];

  const ssrAttrs = new Map<string, string>();
  const csrAttrs = new Map<string, string>();

  // Collect SSR attributes
  for (let i = 0; i < ssrElement.attributes.length; i++) {
    const attr = ssrElement.attributes[i];
    if (!ignoreAttributes.has(attr.name)) {
      ssrAttrs.set(attr.name, attr.value);
    }
  }

  // Collect CSR attributes
  for (let i = 0; i < csrElement.attributes.length; i++) {
    const attr = csrElement.attributes[i];
    if (!ignoreAttributes.has(attr.name)) {
      csrAttrs.set(attr.name, attr.value);
    }
  }

  // Check for mismatches
  for (const [name, ssrValue] of ssrAttrs) {
    const csrValue = csrAttrs.get(name);
    if (csrValue === undefined) {
      mismatches.push({
        type: 'attribute',
        path: `${path}@${name}`,
        expected: ssrValue,
        actual: '<missing>',
        nodeId: ssrElement.getAttribute('data-node-id') ?? undefined,
      });
    } else if (ssrValue !== csrValue) {
      mismatches.push({
        type: 'attribute',
        path: `${path}@${name}`,
        expected: ssrValue,
        actual: csrValue,
        nodeId: ssrElement.getAttribute('data-node-id') ?? undefined,
      });
    }
  }

  // Check for extra CSR attributes
  for (const [name, csrValue] of csrAttrs) {
    if (!ssrAttrs.has(name)) {
      mismatches.push({
        type: 'attribute',
        path: `${path}@${name}`,
        expected: '<missing>',
        actual: csrValue,
        nodeId: csrElement.getAttribute('data-node-id') ?? undefined,
      });
    }
  }

  return mismatches;
}

/**
 * Compare element structure
 */
function compareStructure(
  ssrElement: Element,
  csrElement: Element,
  path: string
): HydrationMismatch | null {
  // Check tag name
  if (ssrElement.tagName !== csrElement.tagName) {
    return {
      type: 'element',
      path,
      expected: ssrElement.tagName,
      actual: csrElement.tagName,
      nodeId: ssrElement.getAttribute('data-node-id') ?? undefined,
    };
  }

  // Check child count (basic structure check)
  if (ssrElement.children.length !== csrElement.children.length) {
    return {
      type: 'structure',
      path,
      expected: `${ssrElement.children.length} children`,
      actual: `${csrElement.children.length} children`,
      nodeId: ssrElement.getAttribute('data-node-id') ?? undefined,
    };
  }

  return null;
}

/**
 * Recursively compare DOM trees
 */
function compareNodes(
  ssrNode: Node,
  csrNode: Node,
  path: string,
  config: HydrationConfig,
  depth: number,
  mismatches: HydrationMismatch[]
): void {
  if (depth > config.maxDepth) return;

  // Compare node types
  if (ssrNode.nodeType !== csrNode.nodeType) {
    mismatches.push({
      type: 'element',
      path,
      expected: `nodeType ${ssrNode.nodeType}`,
      actual: `nodeType ${csrNode.nodeType}`,
    });
    return;
  }

  // Text nodes
  if (ssrNode.nodeType === Node.TEXT_NODE) {
    const mismatch = compareTextContent(
      ssrNode as Text,
      csrNode as Text,
      path
    );
    if (mismatch) {
      mismatches.push(mismatch);
    }
    return;
  }

  // Element nodes
  if (ssrNode.nodeType === Node.ELEMENT_NODE) {
    const ssrElement = ssrNode as Element;
    const csrElement = csrNode as Element;

    // Check structure
    const structureMismatch = compareStructure(ssrElement, csrElement, path);
    if (structureMismatch) {
      mismatches.push(structureMismatch);
      return; // Don't recurse if structure differs
    }

    // Check attributes
    const attrMismatches = compareAttributes(
      ssrElement,
      csrElement,
      path,
      config.ignoreAttributes
    );
    mismatches.push(...attrMismatches);

    // Recurse into children
    const ssrChildren = Array.from(ssrElement.childNodes);
    const csrChildren = Array.from(csrElement.childNodes);

    const maxLen = Math.max(ssrChildren.length, csrChildren.length);
    for (let i = 0; i < maxLen; i++) {
      const ssrChild = ssrChildren[i];
      const csrChild = csrChildren[i];

      if (!ssrChild || !csrChild) {
        mismatches.push({
          type: 'structure',
          path: `${path}[${i}]`,
          expected: ssrChild ? 'node' : '<missing>',
          actual: csrChild ? 'node' : '<missing>',
        });
        continue;
      }

      compareNodes(
        ssrChild,
        csrChild,
        `${path}[${i}]`,
        config,
        depth + 1,
        mismatches
      );
    }
  }
}

/**
 * Detect hydration mismatches between SSR and CSR content
 */
export function detectHydrationMismatches(
  ssrRoot: Element | Document,
  csrRoot: Element | Document,
  config?: Partial<HydrationConfig>
): HydrationMismatch[] {
  const fullConfig: HydrationConfig = {
    ...DEFAULT_HYDRATION_CONFIG,
    ...config,
  };

  const mismatches: HydrationMismatch[] = [];
  const ssrElement = ssrRoot instanceof Document ? ssrRoot.documentElement : ssrRoot;
  const csrElement = csrRoot instanceof Document ? csrRoot.documentElement : csrRoot;

  compareNodes(ssrElement, csrElement, '', fullConfig, 0, mismatches);

  return mismatches;
}

/**
 * Check hydration and handle mismatches
 */
export function checkHydration(
  ssrContainer: Element,
  csrContent: Element,
  config?: Partial<HydrationConfig>
): void {
  const fullConfig: HydrationConfig = {
    ...DEFAULT_HYDRATION_CONFIG,
    ...config,
  };

  startHydration();

  try {
    const mismatches = detectHydrationMismatches(
      ssrContainer,
      csrContent,
      fullConfig
    );

    for (const mismatch of mismatches) {
      // Call callback
      if (fullConfig.onMismatch) {
        fullConfig.onMismatch(mismatch);
      }

      // Warn
      if (fullConfig.warn) {
        console.warn(
          `[Hydration] ${mismatch.type} mismatch at ${mismatch.path}: ` +
          `expected "${mismatch.expected}", got "${mismatch.actual}"` +
          (mismatch.nodeId ? ` (node: ${mismatch.nodeId})` : '')
        );
      }

      // Throw in strict mode
      if (fullConfig.strict) {
        throw new HydrationError(
          mismatch.type as 'html' | 'data' | 'state',
          mismatch.expected,
          mismatch.actual,
          { componentContext: mismatch.componentName }
        );
      }
    }
  } finally {
    endHydration();
  }
}

/**
 * Data hydration mismatch check
 */
export function checkDataHydration(
  ssrData: Record<string, unknown>,
  csrData: Record<string, unknown>,
  path: string = ''
): HydrationMismatch[] {
  const mismatches: HydrationMismatch[] = [];

  const ssrKeys = new Set(Object.keys(ssrData));
  const csrKeys = new Set(Object.keys(csrData));

  // Check for missing/extra keys
  for (const key of ssrKeys) {
    if (!csrKeys.has(key)) {
      mismatches.push({
        type: 'structure',
        path: path ? `${path}.${key}` : key,
        expected: 'value',
        actual: '<missing>',
      });
      continue;
    }

    const ssrValue = ssrData[key];
    const csrValue = csrData[key];
    const keyPath = path ? `${path}.${key}` : key;

    // Deep compare
    if (typeof ssrValue === 'object' && ssrValue !== null &&
        typeof csrValue === 'object' && csrValue !== null) {
      mismatches.push(...checkDataHydration(
        ssrValue as Record<string, unknown>,
        csrValue as Record<string, unknown>,
        keyPath
      ));
    } else if (ssrValue !== csrValue) {
      mismatches.push({
        type: 'text',
        path: keyPath,
        expected: JSON.stringify(ssrValue),
        actual: JSON.stringify(csrValue),
      });
    }
  }

  // Check for extra CSR keys
  for (const key of csrKeys) {
    if (!ssrKeys.has(key)) {
      mismatches.push({
        type: 'structure',
        path: path ? `${path}.${key}` : key,
        expected: '<missing>',
        actual: 'value',
      });
    }
  }

  return mismatches;
}
