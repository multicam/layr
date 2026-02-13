# Client-Side API System Specification

## Purpose

The Client-Side API System provides reactive HTTP clients that automatically re-execute when their dependencies change. Built on the signal system, it watches API parameters (URL, headers, body) for changes and triggers refetches when the `autoFetch` formula evaluates to true. The system integrates with SSR caching for hydration, supports multiple streaming protocols, provides comprehensive abort handling, and enables formula-based error detection and redirect rules.

### Jobs to Be Done

- Create reactive API clients that re-fetch when dependencies change
- Leverage SSR-populated cache during initial page load to avoid duplicate requests
- Support five response parser modes (JSON, text, SSE, JSON-stream, blob) with auto-detection
- Manage in-flight requests with abort controllers and cleanup
- Debounce API calls with formula-evaluated delays
- Detect errors via custom formulas or default HTTP status check
- Evaluate redirect rules and navigate based on API responses
- Stream data progressively with per-chunk UI updates
- Fire lifecycle callbacks (onMessage, onCompleted, onFailed)

---

## API Lifecycle

### Initialization

When `createAPI()` is called:

1. Create `ApiAbortHandler` for request cancellation
2. Create `payloadSignal` derived from component data signal
3. Subscribe to payload changes for auto-fetch
4. Return interface with `fetch`, `cancel`, `update`, `triggerActions`, `destroy` methods

### State Transitions

```
┌─────────┐    auto-fetch / manual fetch    ┌───────────┐
│  Idle    │ ─────────────────────────────── │  Loading   │
│  data:   │                                │  data:     │
│  null    │                                │  previous  │
│  loading:│                                │  loading:  │
│  false   │                                │  true      │
└─────────┘                                └─────┬─────┘
                                                  │
                                    ┌─────────────┴──────────────┐
                                    │                            │
                              ┌─────▼─────┐              ┌──────▼──────┐
                              │  Success   │              │   Error     │
                              │  data:     │              │  data: null │
                              │  response  │              │  error:     │
                              │  loading:  │              │  response   │
                              │  false     │              │  loading:   │
                              └───────────┘              │  false      │
                                                          └─────────────┘
```

### State Structure

```
ApiStatus = {
  data: unknown          // Response body (null on error)
  isLoading: boolean     // True during fetch
  error: unknown         // Error body or message (null on success)
  response?: {
    status?: number
    headers?: Record<string, string>
    performance?: ApiPerformance
    debug?: unknown      // Preview-only: redirect rule info
  }
}
```

---

## Auto-Fetch Behavior

### Reactive Signal Setup

A `payloadSignal` is derived from the component data signal. It recomputes whenever component data changes and includes:

- Constructed request (URL + settings)
- API configuration (excluding event handlers)
- Serialized headers (as array for deep comparison)
- Evaluated `autoFetch` result
- Evaluated proxy setting

The signal uses `fastDeepEqual` to detect actual changes. Only meaningful changes trigger the subscription callback.

### Trigger Conditions

Auto-fetch executes when ALL of these are true:
1. `autoFetch` formula evaluates to truthy
2. The payload has actually changed (deep equality check)
3. No SSR cache hit available (see Cache Strategy)

### What Changes Trigger Re-fetch

Any change to component data that affects:
- URL formula evaluation
- Path parameter formulas
- Query parameter formulas
- Header formulas
- Body formula
- Auto-fetch formula itself

### Initialization Behavior

On first run:
- If `autoFetch` is truthy → execute immediately (or use cache)
- If `autoFetch` is falsy and API not in data signal → set to `{ data: null, isLoading: false, error: null }`
- If `autoFetch` is falsy and API already exists → preserve existing state (from SSR)

---

## Cache Strategy

### When Cache Is Used

SSR cache is checked when ALL conditions are met:
1. `autoFetch` is defined (not null/undefined)
2. `autoFetch` is not statically `false` (could be formula or `true`)
3. `window.__toddle.isPageLoaded === false` (page still hydrating)

### Cache Key

Same `requestHash()` function used by SSR (cyrb53 hash of URL, method, headers excluding `host`/`cookie`, and body).

### Cache Lookup

Cached responses are stored in `window.__toddle.pageState.Apis[cacheKey]` by the SSR pipeline. On cache hit:
- **Cached error:** Set error state with cached body, status, headers
- **Cached success:** Set success state with cached data, status, headers
- No network request is made

### Cache Lifetime

Cache is only used during initial hydration. Once `isPageLoaded` becomes `true`, all subsequent requests go to the network.

---

## Fetch Execution

### Execute Flow

```
1. Check for debounce → if configured, delay execution
2. Set loading state (preserve existing data)
3. Evaluate proxy setting
4. Apply abort signal
5. Build request (direct or proxied)
6. Execute fetch()
7. Record performance.responseStart
8. Route to appropriate response handler
9. Parse response body
10. Evaluate error formula
11. Update state (success or error)
12. Evaluate redirect rules
13. Fire event callbacks
```

### Proxy Routing

When `server.proxy.enabled` formula evaluates to truthy:

1. Construct proxy URL: `/.toddle/omvej/components/{componentName}/apis/{componentName}:{apiName}`
2. Set `x-layr-url` header with the actual target URL
3. If `useTemplatesInBody` formula is truthy, set `x-layr-templates-in-body` header
4. Execute fetch against proxy URL instead of target

When proxy is disabled: fetch directly against the target URL.

### Manual Fetch

The `fetch()` method on the returned API interface supports:

- **Action inputs:** Merged with API-defined inputs (action values override)
- **Action callbacks:** Appended to API-defined callbacks (both execute)
- **Workflow callbacks:** Passed through for workflow integration

Input values can be either formula objects or direct values (wrapped in value formulas automatically).

---

## Debounce Mechanism

### Formula-Based Debouncing

When `api.client.debounce.formula` is defined:

1. Clear any existing timer
2. Evaluate formula to get delay in milliseconds (has access to full component data including `ApiInputs`)
3. Set new `setTimeout` with evaluated delay
4. Return promise that resolves/rejects when the delayed request completes

### Behavior

- Each new trigger cancels the previous pending request
- Only the last trigger within the debounce window actually executes
- The formula has full context access, enabling dynamic delays (e.g., longer delay for shorter input)

---

## Response Parsing

### Parser Mode Selection

| Mode | Content-Type Pattern | Behavior |
|------|---------------------|----------|
| `auto` | (detect from headers) | Routes to appropriate parser below |
| `json` | `application/json`, `application/*+json` | Single `response.json()` call |
| `text` | `text/*`, `application/x-www-form-urlencoded`, `application/xml` | Streaming text with progressive UI updates |
| `event-stream` | `text/event-stream` | SSE protocol parsing |
| `json-stream` | `application/stream+json`, `application/x-ndjson` | Newline-delimited JSON parsing |
| `blob` | `image/*` | Binary data → Object URL |

### Streaming Architecture

All streaming parsers share a common chunk accumulation pattern:

```
1. Initialize chunk accumulator with currentChunk buffer
2. Read stream via ReadableStream reader
3. For each chunk:
   a. Concatenate with incomplete previous chunk
   b. Split by delimiter(s)
   c. Parse each complete chunk
   d. Update data signal with intermediate state (isLoading: true)
   e. Trigger onMessage callback if listeners exist
   f. Keep last incomplete part as buffer
4. Process any remaining buffer
5. Finalize with endResponse()
```

### SSE (Server-Sent Events) Parsing

Parses the SSE protocol format:

- `event:` line → event type (default: `"message"`)
- `data:` line → payload (attempts JSON parse, falls back to string)
- `id:` line → event ID (optional)
- `retry:` line → reconnection time (optional)

Delimiters: `\n\n` or `\r\n\r\n` (double newline)

Output: Array of parsed event objects.

### JSON-Stream Parsing

Parses newline-delimited JSON (NDJSON):

- Each line is independently `JSON.parse()`d
- Parse errors throw with the original chunk as error cause

Delimiters: `\n` or `\r\n` (single newline)

Output: Array of parsed JSON objects.

### Text Streaming

Raw text chunks passed through without parsing. Output: Concatenated string.

### Blob Response

Reads response as blob, creates Object URL via `URL.createObjectURL()`. No streaming.

### Progressive UI Updates

During streaming, the data signal is updated after each complete chunk:

```
{
  isLoading: true,
  data: <accumulated chunks>,
  error: null,
  response: { headers: <response headers> }
}
```

This triggers component re-renders with partial data, enabling real-time display of streaming responses.

---

## Abort Signal Management

### ApiAbortHandler

Manages multiple in-flight requests with proper cleanup:

- **Track controllers:** Maintains array of active `AbortController` instances
- **Apply signal:** Creates new controller per request, combines with any existing signal via `AbortSignal.any()`
- **Cancel all:** Aborts all tracked controllers and clears array
- **Cleanup:** Filters out already-aborted controllers to prevent memory leaks

### Integration

- New abort controller created for each `execute()` call
- `cancel()` method exposed on API interface aborts all in-flight requests
- Abort errors result in error state with `"Request was aborted"` message
- Component `abortSignal` (from abort controller) cancels all APIs on unmount

---

## Error Detection

### Default Behavior

If no `isError` formula is defined: `!response.ok` (HTTP status >= 400).

### Custom Error Formula

The `isError` formula receives an isolated context:

```
{
  Apis: {
    [apiName]: {
      isLoading: false,
      data: <response body>,
      error: null,
      response: { status, headers, performance }
    }
  }
}
```

- Formula returns `null`/`undefined` → use default (`!response.ok`)
- Formula returns truthy → treat as error
- Formula returns falsy → treat as success

### Error State

On error:
- `data` set to `null`
- `error` set to response body (or error message for exceptions)
- `response` includes status, headers, performance

---

## Redirect Rules

### Client-Side Evaluation

After each response (success or error), redirect rules are evaluated:

1. Sort rules by `index` (ascending)
2. For each rule, evaluate formula with current API response in context
3. If formula returns a string → validate as URL
4. **Production mode:** Call `window.location.replace(url)` (immediate navigation)
5. **Preview mode:** Post `blockedNavigation` message to parent editor (no actual navigation)
6. First matching rule wins (stops evaluation)

### Debug Info

In preview mode, the applied redirect rule details (name, index, URL) are added to `response.debug.appliedRedirectRule` for editor visibility.

---

## Race Condition Protection

### Timestamp-Based Ordering

Both `apiSuccess()` and `apiError()` check if a newer request has started:

```
latestRequestStart = current API state's performance.requestStart
if latestRequestStart > this response's requestStart:
  → discard this response (a newer request is in progress or completed)
```

This ensures that when requests complete out of order (e.g., slow request A followed by fast request B), the latest request's response always wins.

---

## Event Callbacks

### Callback Types

| Callback | Trigger | Event Data |
|----------|---------|------------|
| `onMessage` | Each streaming chunk (if listeners exist) | Parsed chunk |
| `onCompleted` | Successful response (isError = false) | Response body |
| `onFailed` | Error response or exception | `{ error: body, status }` |

### Execution

Each callback's actions are executed via `handleAction()` with:
- Formula context extended with `Event` containing the response data
- Component context for action dispatch
- Optional workflow callback for workflow integration

### Callback Merging

When `fetch()` is called manually (via action), callbacks from both the API definition and the triggering action are merged:

```
onCompleted.actions = [...apiActions, ...actionModelActions]
```

Both sets of actions execute on the event.

---

## Credential Handling

### Configuration

`api.client.credentials` accepts: `'include'`, `'same-origin'`, `'omit'`

### Application

- Validated against the three allowed values
- Invalid values → `undefined` (browser default: `'same-origin'`)
- Applied in `constructRequest()` on the client side only (not available in SSR)

### CSR vs SSR Differences

| Aspect | Client (CSR) | Server (SSR) |
|--------|-------------|-------------|
| Credentials | Via `fetch()` credentials option | N/A (no browser cookies) |
| Cookie injection | Automatic via browser | Template substitution (`{{ cookies.name }}`) |
| CORS | Browser-enforced | Not applicable (server-to-server) |

---

## Performance Metrics

### Tracked Timestamps

```
ApiPerformance = {
  requestStart: number    // Before fetch() call
  responseStart: number   // After fetch() resolves, before body parsing
  responseEnd: number     // After body fully parsed
}
```

### Usage

- Included in `ApiStatus.response.performance`
- Available to error detection formulas
- Available to redirect rule formulas
- Used for race condition protection (timestamp comparison)

---

## Configuration Reference

### API Request Fields (Client-Relevant)

| Field | Type | Description |
|-------|------|-------------|
| `autoFetch` | `Formula?` | When truthy, API auto-fetches on dependency changes |
| `client.debounce` | `{ formula: Formula }?` | Debounce delay in milliseconds |
| `client.parserMode` | `ApiParserMode?` | Response parser (`auto`, `json`, `text`, `event-stream`, `json-stream`, `blob`) |
| `client.credentials` | `string?` | Fetch credentials mode |
| `client.onCompleted` | `EventModel?` | Success callback actions |
| `client.onFailed` | `EventModel?` | Error callback actions |
| `client.onMessage` | `EventModel?` | Streaming chunk callback actions |
| `server.proxy.enabled` | `{ formula: Formula }` | Route through backend proxy |
| `server.proxy.useTemplatesInBody` | `{ formula: Formula }?` | Enable body template substitution |
| `isError` | `{ formula: Formula }?` | Custom error detection |
| `redirectRules` | `Record<string, RedirectRule>?` | Response-based redirect rules |
| `timeout` | `{ formula: Formula }?` | Request timeout in milliseconds |

---

## Edge Cases

- **SSR cache with error:** Cached errors are restored correctly, firing `onFailed` callback
- **Auto-fetch initially false:** API state set to `{ data: null, isLoading: false }` without making a request
- **Duplicate auto-fetch triggers:** Deep equality comparison on payload signal prevents duplicate requests when data changes don't affect API parameters
- **Abort during streaming:** Abort signal interrupts stream reading; partial data may be in state briefly before error state is set
- **Redirect in preview:** Posts message to editor instead of navigating, preserving preview iframe state
- **Missing response body:** For error states, falls back to status text if body is null
- **Timer cleanup on destroy:** Debounce timer is not explicitly cleared on destroy — the closure captures the API reference which becomes stale
- **Proxy URL encoding:** Original URL is decoded and `+` replaced with spaces before setting in proxy header
- **Streaming without listeners:** `onMessage` events are only dispatched if the API has message action listeners, avoiding unnecessary overhead

---

## System Limits

### Operation Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `maxSize` | 10 MB | Maximum data size |
| `maxTime` | 5,000ms | Maximum operation time |
| `maxCount` | 1,000 | Maximum items processed |

### Enforcement

- **Size limit:** Truncate with warning
- **Time limit:** Cancel with error
- **Count limit:** Stop processing

---

## Invariants

1. **I-OP-VALID:** Operations MUST be valid.
2. **I-OP-SAFE:** Operations MUST be safe.
3. **I-OP-DETERMINISTIC:** Results MUST be deterministic.

### Invariant Violation Behavior

| Invariant | Detection | Behavior |
|-----------|-----------|----------|
| I-OP-VALID | Build | Error: validation |
| I-OP-SAFE | Runtime | Reject operation |
| I-OP-DETERMINISTIC | Testing | CI failure |

---

## Error Handling

| Error Type | When | Recovery |
|------------|------|----------|
| `OperationError` | Operation fails | Log, continue |
| `TimeoutError` | Time exceeded | Cancel |
| `SizeError` | Size exceeded | Truncate |

---

## Changelog

### Unreleased
- Added System Limits section
- Added Invariants section
- Added Error Handling section
