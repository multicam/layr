# Styling Engine

CSS generation, custom properties, responsive variants, and web font loading for Layr. Spans SSR and CSR with deterministic class names and efficient CSSOM-based runtime updates.

**Packages:** `@layr/runtime`, `@layr/ssr`, `@layr/types`

---

## Phase Summary

| Feature | Phase | Status |
|---------|-------|--------|
| CSS custom properties (`@property`) | MVP | Implemented |
| Deterministic class name generation (djb2) | MVP | Implemented |
| Style-to-CSS conversion with 4px scale | MVP | Implemented |
| Variant selectors (pseudo-classes/elements) | MVP | Implemented |
| Media queries + breakpoints | MVP | Implemented |
| `CustomPropertyStyleSheet` (CSSOM) | MVP | Implemented |
| SSR-to-CSR hydration | MVP | Implemented |
| `@keyframes` animation rendering | MVP | Implemented |
| Google Fonts proxying | MVP | Implemented |
| `@font-face` generation (uploaded fonts) | MVP | Implemented |
| `@starting-style` view transitions | MVP | Implemented |
| Variable font range encoding | Phase 2 | Not yet (static weights only) |

---

## Class Name Generation

### Algorithm

1. Serialize: `JSON.stringify([node.style, node.variants])`
2. Hash via **djb2** (`seed = 5381`): `h = (h * 33) ^ charCode`
3. Convert to **base-52** alphabetic string (`a-z` = 0–25, `A-Z` = 26–51)
4. Replace `'ad'` → `'a-d'` (ad-blocker safety)

### Instance Class Names

`toValidClassName(componentName:nodeId, escapeSpecialCharacters=true)`:
- Trim, replace spaces with hyphens
- Escape non-alphanumeric characters with backslash
- Prefix with `_` if starts with non-letter

**Properties:** deterministic (SSR/CSR consistency), collision-resistant (52^n space), ad-blocker safe.

---

## Style-to-CSS Conversion

### `styleToCss(style)`

1. Convert each entry to a CSS declaration
2. Transform camelCase → kebab-case
3. If value is numeric and property is in `SIZE_PROPERTIES`: multiply by 4 and append `px`

### SIZE_PROPERTIES (4px scale)

`width`, `min-width`, `max-width`, `height`, `min-height`, `max-height`, `margin`, `margin-top`, `margin-left`, `margin-bottom`, `margin-right`, `padding`, `padding-top`, `padding-left`, `padding-bottom`, `padding-right`, `gap`, `gap-x`, `gap-y`, `border-radius`, `border-*-radius`, `border-width`, `border-*-width`, `font-size`, `left`, `right`, `top`, `bottom`, `outline-width`

**Example:** `{ marginTop: 2, color: 'red' }` → `margin-top: 8px; color: red;`

---

## Variant Selectors

### `variantSelector(variant) → string`

Concatenates fragments in order: class names → pseudo-classes → pseudo-elements.

| Variant Property | CSS Output |
|-----------------|------------|
| `className` / `class` | `.${className}` |
| `hover` | `:hover` |
| `focus` | `:focus` |
| `active` | `:active` |
| `disabled` | `:disabled` |
| `checked` | `:checked` |
| `empty` | `:empty` |
| `invalid` | `:invalid` |
| `link` | `:link` |
| `visited` | `:visited` |
| `firstChild` / `first-child` | `:first-child` |
| `lastChild` / `last-child` | `:last-child` |
| `evenChild` / `even-child` / `nth-child(even)` | `:nth-child(even)` |
| `focusWithin` / `focus-within` | `:focus-within` |
| `focus-visible` | `:focus-visible` |
| `first-of-type` | `:first-of-type` |
| `last-of-type` | `:last-of-type` |
| `autofill` | `:is(:-webkit-autofill, :autofill)` |
| `popover-open` | `:popover-open` |
| `pseudoElement` | `::${pseudoElement}` |

**Example:** `{ hover: true, firstChild: true }` → `:first-child:hover`

Media queries are not part of the selector string — they wrap the entire CSS rule.

---

## Media Queries & Breakpoints

### MediaQuery Interface

```typescript
interface MediaQuery {
  'min-width'?: string
  'max-width'?: string
  'min-height'?: string
  'max-height'?: string
  'prefers-reduced-motion'?: 'reduce' | 'no-preference'
}
```

Multiple conditions combined with `and`: `@media (min-width: 768px) and (max-width: 1024px)`

### Legacy Breakpoints

| Name | min-width |
|------|-----------|
| `small` | 576px |
| `medium` | 960px |
| `large` | 1440px |

```typescript
// packages/runtime/src/styles/index.ts
export const BREAKPOINTS: Record<BreakpointName, number> = {
  small: 576,
  medium: 960,
  large: 1440,
};
```

`breakpoint` on a variant generates `@media (min-width: {value}px)`. New variants should use `mediaQuery` instead.

---

## StyleVariant Interface

```typescript
interface StyleVariant {
  style: NodeStyleModel                              // CSS properties
  hover?: boolean
  focus?: boolean
  active?: boolean
  disabled?: boolean
  checked?: boolean
  focusWithin?: boolean
  firstChild?: boolean
  lastChild?: boolean
  'nth-child(even)'?: boolean
  pseudoElement?: string                             // "before", "after", etc.
  className?: string
  breakpoint?: 'small' | 'medium' | 'large'         // legacy
  mediaQuery?: MediaQuery                            // preferred
  startingStyle?: boolean                            // @starting-style wrapper
  customProperties?: Record<string, CustomProperty>
}
```

---

## CustomProperty & CSS Syntax

```typescript
interface CustomProperty {
  formula: Formula
  unit?: string        // auto-appended (e.g., "px", "rem")
  syntax?: CssSyntaxNode
}

type CssSyntaxNode =
  | { type: 'primitive'; name: CssSyntax }
  | { type: 'custom'; name: string }       // "font-family"
  | { type: 'keyword'; keywords: string[] }

type CssSyntax =
  | 'color' | 'length' | 'length-percentage' | 'number' | 'percentage'
  | 'angle' | 'time' | 'resolution' | 'custom-ident' | 'string'
  | 'image' | 'url' | 'transform-function' | 'transform-list' | 'integer' | '*'
```

### Syntax Fallback Values

| Syntax | Fallback |
|--------|---------|
| `color` | `transparent` |
| `length` | `0px` |
| `number` | `0` |
| `percentage` | `0%` |
| `angle` | `0deg` |
| `time` | `0s` |
| `string` | `''` |
| `image` | `none` |
| `*` | `''` |

---

## `CustomPropertyStyleSheet`

Manages CSS custom properties at runtime via CSSOM, enabling O(1) updates without style recalculation.

```typescript
class CustomPropertyStyleSheet {
  constructor(root: Document | ShadowRoot, styleSheet?: CSSStyleSheet)
  registerProperty(selector, name, options?) → (value: string) => void
  unregisterProperty(selector, name, options?)
  getStyleSheet() → CSSStyleSheet
}
```

### `registerProperty` Flow

1. Lazy-hydrate `ruleMap` from SSR styles on first call (`hydrateFromBase()`)
2. Construct full selector (with media query / `@starting-style` wrappers)
3. If rule missing: `insertRule()`, traverse nested rules to find `CSSStyleRule`
4. Return closure: `(value) => rule.style.setProperty(name, value)`

### Full Selector Examples

| Input | Output |
|-------|--------|
| Base only | `[data-id="0.1"]` |
| With `startingStyle` | `[data-id="0.1"] { @starting-style {} }` |
| With media query | `@media (min-width: 768px) { [data-id="0.1"] }` |

### `unregisterProperty`

Removes property via `rule.style.removeProperty(name)`. With `deepClean: true` (preview mode only), deletes the entire rule if it becomes empty.

### SSR-to-CSR Hydration

1. SSR generates `<style id="nc-custom-properties">` with all property rules
2. Runtime reads `document.getElementById('nc-custom-properties').sheet`
3. `CustomPropertyStyleSheet` receives the existing sheet
4. `hydrateFromBase()` indexes all existing rules into `ruleMap`
5. `registerProperty()` reuses SSR rules; signals update values via `setProperty()`

### Constants

| Constant | Value |
|----------|-------|
| `CUSTOM_PROPERTIES_STYLESHEET_ID` | `'nc-custom-properties'` |
| `THEME_DATA_ATTRIBUTE` | `'data-nc-theme'` |
| `THEME_COOKIE_NAME` | `'nc-theme'` |

---

## Stylesheet Generation (SSR)

### `createStylesheet(root, components, themes, options)`

1. Extract all `fontFamily` / `font-family` references from all nodes via `getAllFonts()`
2. Filter theme fonts to only used families
3. Generate theme CSS via `getThemeCss()`
4. Render component styles **dependency-first** (child before parent)
5. Deduplicate via `visitedComponents` set
6. Deduplicate `@keyframes` via `animationHashes` set

### Node Style Rendering

For each node:
1. Render base: `.classHash { ... }`
2. Render variant: `.classHash:hover { ... }`
3. Wrap in `@media` if `variant.mediaQuery` present
4. Wrap in breakpoint `@media` if `variant.breakpoint` present
5. Wrap in `@starting-style` if `variant.startingStyle` is true
6. Render `@keyframes` for animations (sorted by position)

### Scrollbar Width

Via `::webkit-scrollbar`:
- `'none'` → `width: 0`
- `'thin'` → `width: 4px`

---

## Theme CSS Generation (`getThemeCss()`)

1. Render `@property` declarations for all property definitions
2. `:host, :root { --var: value; }` — default theme
3. `@media (prefers-color-scheme: dark) { :host, :root { ... } }` — auto dark
4. `@media (prefers-color-scheme: light) { ... }` — auto light
5. `[data-nc-theme~="name"] { --var: value; }` — named theme variants
6. Global reset styles
7. `@font-face` declarations
8. Built-in `@keyframes`

### Var Resolution

`solveVarRecursively()` expands `var(--other-var)` references:
- Regex-finds `var(--varName)`, looks up in `propertyDefinitions`, replaces, recurses
- Depth limit: 256 (circular reference guard, returns `null` on failure)

### Theme Signal (Runtime)

`getThemeSignal()`:
1. If `component.route.info.theme.formula` exists → mapped signal
2. If static string formula → signal with that value
3. Else → read `nc-theme` cookie, subscribe to Cookie Store API

Theme switching sets `data-nc-theme` attribute on `<html>`.

---

## Animation System

```typescript
// Storage on element nodes
animations: Record<string, Record<string, AnimationKeyframe>>
// outer key: animation name; inner key: keyframe id

interface AnimationKeyframe {
  position: number   // 0.0–1.0 → 0%–100%
  key: string        // CSS property
  value: string      // CSS value
}
```

### Rendering

1. Check `animationHashes` set to skip duplicates
2. Sort keyframes by `position` ascending
3. Emit `@keyframes name { position% { key: value; } }`

### Built-in Keyframes

| Name | From → To |
|------|-----------|
| `animation-spin` | `rotate(0deg)` → `rotate(360deg)` |
| `animation-fade-in` | `opacity: 0` → `opacity: 1` |
| `animation-fade-out` | `opacity: 1` → `opacity: 0` |

---

## Font System

### FontFamily Interface

```typescript
interface FontFamily {
  name: string
  family: string
  provider: 'google' | 'upload'
  type: 'serif' | 'sans-serif' | 'monospace' | 'cursive'
  variants?: FontVariant[]
}

interface FontVariant {
  name: string
  weight: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'
  italic?: boolean
  url?: string
}
```

### `getFontCssUrl(options)`

Generates a Google Fonts-compatible stylesheet URL through the Layr proxy.

**Default base path:** `/.toddle/fonts/stylesheet/css2`

**Weight encoding:**
- No italic variants: `family=Roboto:wght@400;700`
- With italic: `family=Roboto:ital,wght@0,400;0,700;1,400;1,700` (0 = normal, 1 = italic)

**Example:**
```
/.toddle/fonts/stylesheet/css2?display=swap&family=Inter:wght@400;700&family=Fira+Code:wght@400;500
```

Returns `undefined` if no fonts or no valid weights.

### `generateFontFace(font)` — Uploaded Fonts

Emits `@font-face` rules for `provider: 'upload'` fonts:

```css
@font-face {
  font-family: 'MyFont';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/myfont.woff2') format('woff2');
}
```

### Google Fonts Proxy

Routes through Layr backend to avoid third-party requests:

| Route | Upstream |
|-------|---------|
| `GET /.toddle/fonts/stylesheet/:stylesheet{.*}` | `fonts.googleapis.com/{stylesheet}` |
| `GET /.toddle/fonts/font/:font{.*}` | `fonts.gstatic.com/{font}` |

Stylesheet proxy rewrites all `https://fonts.gstatic.com` URLs to `/.toddle/fonts/font`.

**Request headers forwarded:** `Accept`, `Accept-Encoding`, `Accept-Language`, `Referer`, `User-Agent`

**Response headers forwarded:** `Content-Type`, `Cache-Control`, `Expires`, `Accept-Ranges`, `Date`, `Last-Modified`, `ETag`

User-Agent is critical — Google returns different formats (woff2/woff/ttf) per browser.

### Font Inclusion Strategy

All fonts from all themes are included in every page:
- Better cross-page cache hit rate (same URL)
- Consistent with editor behavior
- Guarantees `var(--font-sans)` availability for reset stylesheet

### Head Integration

`getHeadItems()` generates `<link rel="stylesheet" href="...">` for the font proxy URL.

---

## Edge Cases

| Case | Behavior |
|------|---------|
| `'ad'` in class name | Replaced with `'a-d'` |
| Duplicate `@keyframes` | Deduped via `animationHashes` set |
| Circular `var()` | Depth-limited to 256, returns `null` |
| SSR/runtime value mismatch | `setProperty()` fires synchronously |
| Shadow DOM | Each `CustomPropertyStyleSheet` scoped to its root |
| Empty font list | `getFontCssUrl` returns `undefined`, no `<link>` emitted |
| Font with no valid weights | Skipped |
| Google Fonts outage | Proxy returns 404; `font-display: swap` ensures text renders |
| Deep clean | `unregisterProperty` + `deepClean: true` only in preview mode |

---

## Cross-References

- Theme definitions and token values → `specs/21-themes.md`
- SEO head integration (`<link>` tags for fonts) → `specs/23-seo-and-head.md`
