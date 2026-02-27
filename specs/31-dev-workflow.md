# Development Workflow and Test Harness

Development loop, hot reload behavior, test runner configuration, and the `@layr/test-harness` API for component-level testing.

**Implementing packages:** `@layr/backend`, `@layr/editor`, `@layr/test-harness`, root workspace

---

## Phase Summary

| Feature | Phase |
|---------|-------|
| `bun run dev` (backend + editor) | MVP |
| `bun --watch` hot reload for backend | MVP |
| Vite HMR for editor | MVP |
| `bun test` across all packages | MVP |
| `@layr/test-harness` preview/mock API | MVP |
| 1325+ tests, ~95% coverage | MVP |
| `happy-dom` as DOM environment | MVP |
| VS Code launch configs | MVP |
| `bun run precommit` gate | Phase 2 |
| Visual regression tests | Phase 2 |
| E2E tests (Playwright) | Phase 2 |

---

## Quick Start

```bash
bun install                # Install all workspace dependencies
bun run dev                # Start backend + editor in parallel
bun run dev:backend        # Backend only (port 3000)
bun run dev:editor         # Editor only (Vite dev server)
bun test                   # Run all tests
bun run build              # Build all packages
```

---

## Development Server

### `bun run dev`

Runs two processes in parallel (using `&`):

| Process | Command | Default Port |
|---------|---------|-------------|
| Backend | `bun --watch src/server.ts` | 3000 |
| Editor | `vite` | 5173 |

### Backend Watch Mode

`bun --watch` restarts the backend process whenever any TypeScript source file in `packages/backend/src/` changes. The restart is handled by Bun's built-in file watcher — no custom watcher code is required.

Watched paths that trigger backend restart:

| Path Pattern | Action |
|-------------|--------|
| `packages/backend/src/**/*.ts` | Full restart |
| `packages/core/src/**/*.ts` | Full restart (via workspace resolution) |
| `packages/ssr/src/**/*.ts` | Full restart |
| `packages/lib/src/**/*.ts` | Full restart |

### Editor HMR

Vite provides React Fast Refresh for the editor. Changes to `packages/editor/src/**/*.tsx` update in-browser without full reload.

| Path Pattern | Action |
|-------------|--------|
| `packages/editor/src/**/*.tsx` | React HMR |
| `packages/editor/src/**/*.css` | Style injection |

### Preview Reload

When `projects/**/*.json` changes (project data edited), the preview iframe reloads automatically. The backend serves the updated project on the next request without restart because `loadProject()` reads from disk on each request (no server-side project caching in MVP).

---

## Testing

### Test Runner

Bun's built-in test runner. No configuration file required — Bun discovers `*.test.ts` files automatically.

```bash
bun test                          # All tests
bun test packages/core            # Single package
bun test packages/backend         # Backend tests only
bun test --watch                  # Watch mode
```

### DOM Environment

Tests requiring DOM APIs use `happy-dom` (declared in root `devDependencies`). The `packages/backend/src/index.test.ts` file covers HTTP server integration tests.

### Test File Conventions

| Pattern | Type | Example |
|---------|------|---------|
| `packages/*/src/**/*.test.ts` | Unit | `packages/core/src/signal.test.ts` |
| `packages/backend/src/index.test.ts` | Integration | HTTP endpoint tests |

### Test Coverage

1325+ tests passing, ~95% coverage across core logic packages.

### Example: Unit Test

```typescript
import { test, expect } from 'bun:test';
import { Signal } from '@layr/core';

test('signal get returns initial value', () => {
  const sig = new Signal(42);
  expect(sig.get()).toBe(42);
});

test('signal set notifies subscribers', () => {
  const sig = new Signal(0);
  let called = false;
  sig.subscribe(() => { called = true; });
  sig.set(1);
  expect(called).toBe(true);
});
```

### Example: Integration Test

```typescript
import { test, expect } from 'bun:test';
import app from './server';

test('GET /health returns ok', async () => {
  const res = await app.fetch(new Request('http://localhost/health'));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
});
```

---

## Test Harness (`@layr/test-harness`)

Provides isolated component rendering and assertion utilities. Located in `packages/test-harness/`.

### Quick Start

```typescript
import { preview, mockApi, mockContext } from '@layr/test-harness';
import { Button } from './components/Button';

const view = preview(Button, { label: 'Click' });

expect(view.text()).toBe('Click');
expect(view.find('button').hasClass('primary')).toBe(true);

view.click('button');
expect(view.emitted('click')).toHaveLength(1);
view.unmount();
```

### `preview(component, attributes?)`

Renders a component in an isolated DOM container.

```typescript
function preview(
  component: Component,
  attributes?: Record<string, unknown>
): PreviewResult
```

### `PreviewResult`

```typescript
interface PreviewResult {
  // DOM queries
  find(selector: string): Element;
  findAll(selector: string): Element[];
  text(): string;
  html(): string;

  // Interactions
  click(selector: string): void;
  type(selector: string, text: string): void;
  focus(selector: string): void;
  blur(selector: string): void;

  // Emitted events
  emitted(eventName: string): unknown[];

  // Reactive state inspection
  signal(name: string): Signal<unknown>;
  variable(name: string): unknown;
  api(name: string): ApiStatus;

  // Cleanup
  unmount(): void;
}
```

### Mocking Utilities

| Function | Signature | Purpose |
|----------|-----------|---------|
| `mockApi` | `(name, response)` | Override API response |
| `mockContext` | `(provider, formulas)` | Override context provider values |
| `mockFormula` | `(name, handler)` | Override a formula's implementation |

```typescript
mockApi('fetchUsers', {
  data: [{ id: 1, name: 'Alice' }],
  isLoading: false,
  error: null,
});

mockContext('AuthProvider', {
  user: { id: 1, name: 'Alice' },
  isAuthenticated: true,
});

mockFormula('now', () => new Date('2025-01-01'));
```

### Async Utilities

```typescript
// Wait for condition
await waitFor(() => view.find('.loaded'), { timeout: 1000 });

// Wait for API to settle
await waitForApi('fetchData', 'success');
```

### Common Test Patterns

```typescript
// Conditional rendering
test('shows loading state', () => {
  mockApi('fetchData', { isLoading: true });
  const view = preview(DataList);
  expect(view.find('.loading')).toBeDefined();
  view.unmount();
});

// Event emission
test('emits click event', () => {
  const view = preview(Button, { label: 'Click' });
  view.click('button');
  expect(view.emitted('click')).toEqual([{ value: true }]);
  view.unmount();
});

// Variable mutation
test('toggles visibility', () => {
  const view = preview(Collapsible);
  expect(view.find('.content')).toBeNull();
  view.click('.toggle');
  expect(view.find('.content')).toBeDefined();
  view.unmount();
});

// Snapshot
test('matches snapshot', () => {
  const view = preview(Card, { title: 'Hello' });
  expect(view.html()).toMatchSnapshot();
  view.unmount();
});
```

---

## Debugging

### VS Code Launch Config

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "bun",
      "runtimeArgs": ["run", "packages/backend/src/server.ts"],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

### Browser DevTools

| Context | Tool |
|---------|------|
| Editor | React DevTools |
| Preview iframe | Chrome DevTools |
| Signal inspection | `window.__toddle` (runtime global) |

### Debug Logging

```typescript
// Enable debug output
process.env.DEBUG = 'layr:*';
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Backend cold start | < 500ms |
| Backend hot reload | < 200ms (bun --watch restart) |
| Test suite (all) | < 30s |
| Editor HMR | < 100ms |
| Build (all packages) | < 60s |

---

## Project Creation

```bash
# Manually create a project directory
mkdir -p projects/my-app
```

Minimal `project.json`:

```json
{
  "id": "uuid-here",
  "project": {
    "id": "uuid-here",
    "name": "my-app",
    "type": "app",
    "short_id": "my_app"
  },
  "commit": "initial",
  "files": {
    "components": {},
    "config": { "theme": {} }
  }
}
```

The backend's `listProjects()` discovers it automatically on the next request.
