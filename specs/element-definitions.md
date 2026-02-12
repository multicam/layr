# Element Definitions System Specification

## Purpose

The Element Definitions system provides structured metadata for every HTML and SVG element available in the Layr editor. It powers the element catalog (search, autocomplete, drag-to-add), attribute/event introspection, and structural validation (permitted parent/child relationships). The system pulls data from W3C webref and MDN, enriches it with editor-specific metadata, and produces JSON definition files consumed by the editor UI.

### Jobs to Be Done

- Provide a searchable catalog of all HTML (107) and SVG (61+) elements with descriptions and aliases
- Map each element to its DOM interface inheritance chain for attribute/event resolution
- Define default node structures (with pre-configured attrs, styles, and child text nodes) for drag-to-add
- Enforce structural HTML rules (permitted children/parents) for elements like tables and lists
- Mark void elements (self-closing) and popular elements (prioritized in search)
- Supply attribute and event metadata sourced from W3C specs and MDN

---

## Architecture

### Key Files

| File | Responsibility |
|------|----------------|
| `packages/editor/elements/buildElements.ts` | Main code-generation script that produces all element JSON files |
| `packages/editor/elements/buildInterfaces.ts` | Generates the interfaces inheritance JSON |
| `packages/editor/elements/utils.ts` | Element-to-interface mapping, MDN metadata fetching, inheritance chain resolution |
| `packages/editor/elements/htmlInterfaces.ts` | Fetches HTML attribute/event metadata from W3C webref |
| `packages/editor/elements/svgInterfaces.ts` | Fetches SVG attribute/event metadata from W3C webref |
| `packages/editor/elements/html/*.json` | Generated HTML element definitions (107 files) |
| `packages/editor/elements/svg/*.json` | Generated SVG element definitions (61+ files) |
| `packages/editor/elements/interfaces/interfaces.json` | Generated interface inheritance and attribute data |
| `packages/editor/types.d.ts` | TypeScript type definitions for element exports |
| `packages/editor/css-properties/` | CSS property keyword definitions |

### Build Pipeline

```
@webref/elements + @webref/events + mdn-data
          │
          ▼
buildInterfaces.ts
  ├── htmlInterfaces.ts → fetch HTML interfaces, attributes, events from W3C specs
  ├── svgInterfaces.ts  → fetch SVG interfaces, attributes, events from W3C specs
  └── Output: interfaces/interfaces.json
          │
          ▼
buildElements.ts
  ├── For each HTML element: resolve interface → build inheritance chain → generate JSON
  ├── For each SVG element: resolve interface → build inheritance chain → generate JSON
  └── Output: html/*.json + svg/*.json
```

---

## Data Models

### ExportedHtmlElement

The JSON schema for each element definition file:

```typescript
interface ExportedHtmlElement {
  metadata: {
    name: string                           // Element tag name
    categories: ExportedHtmlElementCategory[]  // UI categories for filtering
    description?: string                   // Human-readable description
    link?: string                          // MDN documentation URL
    aliases?: string[]                     // Search aliases for discovery
    isVoid?: true                          // Self-closing element (no children)
    isPopular?: true                       // Prioritized in search results
    permittedChildren?: string[]           // Allowed child element tags
    permittedParents?: string[]            // Allowed parent element tags
    interfaces: string[] | undefined       // DOM interface inheritance chain
  }
  element: {
    type: 'nodes'
    source: 'catalog'
    nodes: Record<string, NodeModel>       // Default node structure for drag-to-add
  }
}
```

### ExportedHtmlElementCategory

```typescript
type ExportedHtmlElementCategory = 'form' | 'typography' | 'media' | 'svg' | 'semantic'
```

| Category | Elements |
|----------|----------|
| `form` | input, button, select, textarea, label, fieldset, legend, datalist, meter, output, progress, optgroup, option, search |
| `typography` | p, h1-h6, span, strong, em, code, pre, blockquote, a (link), b, i, u, s, sub, sup, mark, kbd, etc. |
| `media` | img, video, audio, canvas, iframe, embed, source, track, picture, figure, figcaption, area, map, object |
| `svg` | All SVG elements (svg, circle, rect, path, line, g, text, etc.) |
| `semantic` | div, section, article, nav, header, footer, main, aside, details, dialog, dl, ol, ul, table, etc. |

Elements can belong to multiple categories (e.g. `style` is both `semantic` and `svg`).

---

## HTML Elements (107 total)

### Void Elements

These cannot have children and are self-closing:

`area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `source`, `track`, `wbr`

### Popular Elements

Prioritized in editor search results:

`a`, `button`, `div`, `form`, `h1`, `h2`, `h3`, `img`, `input`, `label`, `li`, `p`, `span`, `ul`

### Default Node Structures

Elements that contain text by default include a pre-configured text child node. Examples:

- **`<p>`**: Root element + text node with value `"Text"`
- **`<h1>`**: Root element + text node with value `"h1 heading"`
- **`<button>`**: Root element + text node with value `"Button text"`
- **`<a>`**: Root element with `href="/"` and `data-prerender="moderate"` + text node `"Link"`
- **`<strong>`**: Root element with bold font-weight + text node `"Bold text"`
- **`<span>`**: Root element with inline display and inherited font properties + text node `"Text"`

Typography elements that wrap text inherit a shared default style: `{ display: 'inline', font-family: 'inherit', font-weight: 'inherit', font-size: 'inherit' }`.

Elements without text children (containers, media, etc.) default to:
```json
{
  "root": {
    "tag": "<element>",
    "type": "element",
    "attrs": {},
    "style": {},
    "events": {},
    "classes": {},
    "children": [],
    "style-variables": []
  }
}
```

### Structural Rules (Permitted Children/Parents)

| Element | Permitted Children | Permitted Parents |
|---------|-------------------|-------------------|
| `dl` | dd, dt, div, script, template | — |
| `ol` | li, template, script | — |
| `ul` | li, template, script | — |
| `select` | option, optgroup, hr | — |
| `optgroup` | option | select |
| `option` | — | select, datalist, optgroup |
| `table` | tbody, thead, tfoot, tr, colgroup, caption | — |
| `tbody` | tr | table |
| `thead` | tr | table |
| `tfoot` | tr | table |
| `tr` | td, th, script, template | table, thead, tbody, tfoot |
| `td` | — | tr |
| `th` | — | tr |
| `li` | — | ul, ol, menu |
| `legend` | — | fieldset |
| `figcaption` | — | figure |
| `caption` | — | (table) |

### Default Attributes

Elements with meaningful default attributes:

| Element | Default Attributes |
|---------|--------------------|
| `a` | `href="/"`, `data-prerender="moderate"` |
| `img` | `src=""`, `alt=null` |
| `input` | `type="text"`, `value=""`, `placeholder=""` |
| `button` | `type="button"` |
| `form` | `action=""` |
| `iframe` | `src=""` |
| `video` | `src=""` |
| `audio` | — |
| `textarea` | `name=""` |
| `select` | `name=""` |
| `embed` | `src=""`, `type=""` |

---

## SVG Elements (61+ total)

### Popular SVG Elements

`line`, `path`, `rect`, `svg`

### Categories

All SVG elements are categorized as `svg`. The root `<svg>` element is additionally `semantic`.

### SVG Element Groups

| Group | Elements |
|-------|----------|
| **Shapes** | circle, ellipse, line, path, polygon, polyline, rect |
| **Text** | text, textPath, tspan |
| **Structure** | svg, g, defs, symbol, use, view, foreignObject |
| **Gradients** | linearGradient, radialGradient, stop |
| **Filters** | filter, feBlend, feColorMatrix, feComponentTransfer, feComposite, feConvolveMatrix, feDiffuseLighting, feDisplacementMap, feDistantLight, feDropShadow, feFlood, feFuncA/B/G/R, feGaussianBlur, feImage, feMerge, feMergeNode, feMorphology, feOffset, fePointLight, feSpecularLighting, feSpotLight, feTile, feTurbulence |
| **Clipping/Masking** | clipPath, mask, marker, pattern |
| **Animation** | animate, animateMotion, animateTransform, set |
| **Metadata** | desc, metadata, title |
| **Other** | image, mpath, script, switch |

---

## Interface Inheritance System

### Purpose

Each element is mapped to its primary DOM interface, and the full inheritance chain is resolved. This allows the editor to determine which attributes and events are available on an element by walking up the interface hierarchy.

### Resolution Flow

1. `getHtmlElementInterface(tagName)` → returns the primary interface (e.g. `HTMLDivElement`)
2. `inheritedInterfaces(interfaceName, isHtml)` → recursively walks the prototype chain using `mdn-data`'s API inheritance data
3. Returns an array like: `["HTMLDivElement", "HTMLElement", "Element", "Node", "EventTarget", "global"]`

### Interface-to-Attribute Mapping

The `interfaces.json` file maps each interface to its attributes and events:

```json
{
  "HTMLInputElement": {
    "attributes": {
      "type": { "description": "...", "values": ["text", "password", ...] },
      "value": { "description": "..." }
    },
    "events": {
      "input": { "description": "..." },
      "change": { "description": "..." }
    }
  }
}
```

This allows the editor to compute all available attributes for `<input>` by merging attributes from `HTMLInputElement` + `HTMLElement` + `Element` + `Node` + `EventTarget` + `global`.

### Data Sources

| Source | Package | Data Provided |
|--------|---------|---------------|
| W3C webref | `@webref/elements` | Element-to-interface mapping |
| W3C webref | `@webref/events` | Event definitions per interface |
| MDN Data | `mdn-data` | API inheritance chains |
| Custom | (hardcoded) | Layr-specific attributes (`data-unset-toddle-styles`, `data-nc-theme`), referrer policy values, OpenGraph properties |

---

## CSS Property Keywords

The `css-properties/` directory provides CSS keyword definitions:

| File | Responsibility |
|------|----------------|
| `fetchCssPropertyKeywords.ts` | Fetches CSS property value definitions from `mdn-data` |
| `keywordDescriptionsByProperty.ts` | Generated map of CSS property names to their allowed keyword values with descriptions |

This powers the editor's CSS value autocomplete.

---

## Build Process

### Scripts (from `package.json`)

| Script | Command | Description |
|--------|---------|-------------|
| `buildElements` | `bun run elements/buildElements.ts` | Generate all element JSON files |
| `buildInterfaces` | `bun run elements/buildInterfaces.ts` | Generate interfaces.json |

### Output Files

- `elements/html/*.json` — 107 HTML element definitions
- `elements/svg/*.json` — 61+ SVG element definitions
- `elements/interfaces/interfaces.json` — Interface inheritance and attribute data
- `css-properties/keywordDescriptionsByProperty.ts` — CSS property keywords

---

## Business Rules

1. **Search aliases**: Every element has human-friendly aliases for editor search (e.g. `div` → `container`, `division`; `img` → `image`, `picture`)
2. **Popular priority**: Popular elements appear first in search/catalog results
3. **Void enforcement**: Void elements have `isVoid: true` and their default node structure has no children
4. **MDN links**: All elements link to their MDN documentation page
5. **Structural validation**: `permittedChildren` and `permittedParents` are consumed by the search/linting system to generate structural validation rules

---

## Edge Cases

- **Shared element names**: `style` exists as both HTML (`semantic`) and SVG element. `script` also exists in both namespaces with different default attributes.
- **Missing interfaces**: If `getHtmlElementInterface()` or `getSvgElementInterface()` returns no interface, the build script throws an error — all elements must have a resolvable interface.
- **Inheritance termination**: The chain always terminates at `global` (for HTML) or at the SVG root interface.
- **Custom Layr attributes**: `data-unset-toddle-styles` and `data-nc-theme` are injected into the interface system as custom attributes not found in any W3C spec.

---

## External Dependencies

- **`@webref/elements`**: W3C element-to-interface mapping
- **`@webref/events`**: W3C event definitions
- **`mdn-data`**: MDN API inheritance data, CSS property values
- **`css-tree`**: CSS value parsing
- **`@layr/core`**: `NodeModel` and `Formula` types for element structure definitions

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
