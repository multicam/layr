# Deep Review: Group C - Expression Evaluation

**Review Date:** 2026-02-12
**Priority:** High
**Complexity:** High
**Specs Reviewed:** Formula System, Formula Evaluation Engine, Template Substitution

---

## Executive Summary

The Expression Evaluation system is Layr's computation engine, handling all dynamic values through a formula AST with 10 operation types. The system demonstrates:

- **Well-designed AST** with discriminated unions enabling exhaustive pattern matching
- **Null-safe by default** philosophy - errors return null rather than throwing
- **Higher-order function support** with Args chaining for nested map/filter/reduce
- **Secure cookie templating** keeping HttpOnly values server-side only

The specs are comprehensive but reveal gaps in type safety, debugging, and performance optimization.

**Overall Assessment:** 8/10 - Solid design with gaps in type inference and debugging support.

---

## Gap Analysis

### 1. Formula System

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **No type inference** | High | Formulas are dynamically typed. No static analysis possible. Large formulas are hard to debug. |
| **Switch case limit** | Medium | Formula switch allows only 1 case (`.length(1)`). Arbitrary restriction not explained. |
| **Memoization coherence** | Medium | `memoize` flag on formulas but cache invalidation unclear. When does cache clear? |
| **Higher-order arg validation** | Medium | No validation that `isFunction: true` is only used with appropriate formulas. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| 97 built-in formulas | Low | Large surface area. No categorization by complexity/safety. |
| `variableArguments` flag | Low | Allows variable arg count but no runtime validation. |
| `display_name` metadata | Low | Used for UI but not validated against actual formula name. |

#### Recommendations

```markdown
1. Add optional type annotations:
   ```typescript
   interface TypedFormula<T = unknown> extends Formula {
     _returnType?: TypeDescriptor;
   }
   
   type TypeDescriptor = 
     | { type: 'primitive'; name: 'string' | 'number' | 'boolean' | 'null' }
     | { type: 'array'; element: TypeDescriptor }
     | { type: 'object'; properties: Record<string, TypeDescriptor> }
     | { type: 'union'; members: TypeDescriptor[] };
   ```

2. Remove or document switch case limit:
   ```markdown
   ## Switch Case Limit
   The formula switch operation currently supports exactly one case plus a default.
   This is a UI limitation, not a runtime restriction.
   ```

3. Document memoization behavior:
   ```markdown
   ## Formula Memoization
   - Cache key: Deep hash of ComponentData at evaluation time
   - Cache scope: Per-component instance
   - Invalidation: Component unmount (cache destroyed)
   - Warning: Memoized formulas referencing APIs may return stale data
   ```

4. Add higher-order argument validation:
   ```typescript
   const EXPECTED_HOF_FORMULAS = ['@toddle/map', '@toddle/filter', '@toddle/reduce', /* ... */];
   if (arg.isFunction && !EXPECTED_HOF_FORMULAS.includes(formula.name)) {
     console.warn(`isFunction used with non-higher-order formula: ${formula.name}`);
   }
   ```
```

---

### 2. Formula Evaluation Engine

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **Cycle detection** | High | Circular apply references (A→B→A) cause infinite recursion. No detection at eval time. |
| **Error attribution** | High | Errors pushed to `toddle.errors[]` but no stack trace or formula path. Hard to debug. |
| **Cache key computation** | Medium | Memoization hashes full ComponentData. Expensive for large state objects. |
| **Package context mutation** | Medium | `ctx.package` mutated during evaluation. Side effect not documented prominently. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| Non-formula passthrough | Low | `applyFormula` accepts raw values but behavior not documented in main spec. |
| Or/And boolean return | Low | Returns strict `true`/`false`, not the actual value. Could surprise users. |
| Legacy handler fallback | Low | Positional args fallback exists but transition path unclear. |

#### Recommendations

```markdown
1. Add cycle detection with configurable limit:
   ```typescript
   const MAX_FORMULA_DEPTH = 100;
   const evalStack = new Set<string>(); // component/formula/args hash
   
   function applyFormula(formula, ctx) {
     const key = `${ctx.component?.name}/${formula.name}/${hashArgs(ctx.data)}`;
     if (evalStack.has(key)) {
       throw new Error(`Circular formula reference: ${key}`);
     }
     if (evalStack.size > MAX_FORMULA_DEPTH) {
       throw new Error(`Maximum formula depth exceeded`);
     }
     evalStack.add(key);
     try {
       return evaluate(formula, ctx);
     } finally {
       evalStack.delete(key);
     }
   }
   ```

2. Add error attribution:
   ```typescript
   interface FormulaError extends Error {
     formulaPath: string[];      // ['function:map', 'function:filter', ...]
     formulaSource: string;      // JSON of the formula
     componentContext: string;   // Component name and key paths
   }
   ```

3. Optimize cache key with selective hashing:
   ```typescript
   // Only hash paths that the formula actually references
   function buildCacheKey(formula: Formula, data: ComponentData): string {
     const referencedPaths = extractPaths(formula);
     const relevantData = pick(data, referencedPaths);
     return hash(relevantData);
   }
   ```

4. Document package mutation:
   ```markdown
   ## Package Context Mutation
   During `function` operation evaluation, `ctx.package` is mutated to match 
   the resolved formula's package. This ensures nested formula calls resolve 
   within the same package context. The mutation is intentional but callers 
   should not rely on `ctx.package` after `applyFormula` returns.
   ```
```

---

### 3. Template Substitution

#### Critical Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| **No template escaping** | High | No way to include literal `{{ cookies.x }}` in output. Could conflict with some APIs. |
| **Single template type** | Medium | Only `cookies` supported. Future extensibility mentioned but not specified. |
| **Cookie value injection risk** | Medium | Cookie values injected without encoding. Could enable header injection if cookie contains `\r\n`. |
| **Form-urlencoded edge case** | Low | Values are URL-encoded after substitution but spec doesn't mention double-encoding risk. |

#### Minor Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| Missing cookie handling | Low | Replaced with empty string but not logged. Silent failure mode. |
| Regex performance | Low | Global regex on every substitution. Could be slow for large bodies. |
| Proxy opt-in confusion | Low | `useTemplatesInBody` formula plus header required. Easy to misconfigure. |

#### Recommendations

```markdown
1. Add template escaping:
   ```typescript
   // Escape sequences
   const ESCAPE_SEQUENCES = {
     '\\{\\{': '{{',  // \{{ → {{
   };
   
   // Or allow raw template literals
   interface TemplateConfig {
     escapeChar?: string;  // e.g., '\\' to escape
   }
   ```

2. Define extensibility for template types:
   ```typescript
   interface TemplateHandler {
     type: string;
     generate(name: string): string;
     substitute(template: string, context: TemplateContext): string;
   }
   
   // Future: env vars, secrets, etc.
   const templateHandlers: Record<string, TemplateHandler> = {
     cookies: CookieTemplateHandler,
     // env: EnvTemplateHandler,
     // secrets: SecretsTemplateHandler,
   };
   ```

3. Add cookie value sanitization:
   ```typescript
   function sanitizeCookieValue(value: string): string {
     // Remove any CRLF sequences to prevent header injection
     return value.replace(/[\r\n]/g, '');
   }
   ```

4. Add configuration validation:
   ```typescript
   if (api.server.proxy.useTemplatesInBody && !api.server.proxy.enabled) {
     console.warn('useTemplatesInBody requires proxy to be enabled');
   }
   ```
```

---

## Cross-Cutting Concerns

### 1. Type System Integration

**Issue:** Formulas are dynamically typed. No way to catch type mismatches at design time.

**Recommendation:** Add optional type inference layer:
```typescript
// Type inference for formulas (optional, design-time only)
function inferFormulaType(formula: Formula, context: TypeContext): TypeDescriptor {
  switch (formula.type) {
    case 'value':
      return { type: 'primitive', name: typeof formula.value as any };
    case 'path':
      return resolvePathType(formula.path, context);
    case 'function':
      return getFormulaReturnType(formula.name, formula.arguments);
    // ...
  }
}
```

### 2. Debugging Experience

**Issue:** Formula errors are hard to debug. Errors pushed to array without context.

**Recommendation:** Add formula debugger:
```typescript
interface FormulaDebugger {
  // Trace evaluation
  trace: (formula: Formula, result: unknown, duration: number) => void;
  
  // Breakpoints
  setBreakpoint(formulaId: string): void;
  
  // Step-through
  stepMode: boolean;
}

// Usage in dev mode
if (window.__layrDebug) {
  debugger.trace(formula, result, performance.now() - start);
}
```

### 3. Performance Profiling

**Issue:** No visibility into which formulas are slow or called frequently.

**Recommendation:** Add formula profiling:
```typescript
interface FormulaProfile {
  formula: Formula;
  callCount: number;
  totalDuration: number;
  maxDuration: number;
  cacheHitRate: number;
}

// Expose in dev mode
window.__layrProfile = {
  getTopFormulas(by: 'calls' | 'duration'): FormulaProfile[];
  reset(): void;
};
```

---

## Consistency Issues

| Issue | Location | Description |
|-------|----------|-------------|
| Error collection pattern | Formula Engine | Errors go to `toddle.errors[]` array. Should this be consistent across all systems? |
| Null propagation | Formula System vs others | Formula system returns `null` on errors. Other systems may throw. |
| Memoization naming | Formula System | `memoize` flag vs `formulaCache` in context. Different terms for same concept. |

---

## Documentation Quality

| Spec | Clarity | Completeness | Examples |
|------|---------|--------------|----------|
| Formula System | 8/10 | 9/10 | Good operation type coverage |
| Formula Evaluation Engine | 9/10 | 8/10 | Excellent algorithm detail |
| Template Substitution | 9/10 | 9/10 | Clear security model, good examples |

---

## Action Items

### Must Fix (Before 1.0)

1. [ ] Add cycle detection for formula evaluation
2. [ ] Add error attribution with formula path traces
3. [ ] Add cookie value sanitization to prevent header injection
4. [ ] Document switch case limit or remove it

### Should Fix

5. [ ] Add optional type inference for formulas
6. [ ] Add formula debugging/stepping support
7. [ ] Optimize memoization cache key computation
8. [ ] Add template escaping mechanism

### Nice to Have

9. [ ] Add formula profiling/metrics
10. [ ] Define template type extensibility API
11. [ ] Add higher-order argument validation
12. [ ] Document package context mutation prominently

---

## Conclusion

The Expression Evaluation system is well-architected with a clean AST design and null-safe evaluation. The main areas requiring attention are:

1. **Developer experience** - Debugging, error attribution, type inference
2. **Safety limits** - Cycle detection, depth limits, injection prevention
3. **Performance observability** - Profiling, cache optimization

The template substitution system is particularly well-designed with clear security properties. The formula system would benefit most from better debugging support and type safety.
