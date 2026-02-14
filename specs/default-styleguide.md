# Default Styleguide Specification

## Status: ✅ Implemented

| Component | Status | Package |
|-----------|--------|---------|
| Theme Definitions | ✅ | @layr/themes |
| Theme Tokens | ✅ | @layr/themes/src/tokens |
| Editor Theme Selector | ✅ | @layr/editor |
| Project Theme Config | ✅ | @layr/types |

---

## Purpose

Defines the default visual styleguide for new Layr projects, inspired by Writizzy's minimalist, indie-hacker aesthetic. This styleguide provides pre-configured themes, typography, color palettes, and component styles that users can customize or replace entirely.

### Jobs to Be Done

- Provide beautiful, production-ready default themes for new projects
- Establish typography defaults optimized for readability and indie-hacker aesthetic
- Define color palettes with automatic dark mode support
- Include multiple theme variants (Minimalist, Brutalism, Neobrutalism, Terminal, Notion-style)
- Set sensible defaults for spacing, shadows, and border radii

---

## Design Philosophy

Based on Writizzy's approach:

- **Minimalist by default:** Clean, distraction-free layouts that let content shine
- **Indie-hacker aesthetic:** Modern, approachable, professional but not corporate
- **Dark mode first-class:** Every theme includes a polished dark variant
- **Performance-focused:** Minimal CSS, system font fallbacks, optimized loading
- **Readability priority:** Optimized line-heights, font sizes, and contrast ratios

---

## Theme Variants

### 1. Minimalist (Default)

Clean, comfortable reading experience with subtle styling.

| Property | Light | Dark |
|----------|-------|------|
| Background | `#ffffff` | `#0a0a0a` |
| Foreground | `#171717` | `#fafafa` |
| Muted | `#737373` | `#a3a3a3` |
| Accent | `#2563eb` | `#3b82f6` |
| Border | `#e5e5e5` | `#262626` |
| Card | `#fafafa` | `#171717` |

**Typography:** Inter (body), system-ui fallback
**Border radius:** 8px
**Shadows:** Subtle, soft

### 2. Brutalism

Bold, monochromatic theme with thick borders and raw aesthetics.

| Property | Light | Dark |
|----------|-------|------|
| Background | `#ffffff` | `#000000` |
| Foreground | `#000000` | `#ffffff` |
| Muted | `#666666` | `#999999` |
| Accent | `#000000` | `#ffffff` |
| Border | `#000000` | `#ffffff` |
| Border Width | 3px | 3px |

**Typography:** Mono (JetBrains Mono or system mono)
**Border radius:** 0px (sharp corners)
**Shadows:** Hard, offset shadows (4px 4px 0)

### 3. Neobrutalism

Vibrant, colorful theme with bold borders and playful energy.

| Property | Light | Dark |
|----------|-------|------|
| Background | `#fef08a` | `#1c1917` |
| Foreground | `#1c1917` | `#fef08a` |
| Muted | `#78716c` | `#a8a29e` |
| Accent | `#f43f5e` | `#fb7185` |
| Secondary | `#22c55e` | `#4ade80` |
| Border | `#1c1917` | `#fef08a` |
| Border Width | 2px | 2px |

**Typography:** Sans-serif bold (Poppins, system-ui)
**Border radius:** 0px or 4px
**Shadows:** Hard, colorful offset (4px 4px 0)

### 4. Terminal

Retro CLI-inspired theme with monospace aesthetic.

| Property | Light | Dark |
|----------|-------|------|
| Background | `#f0f0f0` | `#0c0c0c` |
| Foreground | `#0c0c0c` | `#00ff00` |
| Muted | `#666666` | `#008800` |
| Accent | `#008800` | `#00ff00` |
| Border | `#0c0c0c` | `#00ff00` |

**Typography:** Mono (Fira Code, JetBrains Mono)
**Border radius:** 0px
**Shadows:** None (flat)
**Special:** Blinking cursor animation for inputs

### 5. Notion

Clean, emoji-rich theme inspired by Notion with subtle borders.

| Property | Light | Dark |
|----------|-------|------|
| Background | `#ffffff` | `#191919` |
| Foreground | `#37352f` | `#e6e6e6` |
| Muted | `#787774` | `#9b9a97` |
| Accent | `#2383e2` | `#529cca` |
| Border | `#e9e9e7` | `#373737` |
| Card | `#f7f6f3` | `#2f2f2f` |

**Typography:** -apple-system, BlinkMacSystemFont, Inter
**Border radius:** 4px
**Shadows:** Very subtle, layered

---

## Typography Scale

### Font Families

```typescript
const fontFamilies = {
  sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'JetBrains Mono, Fira Code, "SF Mono", Consolas, monospace',
  display: 'Inter, -apple-system, sans-serif',
}
```

### Font Sizes

| Token | Size | Line Height | Use Case |
|-------|------|-------------|----------|
| `xs` | 12px | 1.5 | Captions, labels |
| `sm` | 14px | 1.5 | Small text, metadata |
| `base` | 16px | 1.6 | Body text |
| `lg` | 18px | 1.5 | Large body, lead |
| `xl` | 20px | 1.4 | Small headings |
| `2xl` | 24px | 1.3 | H4 |
| `3xl` | 30px | 1.2 | H3 |
| `4xl` | 36px | 1.1 | H2 |
| `5xl` | 48px | 1.0 | H1 |
| `6xl` | 60px | 1.0 | Display |

### Font Weights

| Token | Weight |
|-------|--------|
| `normal` | 400 |
| `medium` | 500 |
| `semibold` | 600 |
| `bold` | 700 |

---

## Spacing Scale

Based on 4px base unit:

| Token | Value | Pixels |
|-------|-------|--------|
| `0` | 0 | 0px |
| `1` | 1 | 4px |
| `2` | 2 | 8px |
| `3` | 3 | 12px |
| `4` | 4 | 16px |
| `5` | 5 | 20px |
| `6` | 6 | 24px |
| `8` | 8 | 32px |
| `10` | 10 | 40px |
| `12` | 12 | 48px |
| `16` | 16 | 64px |
| `20` | 20 | 80px |

---

## Border Radius

| Token | Value |
|-------|-------|
| `none` | 0px |
| `sm` | 2px |
| `md` | 4px |
| `lg` | 8px |
| `xl` | 12px |
| `2xl` | 16px |
| `full` | 9999px |

---

## Shadows

### Light Mode

| Token | Value |
|-------|-------|
| `sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` |
| `md` | `0 4px 6px rgba(0, 0, 0, 0.07)` |
| `lg` | `0 10px 15px rgba(0, 0, 0, 0.1)` |
| `xl` | `0 20px 25px rgba(0, 0, 0, 0.15)` |

### Dark Mode

| Token | Value |
|-------|-------|
| `sm` | `0 1px 2px rgba(0, 0, 0, 0.3)` |
| `md` | `0 4px 6px rgba(0, 0, 0, 0.4)` |
| `lg` | `0 10px 15px rgba(0, 0, 0, 0.5)` |
| `xl` | `0 20px 25px rgba(0, 0, 0, 0.6)` |

---

## Component Defaults

### Button

```typescript
{
  paddingY: 2.5,  // 10px
  paddingX: 4,    // 16px
  fontSize: 'sm',
  fontWeight: 'medium',
  borderRadius: 'md',
  transition: 'all 150ms ease',
}
```

### Input

```typescript
{
  paddingY: 2.5,  // 10px
  paddingX: 3,    // 12px
  fontSize: 'base',
  borderRadius: 'md',
  borderWidth: 1,
  borderColor: 'border',
}
```

### Card

```typescript
{
  padding: 6,     // 24px
  borderRadius: 'lg',
  backgroundColor: 'card',
  borderWidth: 1,
  borderColor: 'border',
}
```

### Container

```typescript
{
  maxWidth: '672px',  // 42rem - optimal reading width
  paddingX: 4,        // 16px mobile
  paddingXMedium: 6,  // 24px tablet+
}
```

---

## Z-Index Scale

| Token | Value | Use Case |
|-------|-------|----------|
| `dropdown` | 100 | Dropdowns, popovers |
| `sticky` | 200 | Sticky headers |
| `modal-backdrop` | 300 | Modal overlay |
| `modal` | 400 | Modal content |
| `toast` | 500 | Toast notifications |
| `tooltip` | 600 | Tooltips |

---

## Animation Defaults

### Durations

| Token | Value |
|-------|-------|
| `fast` | 150ms |
| `normal` | 300ms |
| `slow` | 500ms |

### Easings

| Token | Value |
|-------|-------|
| `ease` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` |
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` |

### Built-in Animations

| Name | Keyframes |
|------|-----------|
| `fade-in` | `opacity: 0` → `opacity: 1` |
| `fade-out` | `opacity: 1` → `opacity: 0` |
| `slide-up` | `translateY(10px)` → `translateY(0)` |
| `slide-down` | `translateY(-10px)` → `translateY(0)` |
| `scale-in` | `scale(0.95)` → `scale(1)` |

---

## Implementation

### Package Location

`@layr/themes` package with:

```
@layr/themes/
├── src/
│   ├── index.ts           # Exports
│   ├── minimal.ts         # Minimalist theme
│   ├── brutalism.ts       # Brutalism theme
│   ├── neobrutalism.ts    # Neobrutalism theme
│   ├── terminal.ts        # Terminal theme
│   ├── notion.ts          # Notion theme
│   └── tokens/
│       ├── colors.ts      # Color definitions
│       ├── typography.ts  # Font scales
│       ├── spacing.ts     # Spacing scale
│       └── shadows.ts     # Shadow definitions
└── package.json
```

### Theme Structure

Each theme exports:

```typescript
interface ThemeDefinition {
  name: string
  displayName: string
  description: string
  default: string
  defaultDark?: string
  defaultLight?: string
  propertyDefinitions: PropertyDefinitions
  themes: Record<string, ThemeVariant>
}
```

### Integration with Project Creation

When creating a new project:

1. User selects theme variant (defaults to Minimalist)
2. Theme tokens are copied to project's theme configuration
3. User can fully customize or switch themes later

---

## Invariants

1. **I-STYLEGUIDE-THEME-COMPLETE:** Every theme MUST include both light and dark variants.
2. **I-STYLEGUIDE-TYPOGRAPHY-SCALE:** Typography scale MUST be consistent across themes.
3. **I-STYLEGUIDE-SPACING-UNIT:** Spacing MUST use 4px base unit.
4. **I-STYLEGUIDE-ACCESSIBILITY:** All color combinations MUST meet WCAG AA contrast requirements.

---

## Changelog

### Unreleased
- Initial specification based on Writizzy design analysis
- Defined 5 theme variants: Minimalist, Brutalism, Neobrutalism, Terminal, Notion
- Established typography, spacing, and component defaults
