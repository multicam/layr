# Responsive Styling & Custom Property System Specification

## Purpose

The Responsive Styling and Custom Property System provides a performant, type-safe mechanism for managing dynamic CSS custom properties (CSS variables) with media query support, pseudo-class/element variants, and theme switching. The system spans SSR and runtime environments, generating static CSS during server rendering and enabling efficient dynamic updates in the browser via CSSOM APIs.

### Jobs to Be Done

- Register and update CSS custom properties efficiently without triggering full style recalculation
- Apply responsive styles via media queries at the variant level
- Support pseudo-class (`:hover`, `:focus`) and pseudo-element (`::before`, `::after`) variants
- Enable theme switching with CSS `@property` definitions and theme-specific value overrides
- Hydrate SSR-generated custom property rules for runtime manipulation
- Generate selector-scoped custom properties for component instances
- Support `@starting-style` for CSS view transitions
- Provide type-safe custom property definitions with CSS syntax validation

---

## Architecture Layers

### Layer 1: Type Definitions (core)

| Module | Purpose |
|--------|---------|
| `component.types.ts` | `MediaQuery`, `CustomProperty`, `CustomPropertyName` types |
| `customProperty.ts` | `CssSyntaxNode`, `renderSyntaxDefinition`, `appendUnit` |
| `variantSelector.ts` | `StyleVariant`, `variantSelector()` selector generation |
| `theme.ts` | `Theme`, `CustomPropertyDefinition`, `getThemeCss()` |
| `theme.const.ts` | Constants: stylesheet ID, theme attribute, cookie name, reset CSS |

### Layer 2: Runtime Management (runtime)

| Class/Function | Purpose |
|---------------|---------|
| `CustomPropertyStyleSheet` | Manages CSS custom properties via CSSOM APIs with media query and `@starting-style` support |
| `subscribeCustomProperty` | Connects reactive signals to CSS property updates |
| `getThemeSignal` | Creates reactive signal for theme switching with cookie persistence |

### Layer 3: SSR Generation (ssr)

| Function | Purpose |
|----------|---------|
| `renderPageBody` | Collects custom properties during component rendering, generates CSS rules |
| `createStylesheet` | Generates complete stylesheet including theme CSS and component styles |

---

## Data Structures

### MediaQuery

```
MediaQuery = {
  'min-width'?: string       // e.g., "768px", "50rem"
  'max-width'?: string
  'min-height'?: string
  'max-height'?: string
  'prefers-reduced-motion'?: 'reduce' | 'no-preference'
}
```

All fields are optional. Multiple conditions are combined with `and`:
`@media (min-width: 768px) and (max-width: 1024px)`

### CustomProperty

```
CustomProperty = {
  formula: Formula            // Computed value (references data, variables, APIs)
  unit?: string               // Auto-appended unit ("px", "rem", "%")
  syntax?: CssSyntaxNode      // CSS type definition for validation/animation
}
```

### CssSyntaxNode

```
CssSyntaxNode =
  | { type: 'primitive', name: CssSyntax }     // <color>, <length>, etc.
  | { type: 'custom', name: CssCustomSyntax }   // font-family, etc.
  | { type: 'keyword', keywords: string[] }      // auto | none | flex-start
```

Supported primitives: `color`, `length`, `length-percentage`, `number`, `percentage`, `angle`, `time`, `resolution`, `custom-ident`, `string`, `image`, `url`, `transform-function`, `transform-list`, `integer`, `*`

Each syntax type has a fallback value (e.g., `color: transparent`, `length: 0px`).

### StyleVariant

```
StyleVariant = {
  // Pseudo-classes (20+ options)
  hover?: boolean
  focus?: boolean
  active?: boolean
  disabled?: boolean
  checked?: boolean
  focusWithin?: boolean
  firstChild?: boolean
  lastChild?: boolean
  'nth-child(even)'?: boolean
  // ...

  // Pseudo-element
  pseudoElement?: string       // "before", "after", etc.

  // Custom selectors
  class?: string
  className?: string
  id?: string

  // Responsive
  breakpoint?: 'small' | 'medium' | 'large'    // Legacy
  mediaQuery?: MediaQuery                        // Modern

  // View transitions
  startingStyle?: boolean

  // Payload
  style: NodeStyleModel
  customProperties?: Record<CustomPropertyName, CustomProperty>
}
```

### CustomPropertyDefinition (Theme)

```
CustomPropertyDefinition = {
  syntax: CssSyntaxNode        // CSS type for @property
  inherits: boolean            // CSS inheritance
  initialValue: string         // Default value, supports var() references
  description: string          // Human-readable description
  values: Record<string, string>  // theme name → overridden value
}
```

### Theme

```
Theme = {
  default?: string              // Default theme name
  defaultDark?: string          // Auto-applied via prefers-color-scheme: dark
  defaultLight?: string         // Auto-applied via prefers-color-scheme: light
  propertyDefinitions?: Record<CustomPropertyName, CustomPropertyDefinition>
  themes?: Record<string, { order?: number }>
  fonts: FontFamily[]
}
```

---

## CustomPropertyStyleSheet

### Purpose

Manages CSS custom properties in a dedicated `CSSStyleSheet` with efficient CSSOM-based updates. Uses `setProperty()` for instant property mutations without CSS re-parsing.

### Constructor

```
constructor(root: Document | ShadowRoot, styleSheet?: CSSStyleSheet)
```

- If `styleSheet` provided: reuses it (SSR hydration — reads `<style id="nc-custom-properties">.sheet`)
- Otherwise: creates new `CSSStyleSheet` and adds to `root.adoptedStyleSheets`

### registerProperty

```
registerProperty(selector, name, options?) → (newValue: string) => void
```

1. Lazy-initialize `ruleMap` from existing SSR rules via `hydrateFromBase()`
2. Construct full selector by wrapping in media query and/or `@starting-style`
3. Check cache for existing rule
4. If missing: insert new CSS rule, traverse nested rules to find innermost `CSSStyleRule`
5. Return closure: `(value) => rule.style.setProperty(name, value)`

### unregisterProperty

```
unregisterProperty(selector, name, options?)
```

Removes property via `rule.style.removeProperty(name)`. If `deepClean: true` and rule becomes empty, deletes the entire CSS rule (used in preview mode to prevent bloat).

### SSR Hydration

`hydrateFromBase()` parses existing `cssRules`, reconstructs full selector strings (including nested `@media` and `@starting-style` wrappers), and builds a selector-to-rule index map for reuse.

### Full Selector Construction

```
getFullSelector(selector, options) → string
```

| Input | Output |
|-------|--------|
| Base only | `[data-id="0.1"] { }` |
| With starting-style | `[data-id="0.1"] { @starting-style { } }` |
| With media query | `@media (min-width: 768px) { [data-id="0.1"] { } }` |
| Combined | `@media (min-width: 768px) { [data-id="0.1"] { @starting-style { } } }` |

---

## Variant Selector Generation

### Function: `variantSelector(variant) → string`

Concatenates selector fragments in order: class names → pseudo-classes → pseudo-elements.

| Input | Output |
|-------|--------|
| `{ hover: true }` | `:hover` |
| `{ className: 'btn', hover: true }` | `.btn:hover` |
| `{ firstChild: true, focus: true }` | `:first-child:focus` |
| `{ pseudoElement: 'before' }` | `::before` |
| `{ autofill: true }` | `:is(:-webkit-autofill, :autofill)` |

Media queries are **not** included in the selector string — they wrap the entire CSS rule at the generation layer.

---

## Media Query Application

### Modern System

Applied at the variant level, wrapping entire style rules:

```css
@media (min-width: 768px) and (max-width: 1024px) {
  [data-id="0.1"]:hover {
    --bg-color: blue;
  }
}
```

### Legacy Breakpoint System

Three fixed breakpoints (min-width only):

| Breakpoint | Value |
|-----------|-------|
| `small` | `576px` |
| `medium` | `960px` |
| `large` | `1440px` |

Generated as `@media (min-width: {value}px) { ... }`. Maintained for backwards compatibility; new components should use `mediaQuery`.

---

## Theme System

### Theme CSS Generation: `getThemeCss()`

1. **Property definitions:** Render `@property` declarations for all definitions
2. **Default theme:** `:host, :root { --var: value; }`
3. **Dark mode auto:** `@media (prefers-color-scheme: dark) { :host, :root { --var: darkValue; } }`
4. **Light mode auto:** `@media (prefers-color-scheme: light) { ... }`
5. **Named themes:** `[data-nc-theme~="themeName"] { --var: value; }`
6. **Reset styles:** Optional global resets (flexbox defaults, typography normalization)
7. **Font faces:** `@font-face` declarations for uploaded/Google fonts
8. **Keyframe animations:** Built-in `animation-spin`, `animation-fade-in`, `animation-fade-out`

### Recursive Var Resolution

`solveVarRecursively()` expands `var(--other-var)` references in initial values:

1. Find `var(--varName)` via regex
2. Look up value in `theme.propertyDefinitions`
3. Replace match with resolved value
4. Recurse if replacement contains more `var()` references
5. Guard against infinite recursion (depth limit: 256)

### Theme Signal (Runtime)

`getThemeSignal()` creates a reactive signal for the current theme:

1. **Formula-based theme:** If `component.route.info.theme.formula` exists, create a mapped signal
2. **Static theme:** If formula is a static value, create signal with that value
3. **Cookie-based theme:** Read from `nc-theme` cookie, listen to Cookie Store API for changes

Theme switching updates `data-nc-theme` attribute on the HTML element, activating the corresponding CSS rules.

### Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `CUSTOM_PROPERTIES_STYLESHEET_ID` | `'nc-custom-properties'` | DOM ID for custom property stylesheet |
| `THEME_DATA_ATTRIBUTE` | `'data-nc-theme'` | HTML attribute for theme selection |
| `THEME_COOKIE_NAME` | `'nc-theme'` | Cookie name for theme persistence |

---

## SSR Custom Property Generation

### Collection During Rendering

`renderPageBody` initializes a `Map<string, Set<string>>` collector. During component tree traversal:

**Element nodes:**
- Base custom properties → selector `[data-id="path"]`
- Variant custom properties → selector `[data-id="path"]:hover` wrapped in `@media` if applicable

**Component instance nodes:**
- Instance custom properties → selector `[data-id="path"].ComponentName\:nodeId`
- Variant instance properties → same with variant pseudo-classes

### Node Selector Construction

`getNodeSelector(path, options?)` builds CSS selectors:

| Input | Output |
|-------|--------|
| `path="0.1"` | `[data-id="0.1"]` |
| `path="0.1", componentName="Button"` | `[data-id="0.1"].Button` |
| `path="0.1", componentName="Button", nodeId="root"` | `[data-id="0.1"].Button\:root` |
| `path="0.1", variant={ hover: true }` | `[data-id="0.1"]:hover` |

### Static Style Generation

`getNodeStyles()` for each element:

1. Convert `NodeStyleModel` to CSS declarations via `styleToCss()`
2. **Auto-pixel conversion:** Numeric values for size properties are multiplied by 4 and suffixed with `px` (4px spacing scale: `1 = 4px`, `2 = 8px`, etc.)
3. Render base styles with class hash selector
4. Render variant styles wrapped in `@media`/`@starting-style` as needed
5. Generate `@keyframes` for animations

---

## Runtime Integration

### subscribeCustomProperty

Connects reactive signal to CSS property:

1. Lazy-initialize singleton `CustomPropertyStyleSheet` (hydrates from SSR `<style>` if present)
2. Call `registerProperty()` to get update function
3. Bind update function to signal subscription
4. On destroy: call `unregisterProperty()` with `deepClean: true` in preview mode

### SSR-to-Runtime Handoff

1. SSR generates `<style id="nc-custom-properties">` with all property rules
2. Runtime reads `document.getElementById('nc-custom-properties').sheet`
3. `CustomPropertyStyleSheet` constructor receives the sheet
4. `hydrateFromBase()` indexes existing rules
5. `registerProperty()` reuses SSR rules; signal subscriptions update values in place

---

## Edge Cases

- **Circular var() references:** `solveVarRecursively` guards with depth limit of 256, returns `null` on unresolvable references, falling back to type-specific defaults
- **SSR/Runtime value mismatch:** Runtime signal immediately updates the property via `setProperty()` — synchronous CSSOM mutation prevents visible flashing
- **Deep clean performance:** Only enabled in preview mode (`runtime === 'preview'`); production skips cleanup since empty rules have negligible performance impact
- **Shadow DOM isolation:** Each `CustomPropertyStyleSheet` instance is scoped to its root (Document or ShadowRoot); components using Shadow DOM receive their own instance
- **Variant selector ordering:** `variantSelector()` orders fragments as class → pseudo-classes → pseudo-elements to ensure valid CSS
- **Media query specificity conflicts:** Multiple variants with different media queries on the same property resolve via CSS cascade order (last defined wins)
- **Missing @property definition:** Custom properties without theme definitions work as generic CSS variables but lose animation interpolation support

---

## System Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxSize` | 10 MB | Maximum data size |
| `maxTime` | 5,000ms | Maximum operation time |
| `maxItems` | 10,000 | Maximum items |

### Enforcement

- Size: Truncate with warning
- Time: Cancel with error
- Items: Stop processing

---

## Invariants

1. Operations MUST be valid
2. Operations MUST be safe
3. Results MUST be deterministic

---

## Error Handling

| Error | Recovery |
|-------|----------|
| Operation fails | Log, continue |
| Timeout | Cancel |
| Size exceeded | Truncate |

---

## Changelog

### Unreleased
- Added System Limits section
- Added Invariants section
- Added Error Handling section
