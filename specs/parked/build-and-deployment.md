# Build & Deployment System Specification

## Purpose

The Build & Deployment System defines how Layr's monorepo is compiled, bundled, and deployed across multiple target runtimes. It covers the package build pipeline, client-side asset bundling, multi-runtime backend deployment (Cloudflare Workers, Node.js, Bun, Docker), release automation, and npm publishing.

### Jobs to Be Done

- Compile TypeScript source code across 7 monorepo packages in dependency order
- Bundle client-side runtime assets (page runtime, custom element runtime, web workers) for browser consumption
- Support three backend deployment targets: Cloudflare Workers, Node.js, and Bun
- Automate release creation, asset preparation, and npm publishing via CI/CD
- Generate per-page CSS stylesheets and custom code bundles at build time
- Convert project JSON data into ES modules for fast dynamic imports
- Enforce runtime file size limits and validate package integrity

---

## Monorepo Structure

### Workspace Configuration

**Root `package.json`:** Declares workspaces for all packages.

**`bunfig.toml`:**
```toml
[install]
saveTextLockfile = true
linker = "isolated"
```

- `isolated` linker: each package gets its own `node_modules`, preventing cross-contamination
- Text lockfile: human-readable `bun.lock` for version control

### Package Dependency Graph

```
@layr/core (no dependencies)
  ├── @layr/std-lib (depends on core)
  │   ├── @layr/ssr (depends on core, std-lib)
  │   │   └── @layr/search (depends on core, ssr)
  │   └── @layr/runtime (depends on core, std-lib)
  └── @layr/editor (depends on core)

layr-backend (depends on core, ssr — not published to npm)
```

Packages reference each other via `"workspace:*"` protocol in their `package.json` dependencies.

### Build Order

The root build script executes packages sequentially following the dependency graph:

```
core → lib → ssr → search → runtime
```

Each step uses `&&` chaining — a failure in any package stops the entire build. The backend and editor packages are excluded from the main build (built separately for deployment and release).

---

## Package Compilation

### TypeScript Compiler: tsgo

All packages use `tsgo` (TypeScript-to-Go compiler via `@typescript/native-preview`) for compilation.

**Per-package scripts:**
| Script | Command | Description |
|--------|---------|-------------|
| `build` | `tsgo` | Compile TypeScript to JavaScript + declarations |
| `typecheck` | `tsgo --noEmit` | Type-check only, no output |
| `watch` | `tsgo -w` | Watch mode for development |

**Standard `tsconfig.json` options across packages:**

| Option | Value | Rationale |
|--------|-------|-----------|
| `target` | `ESNext` | Modern JavaScript output |
| `module` | `ESNext` | ES module format |
| `moduleResolution` | `bundler` | Bundler-compatible resolution |
| `strict` | `true` | Full type safety |
| `declaration` | `true` | Generate `.d.ts` files |
| `sourceMap` | `true` | Debugging support |
| `outDir` | `dist` | Output directory |
| `lib` | `["DOM", "DOM.Iterable", "ESNext"]` | Browser + modern JS APIs |

**Output:** Each package produces `dist/` with `.js`, `.d.ts`, and `.js.map` files.

### Special Build: Runtime Package

The runtime package has a two-stage build:

1. **`tsgo`** — standard TypeScript compilation
2. **`bun scripts/build.js`** — esbuild bundling of client-side entry points

**esbuild configuration (`packages/runtime/scripts/build.js`):**

| Option | Value |
|--------|-------|
| `entryPoints` | `['src/page.main.ts', 'src/custom-element.main.ts']` |
| `bundle` | `true` |
| `sourcemap` | `true` |
| `minify` | `true` |
| `format` | `esm` |
| `entryNames` | `[dir]/[name].esm` |

**Output:** `dist/page.main.esm.js`, `dist/custom-element.main.esm.js` — browser-ready ESM bundles.

### Special Build: Standard Library Package

The standard library has a multi-step build:

1. **`bun ./bin/generate.js`** — scans `formulas/` and `actions/` directories, generates TypeScript export files and `dist/lib.ts` with JSON metadata for all built-in formulas and actions
2. **`tsgo --project tsconfig.build.json`** — compiles with special config using `moduleResolution: "node"` for npm compatibility

**Validation:** `packages/lib/bin/validate.ts` validates all `action.json` and `formula.json` files against their schemas.

### Special Build: Editor Package

The editor package generates metadata from web standards specifications:

1. **`buildElements.ts`** — generates per-element JSON files in `elements/html/` and `elements/svg/` from `@webref/elements`, MDN data, and interface definitions
2. **`combineElements.ts`** — merges individual element files into a single `elements.json`
3. **CSS property keywords** extracted from `mdn-data` and `css-tree`

---

## Release Asset Preparation

### Entry Point

`bin/prepareReleaseAssets.ts` — executed by CI during releases.

### Bundle Outputs

| Bundle | Entry Points | Format | Output |
|--------|-------------|--------|--------|
| Web Workers | `components.ts`, `problems.worker.ts`, `search.worker.ts` | IIFE (default) | `dist/*.js` |
| ESM Runtime | `page.main.ts`, `editor-preview.main.ts`, `custom-element.main.ts`, `ToddleComponent.ts`, `ToddleFormula.ts`, `api.ts` | ESM | `dist/*.esm.js` |
| Backend (main) | `backend/src/index.ts` | ESM, platform: node | `dist/backend.js` |
| Backend (preview) | `backend/src/preview.index.ts` | ESM, platform: node | `dist/preview.backend.js` |
| CSS Reset | Generated from `RESET_STYLES` constant | CSS | `dist/reset.css` |

**esbuild settings for all bundles:**

| Option | Value |
|--------|-------|
| `bundle` | `true` |
| `sourcemap` | `true` |
| `minify` | `true` |
| `write` | `true` |
| `allowOverwrite` | `true` |

### Static Assets

In addition to bundles, the release includes:
- `interfaces.json` — HTML element interface definitions (from editor package)
- `elements.json` — combined HTML/SVG element metadata
- `css-property-keywords.json` — CSS autocomplete data

---

## Backend Deployment

### Architecture

The backend uses Hono as a platform-agnostic web framework. A single `getApp()` factory function creates the application, parameterized by platform-specific adapters:

```typescript
getApp<T>({
  getConnInfo: GetConnInfo,           // Platform-specific connection info
  staticRouter?: { path, handler },   // Static file serving (Node/Bun only)
  stylesheetRouter?: { path, handler },
  customCodeRouter?: { path, handler },
  pageLoader: { loader, urls },       // Page file resolution
  fileLoaders: MiddlewareHandler[],   // Project/route loading middleware
  earlyMiddleware?: MiddlewareHandler[],
})
```

### Deployment Target: Cloudflare Workers

**Build pipeline:**

1. `syncStaticAssets.ts` processes `__project__/project.json`:
   - Calls `splitRoutes()` to extract routes, per-page file bundles, stylesheets, custom code
   - Copies runtime bundles from `@layr/runtime/dist`
   - Generates per-component CSS files
   - Generates per-component custom code JS files
   - Converts project data to ES modules via `export default JSON.stringify(data)`

2. `esbuild` bundles `src/index.ts` → `dist/index.js`

3. `wrangler deploy` publishes to Cloudflare

**Wrangler configuration (`wrangler.toml`):**

| Field | Value | Description |
|-------|-------|-------------|
| `main` | `dist/index.js` | Worker entry point |
| `compatibility_date` | `2025-09-13` | Workers runtime version |
| `rules` | `[{ type: "ESModule", globs: ["**/*.js"] }]` | Treat JS as ES modules |
| `[assets].directory` | `./dist/assets` | Static asset directory |

**File loading:** Uses dynamic `import()` to load ES module files from `./components/{name}.js`. Files are cached in-memory after first load.

**Static asset URLs:**
- Stylesheets: `/_static/{componentName}.css`
- Custom code: `/_static/cc_{componentName}.js`
- Runtime: `/_static/page.main.esm.js`

### Deployment Target: Node.js

**Build:** `bun build --minify --target=node ./src/node.index.ts --outdir dist/`

**Entry point (`src/node.index.ts`):**
- Uses `@hono/node-server` for HTTP serving
- Uses `hono/node-server/serve-static` for static files at `/_static/*`
- Same page loader pattern as Cloudflare but with filesystem-based loading

### Deployment Target: Bun

**Entry point (`src/bun.index.ts`):**
- Uses `hono/bun` for `getConnInfo` and `serveStatic`
- Adds `hono/compress` middleware for response compression
- Same page loader pattern

### Deployment Target: Docker

**Multi-stage Dockerfile:**

| Stage | Base Image | Purpose |
|-------|-----------|---------|
| Build | `oven/bun:1.3.3-debian` | Install deps, compile to standalone executable |
| Run | `gcr.io/distroless/base-debian12` | Minimal production image |

**Build stage:**
1. Copy `package.json` files and install production dependencies
2. Copy source code
3. `bun build --compile --minify --sourcemap` → standalone `layr-backend` executable

**Run stage:**
1. Copy compiled executable and `dist/` assets
2. Expose `APP_PORT` (default: 3000)
3. `ENTRYPOINT ["./layr-backend"]`

**Key properties:**
- Standalone executable includes Bun runtime — no runtime installation needed
- Distroless base image minimizes attack surface
- `NODE_ENV=production` set at image level

### Preview Environment

**Entry point (`src/preview.index.ts`):**
- Cloudflare Workers with Durable Objects
- Uses `BRANCH_STATE` Durable Object for branch-specific project data
- Bindings: `PROJECT_SHORT_ID`, `BRANCH_NAME`
- Supports live preview of in-progress changes

---

## Static Asset Pipeline

### syncStaticAssets.ts

Transforms project JSON into deployment-ready assets:

**Input:** `__project__/project.json`

**Processing:**
1. Parse project JSON and call `splitRoutes()` (from `@layr/ssr`)
2. Copy runtime bundles from `@layr/runtime/dist` to `dist/assets/_static/`
3. Write per-component CSS: `dist/assets/_static/{name}.css`
4. Write per-component custom code: `dist/assets/_static/cc_{name}.js`
5. Convert to ES modules:
   - `dist/project.js` — project metadata + config
   - `dist/routes.js` — route declarations
   - `dist/components/{name}.js` — per-component file bundles (lowercase names)

**ES Module format:** `export default {JSON data}`

**Business Rules:**
- Component names are lowercased for filesystem compatibility
- Only pages and web components produce output files (regular components are inlined into their parent page's bundle)
- ES modules are used over raw JSON for faster V8 parsing via dynamic `import()`
- Files are cached in-memory by `loadJsFile()` after first load

### Output Directory Structure

```
dist/
├── assets/
│   └── _static/
│       ├── page.main.esm.js          # Client-side page runtime
│       ├── page.main.esm.js.map
│       ├── custom-element.main.esm.js # Web Component runtime
│       ├── reset.css                  # Global reset + theme CSS
│       ├── {component}.css            # Per-page/component styles
│       └── cc_{component}.js          # Per-page custom code (if any)
├── components/
│   └── {component}.js                 # ES module with component data
├── project.js                         # ES module with project config
├── routes.js                          # ES module with route declarations
└── index.js                           # Backend entry point (Workers)
```

---

## CI/CD Pipeline

### Test Workflow (`.github/workflows/test.yml`)

**Triggers:** All pushes except `main` branch, ignoring `.vscode/` and `README.md` changes.

**Steps:**
1. Checkout and setup Bun (v1.3.3)
2. Install dependencies (`bun install --frozen-lockfile`)
3. Lint (`bun run lint`)
4. Type-check all packages (`bun run typecheck`)
5. Run tests (`bun test`)
6. Build all packages (`bun run build`)
7. **Runtime file size check:** `page.main.esm.js` must be ≤ 120KB (122,880 bytes)

### Release Workflow (`.github/workflows/main.yml`)

**Trigger:** Push to `main` branch.

**Job 1: Version Check**
1. Compare `package.json` version with previous commit
2. If version changed, output the new version number
3. Trigger downstream jobs

**Job 2: Create Release (`.github/workflows/create_release.yml`)**
1. Create GitHub release with auto-generated release notes via `gh api`
2. Build all packages (`bun run build`)
3. Prepare release assets (`bun bin/prepareReleaseAssets.ts`)
4. Upload `dist/*` to GitHub release
5. Send release announcement webhook (`bun bin/sendReleaseAnnouncement.ts`)

**Job 3: Publish to npm (`.github/workflows/deploy_to_npm.yml`)**
1. Inject version number into each package's `package.json`
2. Build each package
3. Create tarballs via `bun pm pack`
4. Switch to Node.js (required for npm trusted publishing with OIDC)
5. `npm publish --access public` for each package

### Published npm Packages

| Package | npm Name |
|---------|----------|
| core | `@layr/core` |
| lib | `@layr/std-lib` |
| ssr | `@layr/ssr` |
| search | `@layr/search` |
| runtime | `@layr/runtime` |

**Not published:** `layr-backend` (deployed directly), `@layr/editor` (consumed internally).

### Release Announcement

`bin/sendReleaseAnnouncement.ts`:
1. Fetches release notes from GitHub API
2. Posts formatted announcement to webhook URL (`MAKE_WEBHOOK_URL` environment variable)

---

## Build Tool Versions

| Tool | Version | Purpose |
|------|---------|---------|
| Bun | 1.3.3 | Package manager, runtime, test runner |
| esbuild | 0.27.2 | Client-side bundling |
| tsgo | `@typescript/native-preview@7.0.0-dev.20251208.1` | TypeScript compilation |
| wrangler | (from npm) | Cloudflare Workers deployment |

---

## Quality Gates

| Check | Enforced In | Threshold |
|-------|-------------|-----------|
| TypeScript strict mode | `tsconfig.json` | All packages |
| ESLint | CI test workflow | Zero errors |
| Runtime bundle size | CI test workflow | ≤ 120KB for `page.main.esm.js` |
| Frozen lockfile | CI install step | `--frozen-lockfile` |
| Schema validation | `packages/lib/bin/validate.ts` | All formula/action JSON files |

---

## Relationship to Other Specs

| Spec | Relationship |
|------|-------------|
| [Project Data Model](./project-data-model.md) | Defines the JSON structure processed by `splitRoutes()` and `syncStaticAssets` |
| [Backend Server](./backend-server.md) | The application created by `getApp()` and served by each deployment target |
| [SSR Pipeline](./ssr-pipeline.md) | `splitRoutes()` generates per-page bundles consumed by SSR |
| [Styling and Theming](./styling-and-theming.md) | Per-component CSS generated during asset sync |
| [Custom Code System](./custom-code-system.md) | Custom code bundles generated during asset sync |
| [Standard Library](./standard-library.md) | Built via generate.js + validate.ts |
| [Element Definitions](./element-definitions.md) | Editor metadata generated during release |

---

## System Limits

### Build Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxBuildTime` | 5 minutes | Maximum build duration |
| `maxBundleSize` | 5 MB | Maximum bundle size |
| `maxAssetSize` | 10 MB | Maximum static asset size |
| `maxRoutes` | 500 | Maximum routes per build |

### Deployment Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxConcurrentDeploys` | 5 | Concurrent deployments |
| `maxDeployRetries` | 3 | Deployment retry attempts |
| `deployTimeout` | 10 minutes | Deployment timeout |

### Enforcement

- **Build time:** Cancel with timeout error
- **Bundle size:** Warn in CI, continue
- **Deploy timeout:** Rollback to previous version

---

## Invariants

### Build Invariants

1. **I-BLD-REPRODUCIBLE:** Same input MUST produce same output.
2. **I-BLD-FROZEN-LOCKFILE:** Lockfile MUST NOT change during build.
3. **I-BLD-SCHEMA-VALID:** All files MUST pass schema validation.

### Deployment Invariants

4. **I-DEPLOY-VERSION-UNIQUE:** Each deploy MUST have unique version.
5. **I-DEPLOY-ROLLBACK-CAPABLE:** Previous version MUST be restorable.
6. **I-DEPLOY-HEALTH-CHECK:** Deployment MUST pass health check.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-BLD-REPRODUCIBLE | CI | Build failure |
| I-BLD-FROZEN-LOCKFILE | CI | Install failure |
| I-DEPLOY-HEALTH-CHECK | Post-deploy | Automatic rollback |

---

## Error Handling

### Build Errors

| Error Type | When | Recovery |
|------------|------|----------|
| `BuildTimeoutError` | Build exceeds limit | Cancel, log |
| `SchemaValidationError` | File fails validation | List errors, fail |
| `BundleSizeError` | Bundle too large | Warn, continue |

### Deployment Errors

| Error Type | When | Recovery |
|------------|------|----------|
| `DeployTimeoutError` | Deploy exceeds limit | Rollback |
| `HealthCheckError` | Health check fails | Rollback |
| `RollbackError` | Rollback fails | Alert, manual |

---

## Changelog

### Unreleased
- Added System Limits section with build and deployment limits
- Added Invariants section with 6 build and deployment invariants
- Added Error Handling section with build and deployment errors
