# Themes

Five built-in themes with light and dark variants for Layr projects. Themes are CSS custom property collections applied via `data-nc-theme` attribute. Selected in the editor; persisted via cookie.

**Packages:** `@layr/themes`, `@layr/types`

---

## Phase Summary

| Feature | Phase | Status |
|---------|-------|--------|
| 5 built-in themes (minimal, brutalism, neobrutalism, terminal, notion) | MVP | Implemented |
| Light + dark variants per theme | MVP | Implemented |
| `Theme` / `ThemeDefinition` interfaces | MVP | Implemented |
| `[data-nc-theme]` CSS selector application | MVP | Implemented |
| `prefers-color-scheme` auto-switching | MVP | Implemented |
| Theme selector in editor | MVP | Implemented |
| Cookie persistence (`nc-theme`) | MVP | Implemented |
| Theme preview colors (`getThemePreviewColors`) | MVP | Implemented |

---

## Interfaces

```typescript
// packages/types/src/theme.ts

interface Theme {
  name: string
  isDefault?: boolean
  propertyDefinitions: Record<string, ThemePropertyDefinition>
}

interface ThemePropertyDefinition {
  type: 'color' | 'string' | 'number'
  value: string
  description?: string
}

interface ThemeDefinition {
  id: string
  displayName: string
  description: string
  default: string           // variant name used when no preference
  defaultDark?: string      // variant for prefers-color-scheme: dark
  defaultLight?: string     // variant for prefers-color-scheme: light
  themes: Record<string, Theme>
}

interface ProjectThemeConfig {
  themeId: string                        // 'minimal' | 'brutalism' | ...
  activeVariant: 'light' | 'dark' | string
  followSystem?: boolean
}
```

---

## Theme Application

| Mechanism | Selector |
|-----------|---------|
| Default variant | `:root, :host` |
| Named variant | `[data-nc-theme~="minimal-dark"]` |
| Auto dark mode | `@media (prefers-color-scheme: dark)` |
| Auto light mode | `@media (prefers-color-scheme: light)` |

Theme name is stored in the `nc-theme` cookie and set as `data-nc-theme` on `<html>`.

---

## Common Properties

All themes define these CSS custom properties:

| Property | Type | Description |
|----------|------|-------------|
| `--background` | color | Page/surface background |
| `--foreground` | color | Primary text color |
| `--muted` | color | Subdued text, secondary content |
| `--accent` | color | Interactive / highlight color |
| `--border` | color | Default border color |
| `--card` | color | Card / panel background |
| `--font-sans` | string | Sans-serif font stack |
| `--font-mono` | string | Monospace font stack |
| `--font-size-base` | string | Body font size |
| `--font-weight-normal` | string | Normal weight value |
| `--font-weight-medium` | string | Medium weight value |
| `--font-weight-bold` | string | Bold weight value |
| `--line-height` | string | Default line height |
| `--spacing-unit` | string | Base spacing unit (4px) |
| `--radius` | string | Default border radius |
| `--shadow` | string | Default box shadow |

---

## Built-in Themes

### 1. Minimal (`id: 'minimal'`)

Clean, comfortable reading experience. Default for new projects.

| Property | Light | Dark |
|----------|-------|------|
| `--background` | `#ffffff` | `#0a0a0a` |
| `--foreground` | `#171717` | `#fafafa` |
| `--muted` | `#737373` | `#a3a3a3` |
| `--accent` | `#2563eb` | `#3b82f6` |
| `--border` | `#e5e5e5` | `#262626` |
| `--card` | `#fafafa` | `#171717` |
| `--font-sans` | Inter, system-ui, sans-serif | same |
| `--radius` | `8px` | same |
| `--shadow` | Soft drop shadow | Soft dark shadow |

```typescript
export const minimalTheme = {
  id: 'minimal',
  default: 'minimal-light',
  defaultDark: 'minimal-dark',
  defaultLight: 'minimal-light',
  themes: { 'minimal-light': minimalLight, 'minimal-dark': minimalDark },
}
```

---

### 2. Brutalism (`id: 'brutalism'`)

Bold, monochromatic with thick borders and raw aesthetics.

| Property | Light | Dark |
|----------|-------|------|
| `--background` | `#ffffff` | `#000000` |
| `--foreground` | `#000000` | `#ffffff` |
| `--muted` | `#666666` | `#999999` |
| `--accent` | `#000000` | `#ffffff` |
| `--border` | `#000000` | `#ffffff` |
| `--card` | `#ffffff` | `#000000` |
| `--font-sans` | Monospace stack | same |
| `--border-width` | `3px` | `3px` |
| `--radius` | `0px` | `0px` |
| `--shadow` | Hard offset (`4px 4px 0 black`) | Hard offset (`4px 4px 0 white`) |

Notable: `--font-sans` uses the monospace stack. `--font-weight-medium` is remapped to bold.

---

### 3. Neobrutalism (`id: 'neobrutalism'`)

Vibrant, colorful with bold borders and playful energy.

| Property | Light | Dark |
|----------|-------|------|
| `--background` | `#fef08a` (yellow) | `#1c1917` |
| `--foreground` | `#1c1917` | `#fef08a` |
| `--muted` | `#78716c` | `#a8a29e` |
| `--accent` | `#f43f5e` (rose) | `#fb7185` |
| `--secondary` | `#22c55e` (green) | `#4ade80` |
| `--border` | `#1c1917` | `#fef08a` |
| `--card` | `#ffffff` | `#292524` |
| `--border-width` | `2px` | `2px` |
| `--radius` | `0px` | `0px` |
| `--shadow` | Colored offset (black) | Colored offset (white) |

Notable: adds `--secondary` property not present in other themes. `--font-weight-medium` remapped to bold.

---

### 4. Terminal (`id: 'terminal'`)

Retro CLI-inspired with monospace aesthetics. Default variant is dark.

| Property | Light | Dark |
|----------|-------|------|
| `--background` | `#f0f0f0` | `#0c0c0c` |
| `--foreground` | `#0c0c0c` | `#00ff00` |
| `--muted` | `#666666` | `#008800` |
| `--accent` | `#008800` | `#00ff00` |
| `--border` | `#0c0c0c` | `#00ff00` |
| `--card` | `#e0e0e0` | `#1a1a1a` |
| `--font-sans` | Monospace stack | same |
| `--font-size-base` | `14px` (sm) | `14px` (sm) |
| `--radius` | `0px` | `0px` |
| `--shadow` | `none` | `none` |
| `--cursor-color` | `#008800` | `#00ff00` |

Notable: `default` is `terminal-dark` (inverted from other themes). Adds `--cursor-color` property. No shadows.

```typescript
export const terminalTheme = {
  id: 'terminal',
  default: 'terminal-dark',   // dark is the default
  defaultDark: 'terminal-dark',
  defaultLight: 'terminal-light',
  ...
}
```

---

### 5. Notion (`id: 'notion'`)

Clean, inspired by Notion with subtle borders and layered shadows.

| Property | Light | Dark |
|----------|-------|------|
| `--background` | `#ffffff` | `#191919` |
| `--foreground` | `#37352f` | `#e6e6e6` |
| `--muted` | `#787774` | `#9b9a97` |
| `--accent` | `#2383e2` | `#529cca` |
| `--border` | `#e9e9e7` | `#373737` |
| `--card` | `#f7f6f3` | `#2f2f2f` |
| `--font-sans` | Notion stack (`-apple-system, BlinkMacSystemFont, Inter, ...`) | same |
| `--radius` | `4px` | `4px` |
| `--shadow` | Very subtle, layered | Soft dark |

Notable: uses `fontFamilies.notion` which is a dedicated system-font-first stack.

---

## Package Structure

```
packages/themes/src/
├── index.ts           # ThemeDefinition[], themeMap, getAllThemes()
├── minimal.ts         # minimalLight, minimalDark, minimalTheme
├── brutalism.ts       # brutalismLight, brutalismDark, brutalismTheme
├── neobrutalism.ts    # neobrutalismLight, neobrutalismDark, neobrutalismTheme
├── terminal.ts        # terminalLight, terminalDark, terminalTheme
├── notion.ts          # notionLight, notionDark, notionTheme
└── tokens/            # Shared color, font, spacing, radius, shadow tokens
```

---

## Theme Registry API

```typescript
// packages/themes/src/index.ts

// Ordered list for UI display
export const themeDefinitions: ThemeDefinition[]  // order: 0–4

// Fast lookup
export const themeMap: Record<string, ThemeDefinition>

// Preview colors for UI swatches
export function getThemePreviewColors(themeId: string): {
  background: string
  foreground: string
  accent: string
} | null

// Flat record for project.files.themes
export function getAllThemes(): Record<string, Theme>

// Single theme definition's variants
export function getThemesForDefinition(themeId: string): Record<string, Theme> | null

// New project default
export const DEFAULT_THEME = minimalTheme
```

---

## Editor Integration

- Theme selector panel shows `themeDefinitions` in `order` sequence
- Preview swatches use `getThemePreviewColors()`
- Selecting a theme writes `ProjectThemeConfig` to project config
- Active theme applied via `data-nc-theme` attribute on `<html>`
- Cookie `nc-theme` persists selection across sessions

---

## Cross-References

- CSS custom property generation and `@property` declarations → `specs/20-styling-engine.md`
- Design token structure (primitive + semantic layers) → `specs/22-design-system.md`
