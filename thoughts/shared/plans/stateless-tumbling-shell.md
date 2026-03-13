# Plan: Create `layr.yaml` Config File

## Context

Ports 3000 and 5173 are hardcoded across the project (server.ts, vite.config.ts, dev command, docs). A single `layr.yaml` at the root becomes the source of truth for port config, eliminating scattered magic numbers.

## Files

### Create

| File | Purpose |
|------|---------|
| `layr.yaml` | Port config (backend, editor, preview) |
| `config.ts` | Typed config loader (reads + parses YAML) |

### Modify

| File | Change |
|------|--------|
| `package.json` | Add `yaml` devDependency |
| `packages/backend/src/server.ts:54` | Read port from config instead of hardcoded 3000 |
| `packages/editor/vite.config.ts:13,19-20` | Read ports from config instead of hardcoded 5173/3000 |
| `.claude/commands/dev.md` | Reference `layr.yaml` as source of truth for ports |

### Docs (update port references)

| File | Lines |
|------|-------|
| `specs/README.md:122,126` | Port references in quick start |
| `specs/31-dev-workflow.md:32,48-49` | Port references |
| `specs/32-backend-server.md:41,445` | Port config |

## Implementation

### 1. `layr.yaml`

```yaml
ports:
  backend: 3000
  editor: 5173
  preview: 54404
```

### 2. `config.ts` (root)

```typescript
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { join } from 'path';

export interface LayrConfig {
  ports: {
    backend: number;
    editor: number;
    preview: number;
  };
}

const configPath = join(import.meta.dir, 'layr.yaml');
const raw = readFileSync(configPath, 'utf8');
export const config: LayrConfig = parse(raw);
```

### 3. Backend server.ts

```typescript
import { config } from '../../../config';
const port = Number(process.env.PORT) || config.ports.backend;
```

### 4. Editor vite.config.ts

```typescript
import { config } from '../../config';

export default defineConfig({
  server: {
    port: config.ports.editor,
    proxy: {
      '/api': `http://localhost:${config.ports.backend}`,
      '/health': `http://localhost:${config.ports.backend}`,
    },
  },
});
```

### 5. Dev command

Update `.claude/commands/dev.md` to note that ports come from `layr.yaml` instead of listing hardcoded values.

## Not changing

- `packages/runtime/src/navigation/index.ts` (port 54404) — this is a preview localhost validation constant, not a server binding. Could reference config but it's deep in runtime code used at client-side where file reads aren't possible. Leave as-is.
- Test files with hardcoded ports — test assertions reference specific expected values, not runtime config.

## Verification

```bash
# 1. Install yaml package
bun install

# 2. Run tests to confirm nothing broke
bun test

# 3. Start dev and verify ports match config
bun run dev
# Backend should log: "Server starting on http://localhost:3000"
# Editor should be on http://localhost:5173
```
