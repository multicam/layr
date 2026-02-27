# Design System

The layer between Layr's styling engine and the user. Defines what tokens exist, what components ship, and how the editor exposes all of this. **Not yet implemented — this is the next build target.**

**Packages (planned):** `@layr/components` (new), `@layr/themes` (extensions), `@layr/editor` (changes)

---

## Phase Summary

| Feature | Phase | Status |
|---------|-------|--------|
| Two-tier token architecture (primitive + semantic) | MVP | Not built |
| 28 semantic color roles | MVP | Not built |
| Basic component catalog (Button, Input, Card, Stack, Container) | MVP | Not built |
| shadcn-style linked/forked component model | MVP | Not built |
| Variant picker in editor | MVP | Not built |
| Flat component list with search | MVP | Not built |
| Smart spacing slider (snaps to tokens, shows px) | MVP | Not built |
| Value provenance display (theme → component → user) | MVP | Not built |
| Motion preset system (4 presets) | Phase 2 | Not built |
| Full 45+ component catalog | Phase 2 | Not built |
| Auto-scaffold for compound components | Phase 2 | Not built |
| Template system (page shells) | Phase 2 | Not built |
| Icon system (Lucide) | Phase 2 | Not built |
| WCAG AA accessibility audit | Phase 2 | Not built |
| Visual changelog / update diffing | Deferred | Not built |
| Upstream linked property tracking | Deferred | Not built |

---

## Design Philosophy

1. **Use, then own.** Every component ships ready to use, and can be forked. The fork is the feature.
2. **Tokens encode intent.** Users pick "danger", not "red-500". Themes remap intent. Primitives for fine-tuning only.
3. **Three layers, always visible.** Theme defaults → component defaults → user overrides. Every value shows its source.
4. **Full CSS, no hiding.** All properties exposed (Webflow model). Editor organizes contextually, never restricts.
5. **Accessibility is structural.** WCAG AA floor. ARIA roles, keyboard nav, focus management built in from day one.

---

## Architecture [MVP]

```
@layr/themes          Token definitions (primitive + semantic)
     |
@layr/components      Component catalog (JSON definitions, not code)
     |
@layr/editor          Editor integration (provenance UI, variant picker, component panel)
```

Components are **data, not code** — JSON definitions using the existing `ComponentModel` type. Behavior is expressed through the action system, event handlers, and formulas.

---

## Token System [MVP]

### Two-Tier Architecture

```
Primitive Layer          Semantic Layer           Component Usage
─────────────           ──────────────           ───────────────
--red-500         →     --color-danger      →     Button[destructive] background
--neutral-100     →     --color-surface     →     Card background
--blue-600        →     --color-primary     →     Button[primary] background
```

Users interact with the **semantic layer**. The **primitive layer** is available for fine-tuning.

### Primitive Colors [MVP]

11-shade scale per hue (Tailwind-compatible):

| Shade | Purpose |
|-------|---------|
| 50 | Backgrounds, subtle fills |
| 100 | Hover backgrounds |
| 200 | Borders, dividers |
| 300 | Disabled, placeholder text |
| 400 | Muted text, secondary icons |
| 500 | Base color |
| 600 | Hover states |
| 700 | Active/pressed |
| 800 | High-contrast text on light |
| 900 | Headings, primary text |
| 950 | Maximum contrast |

**Hue families (8):** neutral, red, orange, amber, green, blue, violet, pink

Total: ~88 primitive color tokens.

### Semantic Color Roles [MVP]

**Surfaces (6)**

| Token | Purpose |
|-------|---------|
| `--color-background` | Page background |
| `--color-foreground` | Default text |
| `--color-surface` | Card/panel background |
| `--color-surface-foreground` | Text on surface |
| `--color-surface-elevated` | Popovers, dropdowns, tooltips |
| `--color-overlay` | Modal/sheet backdrop |

**Interactive (8)**

| Token | Purpose |
|-------|---------|
| `--color-primary` | Primary actions, links |
| `--color-primary-foreground` | Text on primary |
| `--color-secondary` | Secondary actions |
| `--color-secondary-foreground` | Text on secondary |
| `--color-accent` | Highlights, active states |
| `--color-accent-foreground` | Text on accent |
| `--color-muted` | Subdued backgrounds |
| `--color-muted-foreground` | Placeholder, disabled labels |

**Feedback (8)**

| Token | Purpose |
|-------|---------|
| `--color-destructive` | Error actions, delete |
| `--color-destructive-foreground` | Text on destructive |
| `--color-success` | Success states |
| `--color-success-foreground` | Text on success |
| `--color-warning` | Warnings |
| `--color-warning-foreground` | Text on warning |
| `--color-info` | Informational |
| `--color-info-foreground` | Text on info |

**Structure (6)**

| Token | Purpose |
|-------|---------|
| `--color-border` | Default borders |
| `--color-border-strong` | Emphasized borders |
| `--color-input` | Input field borders |
| `--color-ring` | Focus rings |
| `--color-sidebar` | Sidebar background |
| `--color-sidebar-foreground` | Sidebar text |

Total: 28 semantic color roles. Every theme must provide values for all 28.

### Spacing Tokens [MVP]

4px base unit. 22 values from `--space-0` (0) to `--space-24` (96px). See `specs/20-styling-engine.md` for the scale.

### Border Radius Tokens [MVP]

| Token | Value |
|-------|-------|
| `--radius-none` | 0px |
| `--radius-sm` | 2px |
| `--radius-md` | 4px |
| `--radius-lg` | 8px |
| `--radius-xl` | 12px |
| `--radius-2xl` | 16px |
| `--radius-full` | 9999px |

### Typography Tokens [MVP]

Font families (sans, serif, mono, display), font sizes (xs through 6xl), font weights (normal, medium, semibold, bold). Same scale as `specs/21-themes.md`.

---

## Style Cascade Model [MVP]

```
Layer 1: Theme Defaults        ← Token values from active theme
    ↓
Layer 2: Component Defaults    ← Styles defined in component definition
    ↓
Layer 3: User Overrides        ← Instance-level customizations
```

**Resolution rules:**
1. User override wins if explicitly set
2. Component default is next
3. Theme token is the fallback

Theme switching updates Layer 1. Layers 2 and 3 are preserved unless they reference tokens.

---

## Component Model [MVP]

### Linked vs. Forked

Every component ships in two forms:

| Form | Behavior |
|------|---------|
| **Linked** | Unmodified properties track upstream updates; modified properties owned by user |
| **Forked** | Fully detached copy; no upstream connection; created via "Detach from library" |

### Variant Model [MVP]

Variants expressed as component attributes with metadata:

```typescript
{
  attributes: {
    intent: {
      name: 'Intent',
      testValue: 'primary',
      metadata: {
        type: 'variant',
        options: ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link'],
        preview: true,
        default: 'primary'
      }
    },
    size: {
      name: 'Size',
      testValue: 'md',
      metadata: {
        type: 'variant',
        options: ['sm', 'md', 'lg', 'icon'],
        preview: true,
        default: 'md'
      }
    }
  }
}
```

The editor renders a visual segmented control when `metadata.type === 'variant'`.

---

## Component Catalog

### MVP Components [MVP]

Essential building blocks for the initial release:

| Component | Category | Compound |
|-----------|----------|----------|
| Button | Input | No |
| Input | Input | No |
| Textarea | Input | No |
| Label | Input | No |
| Checkbox | Input | No |
| Switch | Input | No |
| Card | Display | Yes (header/body/footer) |
| Badge | Display | No |
| Alert | Feedback | No |
| Separator | Layout | No |
| Stack | Layout | No |
| Container | Layout | No |
| Skeleton | Display | No |

### Phase 2 Components [Phase 2]

| Component | Category | Compound |
|-----------|----------|----------|
| Avatar / AvatarGroup | Display | Yes |
| Select | Input | Yes |
| Combobox | Input | Yes |
| RadioGroup | Input | Yes |
| Slider | Input | No |
| Toggle / ToggleGroup | Input | Yes |
| Dialog | Feedback | Yes |
| AlertDialog | Feedback | Yes |
| Popover | Feedback | Yes |
| Tooltip | Feedback | No |
| Toast | Feedback | No |
| Progress | Feedback | No |
| Sheet | Feedback | Yes |
| Tabs | Navigation | Yes |
| Accordion | Navigation | Yes |
| Collapsible | Layout | Yes |
| DropdownMenu | Navigation | Yes |
| NavigationMenu | Navigation | Yes |
| Breadcrumb | Navigation | Yes |
| Pagination | Navigation | No |
| Sidebar | Navigation | Yes |
| Table | Display | Yes |
| Calendar | Display | Yes |
| DatePicker | Input | Yes |
| ScrollArea | Layout | No |
| AspectRatio | Layout | No |
| Resizable | Layout | Yes |
| HoverCard | Display | Yes |
| Carousel | Display | Yes |
| Command | Navigation | Yes |
| ContextMenu | Navigation | Yes |
| Menubar | Navigation | Yes |

### Component Specification Format [MVP]

Every component is defined with:

```
Component: [Name]
─────────────────
Visual:
  - Default styles (referencing semantic tokens)
  - Variant styles per intent × size

Accessibility: [Phase 2]
  - ARIA role(s)
  - Keyboard interactions
  - Focus management

Behavior:
  - State management (internal variables)
  - Event handlers
  - Interaction patterns

Scaffold (compound only): [Phase 2]
  - Child structure created on drop
```

---

## Motion System [Phase 2]

Four named presets:

| Preset | Duration | Easing | Use when |
|--------|----------|--------|---------|
| **Subtle** | 150ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Micro-interactions, hover, focus rings |
| **Smooth** | 300ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Tooltips, popovers, dropdowns |
| **Playful** | 400ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Modals, toasts, celebratory feedback |
| **Snappy** | 100ms | `cubic-bezier(0, 0, 0.2, 1)` | Toggles, checkboxes, instant feedback |

When `prefers-reduced-motion: reduce`: durations → 0ms, transforms suppressed, opacity transitions kept.

Themes can override motion presets (e.g., Terminal uses `step-end` for instant, CLI-like transitions).

---

## Icon System [Phase 2]

Bundled set: **Lucide** (MIT, 1500+ icons, 24x24 grid).

Icons referenced by `data-icon` attribute, resolved to SVG at render time. Editor renders icon picker when `metadata.type === 'icon'`.

---

## Template System [Phase 2]

Configurable page shells — not one-time scaffolds. Templates persist; sections can be toggled later.

| Template | Default Sections |
|----------|-----------------|
| Landing Page | Hero, Features, Testimonials, Pricing, CTA, Footer |
| Dashboard | Sidebar Nav, Header, Stats Grid, Data Table, Activity Feed |
| Blog | Header, Article Content, Author Bio, Related Posts, Footer |
| Documentation | Sidebar Nav, Breadcrumb, Content, Table of Contents, Pagination |
| Portfolio | Hero, Project Grid, About, Contact, Footer |
| E-commerce | Header, Product Grid, Filters, Cart Sidebar, Footer |
| Settings | Sidebar Nav, Section Header, Form Fields, Save Bar |
| Auth | Logo, Form Card, Social Logins, Footer Links |

---

## Accessibility [Phase 2]

Target: **WCAG 2.1 AA**

| Requirement | Threshold |
|-------------|-----------|
| Normal text contrast | 4.5:1 |
| Large text contrast (≥18pt or ≥14pt bold) | 3:1 |
| UI components + graphics | 3:1 |
| Focus indicators | 3:1 against adjacent colors |

Keyboard navigation:
- All interactive components reachable via Tab
- Compound components use arrow keys internally
- Escape closes overlays
- Enter/Space activates buttons/toggles
- Home/End jump to first/last item in lists
- Focus trap in modals; returns to trigger on close

Components follow WAI-ARIA Authoring Practices patterns.

---

## Editor Integration [MVP]

### Property Panel

| Section | Properties |
|---------|-----------|
| Layout | display, flex direction, align, justify, gap, grid |
| Spacing | padding (4 sides), margin (4 sides) |
| Size | width, height, min/max, overflow |
| Typography | font family, size, weight, color, line-height |
| Background | color, image, gradient |
| Border | width, color, style, radius (4 corners) |
| Effects | shadow, opacity, cursor |
| Transform | translate, rotate, scale |
| Transition | property, duration, easing, delay |
| Position | position, top/right/bottom/left, z-index |

### Smart Spacing Slider [MVP]

Spacing inputs (padding, margin, gap):
1. Snap to token values
2. Show pixel output (`24px`, not `spacing-6`)
3. Allow custom values (off-token shown without snap indicator)
4. Dot indicator when value matches a token

### Value Provenance [MVP]

```
border-radius: theme: 8px → component: 12px → you: 20px
                                                ^^^^^^^^
                                                (override; reset icon shown)
```

Reset icon appears when user value differs from component default. Click to fall back to component default; click again for theme default.

### Variant Picker [MVP]

When `metadata.type === 'variant'`:
- Render visual segmented control
- Show thumbnails if `metadata.preview === true`
- Group variant attributes at top of property panel

### Auto-Scaffold [Phase 2]

On compound component drop:
1. Full child structure created automatically
2. Editable children highlighted with outlines
3. Add/remove buttons appear contextually
4. Required children show lock icon

### Flat Component List [MVP]

Single alphabetical list in insert panel with:
- Fuzzy search on name and tags
- Visual preview thumbnail in current theme
- Recently used components pinned at top

---

## Package Structure (Planned)

```
@layr/components/
├── src/
│   ├── index.ts
│   ├── components/          # JSON component definitions
│   │   ├── button.json
│   │   ├── card.json
│   │   └── ...
│   ├── scaffolds/           # Phase 2: auto-scaffold structures
│   ├── templates/           # Phase 2: page template definitions
│   └── icons/               # Phase 2: Lucide SVG mapping

@layr/themes/ (additions)
└── src/tokens/
    ├── primitives/           # 8 hues × 11 shades, spacing, radius, shadow
    └── semantic/             # 28 color roles
```

---

## Invariants (for MVP)

| Invariant | Rule | Enforcement |
|-----------|------|-------------|
| Semantic tokens complete | Every theme must provide all 28 semantic tokens | Build error |
| Primitive feeds semantic | Semantic tokens reference primitive tokens or direct CSS values only | Build error |
| Variant exhaustive | Every intent × size combination must have defined styles | Build error |
| Linked bidirectional | A property is linked OR overridden, never both | Editor auto-enforces |

---

## Cross-References

- CSS custom property generation → `specs/20-styling-engine.md`
- Built-in theme color values → `specs/21-themes.md`
