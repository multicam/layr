# Styling & Theming Specification

## Purpose

The Styling & Theming system manages all visual presentation in Layr: theme definitions with CSS custom properties, deterministic class name generation, style variant selectors, animations, font loading, and runtime custom property management. It ensures consistent rendering across SSR and CSR.

### Jobs to Be Done

- Define theme tokens (colors, fonts, spacing, shadows, etc.) as CSS custom properties
- Generate deterministic, collision-resistant CSS class names from style objects
- Support style variants via pseudo-classes, pseudo-elements, media queries, and breakpoints
- Manage CSS custom properties at runtime with efficient updates
- Proxy and preload Google Fonts with weight/italic encoding
- Render component stylesheets for both SSR and CSR
- Support CSS animations with `@keyframes`

---

## Data Models

### Theme (Modern — v2)

| Field | Type | Description |
|-------|------|-------------|
| `default` | `string` | Name of default theme variant |
| `defaultDark` | `string?` | Name of dark mode theme variant |
| `defaultLight` | `string?` | Name of light mode theme variant |
| `propertyDefinitions` | `Record<string, PropertyDefinition>` | CSS custom properties with syntax, inheritance, initial values, and theme-specific overrides |
| `themes` | `Record<string, { order?: number }>` | Named theme variants with optional ordering |

**Token Categories:** `color`, `fonts`, `font-size`, `font-weight`, `spacing`, `border-radius`, `shadow`, `z-index`

### OldTheme (Legacy — v1)

Flat structure with ordered token maps:

| Field | Type | Description |
|-------|------|-------------|
| `spacing` | `number` | Base spacing unit |
| `colors` | `Record<string, Record<string, string>>` | `color → variant → value` |
| `fontFamily` | `Record<string, string>` | Font family definitions |
| `fontWeight` | `Record<string, number>` | Font weight definitions |
| `fontSize` | `Record<string, string>` | Font size definitions |
| `shadow` | `Record<string, string>` | Shadow definitions |
| `breakpoints` | `{ small, medium, large }` | Breakpoint pixel values |

### StyleVariant

| Field | Type | Description |
|-------|------|-------------|
| `style` | `NodeStyleModel` | CSS properties for this variant |
| `hover` | `boolean?` | `:hover` pseudo-class |
| `focus` | `boolean?` | `:focus` pseudo-class |
| `active` | `boolean?` | `:active` pseudo-class |
| `disabled` | `boolean?` | `:disabled` pseudo-class |
| `checked` | `boolean?` | `:checked` pseudo-class |
| `firstChild` / `first-child` | `boolean?` | `:first-child` pseudo-class |
| `lastChild` / `last-child` | `boolean?` | `:last-child` pseudo-class |
| `evenChild` / `even-child` / `nth-child(even)` | `boolean?` | `:nth-child(even)` |
| `focusWithin` / `focus-within` | `boolean?` | `:focus-within` |
| `focus-visible` | `boolean?` | `:focus-visible` |
| `first-of-type` | `boolean?` | `:first-of-type` |
| `last-of-type` | `boolean?` | `:last-of-type` |
| `autofill` | `boolean?` | `:is(:-webkit-autofill, :autofill)` |
| `empty` | `boolean?` | `:empty` |
| `invalid` | `boolean?` | `:invalid` |
| `link` | `boolean?` | `:link` |
| `visited` | `boolean?` | `:visited` |
| `popover-open` | `boolean?` | `:popover-open` |
| `className` / `class` | `string?` | Additional class selector |
| `pseudoElement` | `string?` | `::${pseudoElement}` |
| `startingStyle` | `boolean?` | Wrap in `@starting-style` |
| `breakpoint` | `'small' \| 'medium' \| 'large'?` | Legacy breakpoint |
| `mediaQuery` | `MediaQuery?` | Modern media query |
| `customProperties` | `Record<CustomPropertyName, CustomProperty>?` | Variant-scoped custom properties |

### MediaQuery

| Field | Type | Description |
|-------|------|-------------|
| `min-width` | `string?` | Minimum viewport width |
| `max-width` | `string?` | Maximum viewport width |
| `min-height` | `string?` | Minimum viewport height |
| `max-height` | `string?` | Maximum viewport height |
| `prefers-reduced-motion` | `'reduce' \| 'no-preference'?` | Motion preference |

### CustomProperty

| Field | Type | Description |
|-------|------|-------------|
| `formula` | `Formula` | Value formula |
| `unit` | `string?` | CSS unit suffix |
| `syntax` | `CssSyntaxNode?` | CSS syntax type for `@property` registration |

### AnimationKeyframe

| Field | Type | Description |
|-------|------|-------------|
| `position` | `number` | 0.0 to 1.0 (maps to 0%–100%) |
| `key` | `string` | CSS property name |
| `value` | `string` | CSS property value |

### NodeStyleModel

`Record<string, string | number>` — CSS property names (camelCase or kebab-case) to values.

---

## Class Name Generation

### Algorithm

1. Serialize the style + variants array: `JSON.stringify([node.style, node.variants])`
2. Hash via **djb2** algorithm (seed = 5381): `h = (h * 33) ^ charCode`
3. Convert numeric hash to **base-52** alphabetic string (a-z = 0-25, A-Z = 26-51)
4. Replace `'ad'` with `'a-d'` to avoid ad-blocker false positives

### Instance Class Names

For component node instances: `toValidClassName(componentName:nodeId, escapeSpecialCharacters=true)`

- Trim whitespace, replace spaces with hyphens
- Escape non-alphanumeric characters with backslash
- Prefix with underscore if starts with non-letter

### Properties

- **Deterministic:** Same input always produces the same class name (SSR/CSR consistency)
- **Collision-resistant:** 52^n possible names
- **Ad-blocker safe:** `'ad'` substring replaced with `'a-d'`

---

## Variant Selector Generation

The `variantSelector()` function builds a CSS selector suffix from variant properties:

| Variant Property | CSS Selector |
|-----------------|--------------|
| `className` / `class` | `.${className}` |
| `firstChild` / `first-child` | `:first-child` |
| `lastChild` / `last-child` | `:last-child` |
| `hover` | `:hover` |
| `focus` | `:focus` |
| `active` | `:active` |
| `disabled` | `:disabled` |
| `checked` | `:checked` |
| `empty` | `:empty` |
| `invalid` | `:invalid` |
| `link` | `:link` |
| `visited` | `:visited` |
| `autofill` | `:is(:-webkit-autofill, :autofill)` |
| `focusWithin` / `focus-within` | `:focus-within` |
| `focus-visible` | `:focus-visible` |
| `first-of-type` | `:first-of-type` |
| `last-of-type` | `:last-of-type` |
| `popover-open` | `:popover-open` |
| `evenChild` / `even-child` / `nth-child(even)` | `:nth-child(even)` |
| `pseudoElement` | `::${pseudoElement}` |

Multiple variants are concatenated: `{ hover: true, firstChild: true }` → `:first-child:hover`

---

## Style-to-CSS Conversion

### `styleToCss(style)`

1. Convert each style entry to a CSS declaration
2. Transform camelCase property names to kebab-case
3. **Size property conversion:** If value is numeric and property is in `SIZE_PROPERTIES`, multiply by 4 and append `'px'`

### SIZE_PROPERTIES

Properties receiving automatic `× 4px` unit conversion:

`width`, `min-width`, `max-width`, `height`, `min-height`, `max-height`, `margin`, `margin-top`, `margin-left`, `margin-bottom`, `margin-right`, `padding`, `padding-top`, `padding-left`, `padding-bottom`, `padding-right`, `gap`, `gap-x`, `gap-y`, `border-radius`, `border-*-radius`, `border-width`, `border-*-width`, `font-size`, `left`, `right`, `top`, `bottom`, `outline-width`

**Example:** `{ marginTop: 2, color: 'red' }` → `margin-top: 8px; color: red;`

---

## Stylesheet Generation (SSR)

### `createStylesheet(root, components, themes, options)`

1. Extract all fonts used in components via `getAllFonts()`
2. Filter theme font families to only used fonts
3. Generate theme CSS via `getThemeCss()`
4. Recursively render component styles in **dependency-first** order (child before parent)
5. Prevent duplicate rendering via `visitedComponents` set
6. Prevent duplicate `@keyframes` via `animationHashes` set

### Node Style Rendering

For each node:

1. Render base styles: `.classHash { ... }`
2. Render variant styles: `.classHash:hover { ... }` (with chained selectors)
3. Wrap in `@media` if `variant.mediaQuery` present
4. Wrap in legacy breakpoint media query if `variant.breakpoint` present
5. Wrap in `@starting-style` if `variant.startingStyle` is true
6. Render `@keyframes` for animations (sorted by position)

### Legacy Breakpoints

| Name | Width |
|------|-------|
| `small` | 576px |
| `medium` | 960px |
| `large` | 1440px |

---

## Runtime Style Management (CSR)

### `insertStyles(parent, root, components)`

1. Generates `<style>` elements for each node in the component tree
2. Removes old style elements (by `[data-hash]` attribute)
3. Appends new styles via document fragment (batch DOM update)
4. Uses same variant/media query/animation logic as SSR

### Scrollbar Width Handling

Via `::-webkit-scrollbar` pseudo-element:
- `'none'` → `width: 0;`
- `'thin'` → `width: 4px;`

---

## Custom Property Stylesheet (Runtime)

### `CustomPropertyStyleSheet`

Manages CSS custom properties at runtime with efficient updates.

| Method | Description |
|--------|-------------|
| `registerProperty(selector, name, options?)` | Register property, returns `(value: string) => void` update function |
| `unregisterProperty(selector, name, options?)` | Remove property from stylesheet |
| `getStyleSheet()` | Get underlying `CSSStyleSheet` |

### Registration Flow

1. Lazily hydrate rule map from existing SSR styles on first call
2. Generate full CSS selector (including media query / `@starting-style` wrappers)
3. If rule doesn't exist, insert new CSS rule
4. Return closure that calls `rule.style.setProperty(name, value)` for O(1) updates

### SSR-to-CSR Hydration

`hydrateFromBase()` maps pre-rendered SSR selectors to their `CSSStyleRule` objects, enabling seamless transition to reactive property updates without re-creating styles.

---

## Theme CSS Generation

### Modern Theme (v2)

1. Register `@property` definitions with syntax, inheritance, initial values
2. Generate `:root` block with default theme values
3. Generate `[data-nc-theme="name"]` blocks for each theme variant
4. Support `@media (prefers-color-scheme: dark)` for automatic dark mode

### Legacy Theme (v1)

1. Generate CSS custom properties in `:root`
2. Variable naming: `--font-${name}`, `--font-size-${name}`, `--${color}-${variant}`, `--shadow-${name}`, `--spacing`
3. Ordered rendering for deterministic output

### CSS Custom Property Syntax Types

Supported `@property` syntaxes: `color`, `length`, `length-percentage`, `percentage`, `number`, `angle`, `time`, `resolution`, `custom-ident`, `string`, `image`, `url`, `transform-function`, `transform-list`, `integer`, `font-family`, `*`

### Variable Resolution

Nested `var(--name)` references resolved recursively (up to 256 levels). Returns `null` for circular or undefined references.

---

## CSS Variable Naming Conventions

| Token Type | v1 Pattern | v2 Pattern |
|-----------|------------|------------|
| Fonts | `--font-${name}` | `--${name}` |
| Font sizes | `--font-size-${name}` | `--${name}` |
| Font weights | `--font-weight-${name}` | `--${name}` |
| Colors | `--${color}-${variant}` | `--${name}` |
| Shadows | `--shadow-${name}` | `--${name}` |
| Spacing | `--spacing` | `--${name}` |

---

## Animation System

### Storage

`animations: Record<string, Record<string, AnimationKeyframe>>` on element nodes.

- Outer key: Animation name (e.g., `"slide-in"`)
- Inner key: Keyframe identifier
- Value: `{ position, key, value }`

### Rendering

1. Check if animation already rendered via `animationHashes` set (dedup)
2. Sort keyframes by `position` ascending
3. Generate `@keyframes name { position% { key: value; } }`

### Built-in Animations

| Name | Description |
|------|-------------|
| `animation-spin` | `rotate(0deg)` → `rotate(360deg)` |
| `animation-fade-in` | `opacity: 0` → `opacity: 1` |
| `animation-fade-out` | `opacity: 1` → `opacity: 0` |

---

## Font Loading

### `getFontCssUrl(fonts, baseForAbsoluteUrls?, basePath?)`

Generates Google Fonts-compatible stylesheet URL.

**Default base path:** `/.toddle/fonts/stylesheet/css2`

### Weight Encoding

- **Standard only:** `400;500;700`
- **With italic:** `0,400;0,700;1,400;1,700` (0 = normal, 1 = italic)

### URL Format

```
/.toddle/fonts/stylesheet/css2?display=swap&family=Inter:ital,wght@0,400;0,700;1,400&family=Fira+Code:wght@400;500
```

### Font Proxying

Fonts are proxied through the Layr backend to avoid third-party requests:
- Stylesheet: `/.toddle/fonts/stylesheet/:stylesheet` → `fonts.googleapis.com`
- Font files: `/.toddle/fonts/font/:font` → `fonts.gstatic.com`
- Response `fonts.gstatic.com` URLs rewritten to `/.toddle/fonts/font`

### Font Inclusion Strategy

All fonts from all themes are included in the stylesheet because:
- Easier to cache font stylesheet across pages
- Simplifies style variable setup
- Same behavior as the editor
- Increases chance of font availability for reset stylesheet
- Negligible overhead for most applications

---

## Font Extraction

### `getAllFonts(components)`

Extracts all `fontFamily` / `font-family` references from all component nodes (base styles and variants). Strips `var(`, `)`, and `'` characters from references.

---

## Edge Cases

- **Ad-blocker safe class names:** `'ad'` → `'a-d'` replacement in generated names
- **Duplicate animation dedup:** Shared `animationHashes` set across components
- **Dependency-first rendering:** Child component styles rendered before parent for correct CSS cascade
- **Visited components tracking:** Prevents duplicate style injection
- **Size property auto-conversion:** Only applies to numeric values in `SIZE_PROPERTIES`
- **Legacy variant support:** Variants stored in `node.style.variants` (deprecated path) still supported
- **Deep clean mode:** `unregisterProperty` with `deepClean` removes entire empty CSS rules (editor preview only)

---

## System Limits

### Theme Limits

| Limit | Default | Maximum | Description |
|-------|---------|---------|-------------|
| `maxThemes` | 20 | 100 | Named theme definitions |
| `maxTokensPerCategory` | 100 | 500 | Tokens per category (color, spacing, etc.) |
| `maxCustomProperties` | 200 | 1,000 | CSS custom property definitions |
| `maxFontFamilies` | 20 | 100 | Font family definitions |

### Style Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxVariantsPerNode` | 50 | Style variants per node |
| `maxAnimationsPerComponent` | 20 | Animation definitions per component |
| `maxCssRulesPerPage` | 10,000 | CSS rules per page stylesheet |

### Font Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxFontWeights` | 9 | Font weights per family |
| `maxFontVariants` | 18 | Font variants (weight × style) per family |
| `maxFontFileSize` | 5 MB | Maximum font file size |

### Enforcement

- **Token count:** Warn at 80%, error at 100%
- **CSS rules:** Truncate with warning
- **Font variants:** Limit silently

---

## Invariants

### Token Invariants

1. **I-STYLE-TOKEN-NAME-UNIQUE:** Token names MUST be unique within category.
2. **I-STYLE-TOKEN-VALUE-VALID:** Token values MUST be valid CSS values.
3. **I-STYLE-VARIABLE-REFERENCE:** Variable-type tokens MUST reference existing tokens.

### Theme Invariants

4. **I-STYLE-THEME-DEFAULT:** If themes defined, one MUST be default.
5. **I-STYLE-THEME-NAME-VALID:** Theme names MUST be valid CSS identifiers.
6. **I-STYLE-CUSTOM-PROPERTY-SYNTAX:** Custom property syntax MUST be valid CSS syntax.

### CSS Invariants

7. **I-STYLE-CLASS-HASH-UNIQUE:** Class hashes MUST be unique per style set.
8. **I-STYLE-ANIMATION-NAME-UNIQUE:** Animation names MUST be unique per component.
9. **I-STYLE-PROPERTY-SERIALIZABLE:** All style values MUST be CSS-serializable.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-STYLE-TOKEN-NAME-UNIQUE | Build | Error: duplicate token |
| I-STYLE-VARIABLE-REFERENCE | Runtime | Fallback to initial value |
| I-STYLE-PROPERTY-SERIALIZABLE | SSR | Skip property, warn |

---

## Error Handling

### Style Errors

| Error Type | When | Recovery |
|------------|------|----------|
| `InvalidTokenError` | Invalid token value | Skip token, use fallback |
| `MissingTokenError` | Referenced token missing | Use initial value |
| `CssSerializationError` | Cannot serialize to CSS | Skip property |

### Theme Errors

| Error Type | When | Recovery |
|------------|------|----------|
| `MissingDefaultThemeError` | No default specified | Use first theme |
| `InvalidCustomPropertyError` | Syntax error | Skip property definition |

### Font Loading Errors

| Error Type | When | Recovery |
|------------|------|----------|
| `FontLoadError` | Font file 404 | Fallback to system font |
| `FontParseError` | Invalid font format | Skip font, log error |

---

## Changelog

### Unreleased
- Added System Limits section with theme, style, and font limits
- Added Invariants section with 9 token, theme, and CSS invariants
- Added Error Handling section with style, theme, and font error handling
