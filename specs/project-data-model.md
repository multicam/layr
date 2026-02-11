# Project Data Model Specification

## Purpose

The Project Data Model defines the canonical structure of a Layr project — the single JSON file that represents an entire application or package. Every component, formula, action, theme, route, API service, and installed package is encoded in this structure. It is the serialization format persisted by the editor, read by the backend server, processed by the SSR pipeline, and served to the runtime.

### Jobs to Be Done

- Define a self-contained, portable representation of a full Layr application
- Support two project types: `app` (standalone deployable applications) and `package` (reusable libraries consumed by apps)
- Organize all project assets (components, custom formulas, custom actions, themes, services, routes) under a single `files` namespace
- Enable package-based composition where installed packages contribute components, formulas, and actions
- Provide project-level configuration for runtime versions, themes, and meta-endpoint overrides
- Support custom route declarations (redirects and rewrites) independent of page components

---

## Top-Level Envelope

A Layr project JSON file has four root fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string (UUID)` | Unique identifier for this specific version/snapshot of the project |
| `project` | `ToddleProject` | Project metadata (name, type, owner, thumbnail) |
| `commit` | `string (SHA hash)` | Version identifier for this snapshot — acts as a content-addressable version |
| `files` | `ProjectFiles` | All project assets: components, packages, formulas, actions, routes, config, themes, services |

**Source:** `packages/backend/__project__/project.json` (sample), `packages/ssr/src/ssr.types.ts:22-53`

### Example (minimal)

```json
{
  "id": "60e08c76-...",
  "project": {
    "id": "13d6fae3-...",
    "name": "My App",
    "type": "app",
    "short_id": "my_app",
    "emoji": null,
    "thumbnail": null,
    "description": "A Layr application"
  },
  "commit": "79f18125db9aec...",
  "files": {
    "components": { ... },
    "config": { ... },
    "themes": { ... }
  }
}
```

---

## Data Models

### ToddleProject

Project-level metadata. Does not contain any functional assets — purely descriptive.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Human-readable project name |
| `short_id` | `string` | Yes | URL-safe slug used in asset paths (e.g., `my_app`). Used for generating custom code module identifiers and custom element prefixes |
| `id` | `string (UUID)` | Yes | Globally unique project identifier |
| `type` | `'app' \| 'package'` | Yes | Determines deploy behavior. `app` projects have pages with routes and can be served. `package` projects export components/formulas/actions for reuse |
| `description` | `string?` | No | Human-readable description |
| `emoji` | `string?` | No | Decorative emoji for the project |
| `thumbnail` | `{ path: string }?` | No | Path to a project thumbnail image |

**Source:** `packages/ssr/src/ssr.types.ts:22-30`

**Business Rules:**
- `short_id` must be unique within an organization and URL-safe (lowercase, underscores, no spaces)
- `type` determines the deployment model: `app` projects produce serveable pages; `package` projects have no routable pages of their own but export assets for consumption
- The `short_id` is used as a namespace prefix for custom element names and code module registration

---

### ProjectFiles

The main asset container. All functional content of a project lives here.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `components` | `Partial<Record<string, Component>>` | Yes | All components and pages, keyed by name. Pages are components with a `route` field |
| `packages` | `Partial<Record<string, InstalledPackage>>?` | No | Installed packages providing external components, formulas, and actions |
| `actions` | `Record<string, PluginAction>?` | No | Project-level custom actions (code-based) |
| `formulas` | `Record<string, PluginFormula>?` | No | Project-level custom formulas (code-based or declarative) |
| `routes` | `Record<string, Route>?` | No | Custom routes — redirects and rewrites, independent of page components |
| `config` | `ProjectConfig?` | No | Runtime configuration and meta-endpoint overrides |
| `themes` | `Record<string, Theme>?` | No | Named theme definitions (V2 design token system) |
| `services` | `Record<string, ApiService>?` | No | API service configurations for external integrations |

**Source:** `packages/ssr/src/ssr.types.ts:32-53`

**Business Rules:**
- `components` is `Partial` (values can be `undefined`) to support lazy loading — loaders may partially populate the record
- Every page component has a `route` property; non-page components do not
- The `components` record key is the component name — keys must match the `name` field of the component value
- A project with `type: 'package'` should have its exported components marked with `exported: true`

---

### ProjectConfig

Global runtime configuration for the project.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `runtimeVersion` | `string?` | No | Pinned Layr runtime version (semver). Corresponds to GitHub release tags |
| `theme` | `OldTheme` | Yes (in V1) | Legacy V1 theme definition. Present only on older projects |
| `meta` | `ProjectMeta?` | No | Overrides for meta-endpoint generation |

**Source:** `packages/ssr/src/ssr.types.ts:39-50`

#### ProjectMeta

Formula-driven overrides for project-wide meta-endpoints. Each field is a `{ formula: Formula }` wrapper.

| Field | Type | Description |
|-------|------|-------------|
| `icon` | `{ formula: Formula }?` | Path to the project favicon. If `null`, `/favicon.ico` returns 404 |
| `robots` | `{ formula: Formula }?` | Content override for `/robots.txt`. If `null`, uses default |
| `sitemap` | `{ formula: Formula }?` | Content override for `/sitemap.xml`. If `null`, auto-generates from pages |
| `manifest` | `{ formula: Formula }?` | Content override for `/manifest.json`. If `null`, auto-generates |
| `serviceWorker` | `{ formula: Formula }?` | Content override for `/serviceWorker.js`. If `null`, returns 404 |

**Business Rules:**
- All meta fields are formulas, meaning they can be dynamic expressions (not just static values)
- Setting a meta field to `null` disables the override and falls back to default behavior
- The `robots`, `sitemap`, `manifest`, and `serviceWorker` formulas are evaluated server-side during request handling

---

### InstalledPackage

Represents a package dependency installed into the project.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `manifest` | `PackageManifest` | Yes | Package identity and version info |
| `components` | `Partial<Record<string, Component>>` | Yes | Components contributed by this package |
| `actions` | `Record<string, PluginAction>?` | No | Actions contributed by this package |
| `formulas` | `Record<string, PluginFormula>?` | No | Formulas contributed by this package |

**Source:** `packages/ssr/src/ssr.types.ts:80-90`

#### PackageManifest

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Package name (used as namespace prefix, e.g., `best_like_button`) |
| `commit` | `string (SHA hash)` | Content-addressable version of the installed package snapshot |

**Business Rules:**
- Package components are namespaced: a component `like-button` from package `best_like_button` is referenced as `best_like_button/like-button` within the consuming project
- Only components marked with `exported: true` in the source package should be consumable
- Package `commit` serves as a version lock — updating a package means changing the commit hash
- Currently, only `components`, `actions`, and `formulas` are shared; `themes` and `config` may be added in the future

**Component Reference Resolution:**
When a `ComponentNodeModel` references a package component, it uses:
- `name`: the component name within the package (e.g., `best-like-button`)
- `package`: the package name (e.g., `best_like_button`)

The resolver looks up `files.packages[package].components[name]`.

---

### ApiService

Defines an external API service integration. Services provide shared configuration (base URL, API key, docs) reused across multiple API requests.

```
ApiService = SupabaseApiService | XanoApiService | CustomApiService
```

#### BaseApiService (shared fields)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Human-readable service name |
| `baseUrl` | `Formula?` | No | Base URL formula for all requests using this service |
| `docsUrl` | `Formula?` | No | Documentation URL for developer reference |
| `apiKey` | `Formula?` | No | API key formula (can reference secrets/env vars) |
| `meta` | `Record<string, unknown>?` | No | Service-specific metadata |

**Source:** `packages/ssr/src/ssr.types.ts:55-61`

#### Service Type Variants

| Type | `type` value | Extra fields | Description |
|------|-------------|--------------|-------------|
| Supabase | `'supabase'` | `meta.projectUrl?: Formula` | Supabase integration with project URL |
| Xano | `'xano'` | None | Xano backend integration |
| Custom | `'custom'` | None | Generic REST API service |

**Business Rules:**
- Services are referenced by key from `ApiRequest.service` in component API definitions
- All service fields are `Formula` types, allowing dynamic values (e.g., environment-specific base URLs)
- The `baseUrl` from a service is composed with the `path` and `queryParams` of individual API requests

---

### Route (Custom Routes)

Custom routes define redirects and rewrites that are processed before page matching. They allow pattern-based URL transformations.

```
Route = RewriteRoute | RedirectRoute
```

#### Base Route Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | `RouteDeclaration` | Yes | URL pattern to match (path segments + query params) |
| `destination` | `ApiBase` | Yes | Target URL construction (base URL + path + query params + hash) |
| `enabled` | `{ formula: Formula }?` | No | Dynamic enable/disable toggle |

**Source:** `packages/ssr/src/ssr.types.ts:92-106`

#### RewriteRoute

| Field | Type | Value |
|-------|------|-------|
| `type` | `string` | `'rewrite'` |

Rewrites transparently proxy the request to the destination URL. The browser URL does not change.

#### RedirectRoute

| Field | Type | Description |
|-------|------|-------------|
| `type` | `string` | `'redirect'` |
| `status` | `RedirectStatusCode?` | HTTP redirect status code (300, 301, 302, 303, 304, 307, 308). Defaults to 302 |

Redirects respond with an HTTP redirect to the destination URL. The browser navigates to the new URL.

#### RouteDeclaration (Source Pattern)

| Field | Type | Description |
|-------|------|-------------|
| `path` | `Array<StaticPathSegment \| DynamicPathSegment>` | Ordered path segments defining the URL pattern |
| `query` | `Record<string, { name: string; testValue: any }>` | Named query parameter declarations |

#### Path Segments

| Type | `type` value | Fields | Description |
|------|-------------|--------|-------------|
| Static | `'static'` | `name: string`, `optional?: boolean` | Literal path segment (e.g., `/redirect`) |
| Dynamic | `'param'` | `name: string`, `testValue: string`, `optional?: boolean` | Named parameter (e.g., `/:id`) |

**Business Rules:**
- Routes are evaluated before page matching in the request lifecycle
- The `enabled` formula is evaluated at request time; if falsy, the route is skipped
- Route `destination.url` is a `Formula`, so it can be dynamically computed (e.g., using the current URL origin)
- Redirects support standard HTTP redirect codes; 302 is the default
- Rewrites are transparent server-side proxies — the client sees no URL change
- Routes can capture path parameters via `DynamicPathSegment` and use them in the destination formula

---

### Theme (V2)

The V2 theme system uses design tokens organized by category, with support for multiple named themes and CSS custom property definitions.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `default` | `string?` | No | Name of the default theme variation |
| `defaultDark` | `string?` | No | Theme applied when `prefers-color-scheme: dark` |
| `defaultLight` | `string?` | No | Theme applied when `prefers-color-scheme: light` |
| `propertyDefinitions` | `Record<CustomPropertyName, CustomPropertyDefinition>?` | No | CSS custom property definitions with per-theme values |
| `themes` | `Record<string, { order?: number }>?` | No | Named theme variations (applied via `data-nc-theme` attribute) |
| `scheme` | `'dark' \| 'light'?` | No | Legacy color scheme hint |
| `color` | `StyleTokenGroup[]?` | No | Color design tokens |
| `fonts` | `FontFamily[]` | Yes | Font family definitions with variants and sources |
| `font-size` | `StyleTokenGroup[]?` | No | Font size tokens |
| `font-weight` | `StyleTokenGroup[]?` | No | Font weight tokens |
| `spacing` | `StyleTokenGroup[]?` | No | Spacing tokens |
| `border-radius` | `StyleTokenGroup[]?` | No | Border radius tokens |
| `shadow` | `StyleTokenGroup[]?` | No | Shadow tokens |
| `z-index` | `StyleTokenGroup[]?` | No | Z-index tokens |

**Source:** `packages/core/src/styling/theme.ts:77-98`

#### StyleTokenGroup

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Group name (e.g., `"grey"`, `"Default"`) |
| `tokens` | `StyleToken[]` | Array of token definitions |

#### StyleToken

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Token name used as CSS variable name (e.g., `grey-500`) |
| `type` | `'value' \| 'variable'` | Whether the value is a literal or references another token |
| `value` | `string` | The token value (literal CSS value or name of another token) |

#### FontFamily

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Short name for CSS variable (e.g., `sans` → `--font-sans`) |
| `family` | `string` | CSS font family name (e.g., `Inter`) |
| `provider` | `'google' \| 'upload'` | Font source |
| `type` | `'serif' \| 'sans-serif' \| 'monospace' \| 'cursive'` | Fallback font category |
| `variants` | `FontVariant[]?` | Available font weight/style variants with URLs |

#### CustomPropertyDefinition

Advanced custom property with multi-theme support using the CSS `@property` registration pattern.

| Field | Type | Description |
|-------|------|-------------|
| `syntax` | `CssSyntaxNode` | CSS syntax type (e.g., `<color>`, `<length>`) |
| `inherits` | `boolean` | Whether the property inherits through the DOM tree |
| `initialValue` | `string?` | Default fallback value |
| `description` | `string` | Human-readable description |
| `values` | `Record<string, string?>` | Per-theme values, keyed by theme name |

**Business Rules:**
- Themes are emitted as CSS custom properties on `:root` / `:host`
- Named themes are applied via `[data-nc-theme~="themeName"]` selector
- `defaultDark` and `defaultLight` are rendered inside `@media (prefers-color-scheme: ...)` blocks
- Tokens of type `'variable'` reference other tokens: rendered as `var(--referenced-name)`
- Font URLs from Google Fonts are rewritten to be served from `/.toddle/fonts/font/...` for self-hosting
- Font faces are generated as `@font-face` rules in a base CSS `@layer`
- The V2 theme coexists with legacy `OldTheme` (V1) — the system detects which is present by checking for the `breakpoints` field

---

### OldTheme (V1, Legacy)

The original theme format, identified by the presence of a `breakpoints` field.

| Field | Type | Description |
|-------|------|-------------|
| `spacing` | `number` | Base spacing unit in `rem` |
| `colors` | `Record<string, { order, variants: Record<string, { value, order }> }>` | Color palette with ordered variants |
| `fontFamily` | `Record<string, { value: string[], order, default? }>` | Font stacks |
| `fontWeight` | `Record<string, { value: string, order, default? }>` | Named font weights |
| `fontSize` | `Record<string, { value: string, order, default? }>` | Named font sizes |
| `shadow` | `Record<string, { value: string, order }>` | Box shadow presets |
| `breakpoints` | `Record<string, { value: number, order }>` | Responsive breakpoints (presence distinguishes V1 from V2) |

**Source:** `packages/core/src/styling/theme.ts:55-75`

---

## File Loading and Resolution

### FileGetter

The `FileGetter` function type is the standard interface for resolving individual project files by type and name:

```typescript
type FileGetter = (args: {
  package?: string    // Package name for package-scoped assets
  name: string        // Asset name
  type: keyof ProjectFiles  // 'components' | 'actions' | 'formulas' | 'routes' | 'themes' | 'services'
}) => Promise<Component | PluginAction | PluginFormula | Route | Theme | ApiService>
```

**Source:** `packages/ssr/src/ssr.types.ts:14-20`

### Route Splitting (Build-Time Processing)

At build time, the `splitRoutes` function (`packages/ssr/src/utils/routes.ts`) processes the full `ProjectFiles` into deployment-ready artifacts:

**Input:** `{ branchName, files: ProjectFiles, project: ToddleProject }`

**Output:**
| Field | Type | Description |
|-------|------|-------------|
| `project` | `{ project, config }` | Project metadata + config for runtime |
| `routes` | `{ pages, routes }` | Page route declarations + custom redirects/rewrites |
| `files` | `Record<string, ProjectFilesWithCustomCode>` | Per-page/component file bundles with tree-shaken dependencies |
| `styles` | `Record<string, string>` | Per-page generated CSS stylesheets |
| `code` | `Record<string, string>` | Per-page custom code bundles (only for pages/components with custom code) |

**Processing Steps:**
1. Iterate all components; skip any that are neither pages nor web components
2. For pages and web components, resolve the transitive component dependency tree (`takeIncludedComponents`)
3. Generate CSS stylesheets for each page/component
4. Detect and bundle custom code (code-based formulas and actions)
5. Filter installed packages to only include components used by each page
6. Strip test data from all components for production
7. Build the route index for the backend server to use for URL matching

**Business Rules:**
- Only `isToddleFormula` (declarative) formulas are included in SSR bundles; code-based formulas require client-side execution
- Package actions are excluded from SSR bundles entirely (`actions: {}`)
- Test data (`testValue` fields on attributes, formula arguments, etc.) is stripped for production

---

## Backend Server Integration

### HonoProject

The backend server holds project metadata in Hono context variables:

```typescript
interface HonoProject {
  project: ToddleProject
  config: ProjectFiles['config']
}
```

### HonoRoutes

Route index held in context for URL matching:

```typescript
interface HonoRoutes {
  routes: {
    pages: Record<string, { name: string; route: RouteDeclaration }>
    routes: Record<string, Route>
  }
}
```

**Source:** `packages/backend/hono.d.ts`

### PageLoader

The page loader abstraction allows different hosting environments (Cloudflare Workers, Bun, Node.js) to provide project files:

```typescript
type PageLoader = ({ name, ctx }) => MaybePromise<ProjectFilesWithCustomCode | undefined>
```

Where `ProjectFilesWithCustomCode` extends `ProjectFiles` with a `customCode: boolean` flag indicating whether the page requires a client-side custom code bundle.

**Source:** `packages/backend/src/loaders/types.d.ts`

---

## Component Key Resolution

Components are resolved through a namespace hierarchy:

1. **Project components:** `files.components[componentName]`
2. **Package components:** `files.packages[packageName].components[componentName]`
3. **Standard library:** Built-in formulas/actions from `@layr/std-lib` are resolved via the `toddle` global object

### Naming Conventions

| Scope | Key format | Example |
|-------|-----------|---------|
| Project component | `componentName` | `HomePage`, `test-component` |
| Package component (internal reference) | `packageName/componentName` | `best_like_button/best-like-button` |
| Standard library formula | `@toddle/formulaName` | `@toddle/concatenate` |
| Custom project formula | `formulaName` | `myCustomFormula` |
| Package formula | (resolved via package namespace) | `best_like_button/myFormula` |

---

## Edge Cases and Error Handling

### Missing Components
- `ProjectFiles.components` is `Partial<Record>`, so values can be `undefined`
- All consumers must null-check before accessing component data
- If a component node references a non-existent component (project or package), the SSR renderer and runtime should gracefully skip it

### Package Version Mismatches
- Packages are version-locked via the `commit` hash in their manifest
- If the installed package snapshot is outdated, components may reference non-existent attributes, formulas, or child components
- The search/linting system (`@layr/search`) detects these issues

### Theme Fallback Chain
1. V2 theme `propertyDefinitions[prop].values[themeName]`
2. V2 theme `propertyDefinitions[prop].initialValue`
3. Base CSS layer token values (color, font-size, etc.)
4. If no V2 theme exists, fall back to `config.theme` (V1 `OldTheme`)
5. If no theme at all, use `theme.const.ts` default theme

### Empty/Minimal Projects
- A valid project requires at minimum: `id`, `project`, `commit`, and `files.components` (can be empty `{}`)
- Projects with no pages have no routable URLs; the server returns 404 for all paths
- Projects with no themes use the built-in default theme from `packages/core/src/styling/theme.const.ts`

---

## External Dependencies

| Dependency | Used For |
|-----------|----------|
| Zod (`zod@4.2.1`) | Schema validation of project files (via `packages/core/src/component/schemas/`) |
| `fast-deep-equal` | Deep equality comparison for reactive change detection |

---

## Relationship to Other Specs

| Spec | Relationship |
|------|-------------|
| [Component System](./component-system.md) | Defines the `Component` type that populates `ProjectFiles.components` |
| [Formula System](./formula-system.md) | Defines the `Formula` type used throughout the project data model |
| [Action System](./action-system.md) | Defines `PluginAction` types stored in `ProjectFiles.actions` |
| [Styling and Theming](./styling-and-theming.md) | Defines theme rendering from `ProjectFiles.themes` |
| [Routing](./routing.md) | Defines URL matching using `ProjectFiles.routes` and page routes |
| [API Integration](./api-integration.md) | Defines API request types and service consumption |
| [Data Validation Schemas](./data-validation-schemas.md) | Zod schemas that validate this data model |
| [Backend Server](./backend-server.md) | Loads and serves the project data model |
| [SSR Pipeline](./ssr-pipeline.md) | Processes project files for server-side rendering |
| [Standard Library](./standard-library.md) | Provides built-in formulas/actions referenced by `@toddle/` prefix |
