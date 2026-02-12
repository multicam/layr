# Development Workflow Specification

## Purpose

Defines the development experience: running locally, hot reload, testing, and iterative feature development.

---

## Prerequisites

- **Bun** >= 1.0.0
- **Node.js** >= 20 (optional, for tooling)
- **TypeScript** >= 5.0

---

## Quick Start

```bash
# Install dependencies
bun install

# Start development server (backend + editor)
bun run dev

# Run tests
bun test

# Build for production
bun run build
```

---

## Development Server

### Command: `bun run dev`

Starts:
1. **Backend server** on `http://localhost:3000`
2. **Editor** on `http://localhost:3000/editor`
3. **Preview iframe** served from same origin

### Hot Reload

| File Changed | Behavior |
|--------------|----------|
| `packages/core/**/*.ts` | Restart backend, reload preview |
| `packages/runtime/**/*.ts` | Reload preview only |
| `packages/ssr/**/*.ts` | Restart backend |
| `packages/backend/**/*.ts` | Restart backend |
| `packages/editor/**/*.tsx` | HMR in editor |
| `projects/**/*.json` | Reload preview |

### Watch Mode Implementation

```typescript
// packages/backend/src/dev.ts
import { watch } from 'fs';
import { spawn } from 'child_process';

let server = startServer();

watch('packages/core/src', { recursive: true }, () => {
  server.kill();
  server = startServer();
});

watch('projects', { recursive: true }, () => {
  // Signal preview to reload via WebSocket
  broadcast({ type: 'reload' });
});
```

---

## Testing Strategy

### Unit Tests

**Location:** `packages/*/src/**/*.test.ts`

**Framework:** Bun test

```typescript
// packages/core/src/signal.test.ts
import { test, expect } from 'bun:test';
import { Signal } from './signal';

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

**Run:** `bun test` or `bun test packages/core`

### Integration Tests

**Location:** `tests/integration/**/*.test.ts`

```typescript
// tests/integration/rendering.test.ts
import { test, expect } from 'bun:test';
import { renderComponent } from '@layr/runtime';
import { Component } from '@layr/core';

test('renders text node', () => {
  const component: Component = {
    name: 'Test',
    nodes: {
      root: { type: 'text', value: { type: 'value', value: 'Hello' } }
    }
  };
  const elements = renderComponent(component, createContext());
  expect(elements[0].textContent).toBe('Hello');
});
```

### Component Test Harness

**Location:** `packages/test-harness/`

Provides isolated preview for testing components:

```typescript
// packages/test-harness/src/preview.ts
export function previewComponent(component: Component, attrs: Record<string, any>) {
  const container = document.createElement('div');
  const ctx = createTestContext({ Attributes: attrs });
  const elements = renderComponent(component, ctx);
  container.append(...elements);
  return container;
}
```

**Usage:**
```typescript
import { previewComponent } from '@layr/test-harness';
import { Button } from './Button';

const preview = previewComponent(Button, { label: 'Click me' });
document.body.appendChild(preview);
```

---

## Debugging

### VS Code / PhpStorm Launch Config

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "bun",
      "runtimeArgs": ["run", "packages/backend/src/index.ts"],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

### Browser DevTools

- Editor: React DevTools
- Preview: Standard Chrome DevTools
- Signals: `window.__toddle` inspection

### Logging

```typescript
// Enable debug logging
process.env.DEBUG = 'layr:*';

// In packages/core/src/signal.ts
if (process.env.DEBUG?.includes('layr:signal')) {
  console.log(`[signal] set(${value})`);
}
```

---

## File Watching Details

### Backend Restart Triggers

| Path Pattern | Action |
|--------------|--------|
| `packages/core/**/*.ts` | Full restart |
| `packages/ssr/**/*.ts` | Full restart |
| `packages/backend/**/*.ts` | Full restart |
| `packages/lib/**/*.ts` | Full restart |

### Preview Reload Triggers

| Path Pattern | Action |
|--------------|--------|
| `packages/runtime/**/*.ts` | Full page reload |
| `projects/**/*.json` | Full page reload |
| `packages/core/**/*.ts` | Full page reload |

### Editor HMR Triggers

| Path Pattern | Action |
|--------------|--------|
| `packages/editor/**/*.tsx` | React HMR |
| `packages/editor/**/*.css` | Style injection |

---

## Project Creation

### New Project

```bash
bun run create-project my-app
```

Creates:
```
/projects/my-app/
├── project.json    # Empty project
└── .toddle/
    └── .gitkeep
```

### project.json Template

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

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Backend cold start | < 500ms |
| Hot reload | < 100ms |
| Test suite (unit) | < 5s |
| Test suite (full) | < 30s |
| Build (all packages) | < 10s |

---

## CI/CD (Local)

Run before commits:

```bash
bun run precommit
```

Which runs:
```bash
bun test
bun run build
bun run lint
```

---

## Changelog

### Unreleased
- Initial specification
