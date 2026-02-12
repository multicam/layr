# Proposed Fixes Implementation Guide

This directory contains TypeScript implementations that address the critical gaps identified in the Layr spec review. Each module is designed to be integrated into the existing Layr codebase with minimal changes.

## Quick Start

```typescript
// Import all proposed fixes
import {
  // Limits
  LAYR_LIMITS,
  checkLimit,
  LimitExceededError,
  
  // Cycle Detection
  FormulaCycleDetector,
  PackageCycleDetector,
  WorkflowCycleDetector,
  
  // Error Attribution
  LayrError,
  FormulaError,
  ExecutionContext,
  ErrorCollector,
  
  // Metrics
  getMetrics,
  timeAsync,
  
  // Retry
  fetchWithRetry,
  
  // Hydration
  checkHydration,
} from '@layr/proposed-fixes';
```

## Module Overview

### 1. Core Limits (`core/limits.ts`)

**Problem:** No safety limits on component depth, formula evaluation, or request sizes.

**Solution:** Centralized limits configuration with runtime override capability.

```typescript
import { LAYR_LIMITS, checkLimit, LimitExceededError } from '@layr/proposed-fixes/core';

// Check a limit (throws if exceeded)
checkLimit('component', 'maxDepth', 51); // throws LimitExceededError

// Check a limit (returns boolean)
if (isWithinLimit('formula', 'maxDepth', currentDepth)) {
  // safe to continue
}

// Override limits at runtime
setLimits({ component: { maxDepth: 100 } });
```

**Integration Points:**
- `createComponent()` - check depth before rendering children
- `applyFormula()` - check formula depth before evaluation
- `handleAction()` - check action depth before execution
- API request construction - check body size

---

### 2. Cycle Detection (`core/cycle-detection.ts`)

**Problem:** Circular references in formulas, packages, and workflows cause stack overflows.

**Solution:** Context-aware cycle detectors with configurable limits.

```typescript
import { 
  FormulaCycleDetector, 
  PackageCycleDetector,
  WorkflowCycleDetector 
} from '@layr/proposed-fixes/core';

// Formula evaluation
FormulaCycleDetector.withDetection('myFormula', () => {
  return applyFormula(formula, context);
});

// Package dependency validation
PackageCycleDetector.validate(packageGraph);
const sortedPackages = PackageCycleDetector.topologicalSort(packageGraph);

// Workflow execution
const workflowDetector = new WorkflowCycleDetector();
workflowDetector.enter('myWorkflow');
try {
  executeWorkflow(workflow);
} finally {
  workflowDetector.exit('myWorkflow');
}
```

**Integration Points:**
- `applyFormula()` - wrap evaluation in cycle detection
- Build pipeline - validate package dependencies
- `handleAction()` - track workflow recursion

---

### 3. Error Attribution (`core/errors.ts`)

**Problem:** Errors lack context for debugging; no formula/action traces.

**Solution:** Rich error types with execution path tracking.

```typescript
import { 
  LayrError, 
  FormulaError, 
  ExecutionContext,
  ErrorCollector 
} from '@layr/proposed-fixes/core';

// Create execution context
const ctx = new ExecutionContext();
ctx.push({ type: 'component', name: 'MyComponent' });
ctx.push({ type: 'formula', name: 'calculateTotal' });

// Create attributed error
throw ctx.createError('formula_evaluation', 'Division by zero');

// Use error collector
const collector = new ErrorCollector();
try {
  // ... risky operation
} catch (e) {
  collector.add(attributeError(e, ctx));
}
```

**Integration Points:**
- All try/catch blocks - use `attributeError()` to add context
- `toddle.errors` array - replace with `ErrorCollector`
- Error logging - include path information

---

### 4. Performance Metrics (`core/metrics.ts`)

**Problem:** No visibility into render time, formula evaluation, or API latency.

**Solution:** Comprehensive metrics collection with minimal overhead.

```typescript
import { getMetrics, timeAsync, timeSync, exposeMetricsToWindow } from '@layr/proposed-fixes/core';

// Time an async operation
const result = await timeAsync('fetchUsers', 'api', async () => {
  return fetch('/api/users');
}, { successCount: 1 });

// Time a sync operation
const rendered = timeSync('renderComponent', 'render', () => {
  return renderComponent(component);
});

// Expose to window for debugging
exposeMetricsToWindow();

// In browser console:
// window.__layrMetrics.get()
// window.__layrMetrics.getTop('api')
```

**Integration Points:**
- `renderComponent()` - wrap with timing
- `applyFormula()` - track evaluation time
- API fetch - track request latency
- Signal updates - track update count

---

### 5. Retry Mechanism (`api/retry.ts`)

**Problem:** Failed API requests have no automatic retry.

**Solution:** Configurable retry with exponential backoff.

```typescript
import { fetchWithRetry, withRetry, RetryManager } from '@layr/proposed-fixes/api';

// Simple retry
const response = await fetchWithRetry('/api/users', {
  method: 'GET',
}, {
  maxAttempts: 3,
  backoff: 'exponential',
  initialDelay: 1000,
});

// Wrap any async function
const data = await withRetry(
  () => fetchDataFromAPI(),
  { maxAttempts: 3, retryOn: (err) => isNetworkError(err) }
);

// Track retries per API
const retryManager = new RetryManager();
retryManager.startRetry('fetchUsers');
// ... on failure ...
retryManager.recordFailure('fetchUsers', error);
```

**Integration Points:**
- `apiSuccess()` - add retry state tracking
- API configuration - add `retry` config section
- Error handling - use `retryOn` predicate

---

### 6. Hydration Mismatch Detection (`runtime/hydration.ts`)

**Problem:** No detection of SSR/CSR content differences.

**Solution:** DOM tree comparison with detailed mismatch reporting.

```typescript
import { checkHydration, detectHydrationMismatches } from '@layr/proposed-fixes/runtime';

// Check hydration during takeover
checkHydration(
  document.getElementById('App'),
  renderedCSRContent,
  {
    strict: false,  // throw on mismatch
    warn: true,     // console.warn on mismatch
    onMismatch: (mismatch) => {
      sendToAnalytics(mismatch);
    },
  }
);

// Or just detect without checking
const mismatches = detectHydrationMismatches(ssrRoot, csrRoot);
```

**Integration Points:**
- `createRoot()` - call after initial render
- Development mode - enable strict checking
- Production mode - log mismatches without throwing

---

## Integration Checklist

### Phase 1: Core Safety (Priority: Critical)
- [ ] Add limits check to `createComponent()`
- [ ] Add limits check to `applyFormula()`
- [ ] Add limits check to `handleAction()`
- [ ] Wrap formula evaluation in `FormulaCycleDetector`
- [ ] Add package cycle validation to build

### Phase 2: Error Handling (Priority: High)
- [ ] Replace `toddle.errors` with `ErrorCollector`
- [ ] Wrap all try/catch with `attributeError()`
- [ ] Add execution context to formula/action evaluation
- [ ] Update error logging to include path

### Phase 3: Observability (Priority: Medium)
- [ ] Add timing to `renderComponent()`
- [ ] Add timing to `applyFormula()`
- [ ] Add timing to API fetch
- [ ] Expose metrics in dev mode

### Phase 4: Resilience (Priority: Medium)
- [ ] Add retry wrapper to API fetch
- [ ] Add retry config to API definition
- [ ] Add hydration mismatch detection
- [ ] Add workflow cycle detection

---

## Configuration

### Limits Configuration

```typescript
// In app initialization
import { setLimits } from '@layr/core/limits';

setLimits({
  component: { maxDepth: 50, maxNodes: 5000 },
  formula: { maxDepth: 256, maxEvaluationTime: 1000 },
  action: { maxDepth: 100 },
});
```

### Retry Configuration

```typescript
// In API definition
const api = {
  name: 'fetchUsers',
  retry: {
    enabled: true,
    maxAttempts: 3,
    backoff: 'exponential',
    initialDelay: 1000,
    maxDelay: 10000,
  },
};
```

### Metrics Configuration

```typescript
// In dev mode initialization
import { exposeMetricsToWindow, getMetrics } from '@layr/core/metrics';

if (process.env.NODE_ENV === 'development') {
  exposeMetricsToWindow();
}

// Disable in production
if (process.env.NODE_ENV === 'production') {
  getMetrics().setEnabled(false);
}
```

---

## Testing

Each module includes unit tests that should be added to the Layr test suite:

```bash
# Test limits
bun test core/limits.test.ts

# Test cycle detection
bun test core/cycle-detection.test.ts

# Test error attribution
bun test core/errors.test.ts

# Test retry
bun test api/retry.test.ts

# Test hydration
bun test runtime/hydration.test.ts

# Test metrics
bun test core/metrics.test.ts
```

---

## Performance Impact

| Module | Overhead | Notes |
|--------|----------|-------|
| Limits | Negligible | Single comparison check |
| Cycle Detection | Low | Set lookup O(1) |
| Error Attribution | Low | Only on error path |
| Metrics | Low | Disabled in production |
| Retry | Zero | Only active on failure |
| Hydration Check | Medium | One-time on page load |

Recommended: Enable all modules in development, disable metrics in production.
