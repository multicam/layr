# Test Harness Specification

## Purpose

Provides isolated component testing with preview, mocking, and assertion utilities.

---

## Quick Start

```typescript
import { preview, mockApi, mockContext } from '@layr/test-harness';
import { Button } from './components/Button';

// Preview component
const view = preview(Button, { label: 'Click' });

// Assert rendered output
expect(view.text()).toBe('Click');
expect(view.find('button').hasClass('primary')).toBe(true);

// Simulate interaction
view.click('button');
expect(view.emitted('click')).toHaveLength(1);
```

---

## API

### preview(component, attributes?)

Renders component in isolated container.

```typescript
function preview(
  component: Component,
  attributes?: Record<string, any>
): PreviewResult
```

### PreviewResult

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

  // Events
  emitted(eventName: string): any[];

  // State
  signal(name: string): Signal<any>;
  variable(name: string): any;
  api(name: string): ApiStatus;

  // Cleanup
  unmount(): void;
}
```

### mockApi(name, response)

Mocks API responses.

```typescript
mockApi('fetchUsers', {
  data: [{ id: 1, name: 'John' }],
  isLoading: false,
  error: null
});
```

### mockContext(provider, formulas)

Mocks context provider.

```typescript
mockContext('AuthProvider', {
  user: { id: 1, name: 'John' },
  isAuthenticated: true
});
```

### mockFormula(name, handler)

Mocks formula implementation.

```typescript
mockFormula('now', () => new Date('2024-01-01'));
```

---

## Usage Patterns

### Test Component Rendering

```typescript
test('renders button with label', () => {
  const view = preview(Button, { label: 'Submit' });
  expect(view.text()).toBe('Submit');
  view.unmount();
});
```

### Test Conditional Rendering

```typescript
test('shows loading state', () => {
  mockApi('fetchData', { isLoading: true });
  const view = preview(DataList);
  expect(view.find('.loading')).toBeDefined();
  view.unmount();
});
```

### Test Event Emission

```typescript
test('emits click event', () => {
  const view = preview(Button, { label: 'Click' });
  view.click('button');
  expect(view.emitted('click')).toEqual([{ value: true }]);
  view.unmount();
});
```

### Test Variable Changes

```typescript
test('toggles visibility', () => {
  const view = preview(Collapsible);
  expect(view.find('.content')).toBeNull();
  
  view.click('.toggle');
  expect(view.find('.content')).toBeDefined();
  view.unmount();
});
```

---

## Wait Utilities

### waitFor(predicate, options?)

Waits for condition to be true.

```typescript
await waitFor(() => view.find('.loaded'), { timeout: 1000 });
```

### waitForApi(name, state?)

Waits for API to reach state.

```typescript
await waitForApi('fetchData', 'success');
```

---

## Snapshot Testing

```typescript
test('matches snapshot', () => {
  const view = preview(Card, { title: 'Hello' });
  expect(view.html()).toMatchSnapshot();
});
```

---

## System Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxPreviewTime` | 5,000ms | Maximum preview lifetime |
| `maxMockCount` | 100 | Maximum mocks per test |

---

## Changelog

### Unreleased
- Initial specification
