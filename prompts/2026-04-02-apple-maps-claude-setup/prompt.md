# Claude Code setup update — Apple Maps Apify actor

Update all Claude Code configuration in this repo: `.mcp.json`, `.claude/agents/`, `.claude/skills/`, and `CLAUDE.md`. The repo is a TypeScript Apify actor using Crawlee + PlaywrightCrawler that scrapes `maps.apple.com` via MapKit JS API network interception.

Before making any changes, read the files listed below to understand the current state. Do not assume — read first.

Files to read before starting:
- `.mcp.json`
- `CLAUDE.md`
- `AGENTS.md`
- `package.json`
- `.actor/actor.json`
- `.actor/input_schema.json`
- `src/main.ts`
- `src/routes.ts`
- `.claude/settings.json`
- `.claude/agents/apify-ts-coder.md`
- `.claude/agents/code-reviewer.md`
- `.claude/agents/selector-analyzer.md`
- `.claude/agents/test-runner.md`
- `.claude/skills/apify-ops/SKILL.md`
- `.claude/skills/apify-schemas/SKILL.md`
- `.claude/skills/actor-scaffold/SKILL.md`

---

## 1 — Update `.mcp.json`

Replace the current file with the following. The existing config only has the Apify MCP server with no tool filtering. We need to add Playwright MCP (for live browser testing and network inspection) and a fetch server.

```json
{
  "mcpServers": {
    "apify": {
      "command": "npx",
      "args": [
        "-y",
        "@apify/actors-mcp-server@latest",
        "--tools",
        "actors,docs,actor-runs,apify-storage"
      ],
      "env": {
        "APIFY_TOKEN": "${APIFY_TOKEN}"
      }
    },
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest",
        "--browser", "chromium",
        "--headless",
        "--caps", "core,devtools",
        "--block-service-workers",
        "--viewport-size", "1280x720"
      ]
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@anthropic/fetch-mcp@latest"]
    }
  }
}
```

Notes:
- `--tools actors,docs,actor-runs,apify-storage` scopes the Apify MCP to the four most useful categories for development; without this flag all tools load but fewer are contextually useful
- `--caps core,devtools` on Playwright MCP enables network inspection (DevTools) without vision/screenshot tools that waste tokens; `core` alone gives the 12 essential navigation/interaction tools
- `--block-service-workers` is critical — apple.com registers service workers that intercept network requests before Playwright sees them, hiding the MapKit JS API calls we need to capture
- `@anthropic/fetch-mcp` provides HTTP fetch without a full browser, useful for checking API responses during development

---

## 2 — Update `.claude/agents/`

### Keep and update: `apify-ts-coder.md`

The existing agent is well-written but references generic Apify patterns. Update the `description` and add Apple Maps-specific guidance at the bottom under a new `## Apple Maps Actor` section.

Change the `description` frontmatter field to:
```
Use PROACTIVELY for any TypeScript/JavaScript coding tasks in this Apple Maps scraper. Write or refactor Crawlee PlaywrightCrawler code, MapKit JS interception logic, input/output schemas, and data normalization. Also handles Apify platform patterns (PPE pricing, proxy config, graceful abort).
```

Add this section at the end of the file (after the existing Apify Actor Guidance section):

```markdown
## Apple Maps Actor

### Core architecture
This actor scrapes `maps.apple.com` via **network interception**, not DOM parsing.
MapKit JS makes XHR calls to `api.apple-mapkit.com/v1/search` — intercept these.

### Interception pattern
```typescript
const results: MapKitPlace[] = [];

page.on('response', async (response) => {
  if (response.url().includes('api.apple-mapkit.com/v1/search') && response.ok()) {
    try {
      const data = await response.json() as MapKitSearchResponse;
      results.push(...(data.results ?? []));
    } catch { /* non-JSON, skip */ }
  }
});

await page.goto(`https://maps.apple.com/?q=${encodeURIComponent(query)}`);
await page.waitForResponse(
  res => res.url().includes('api.apple-mapkit.com/v1/search'),
  { timeout: 15_000 },
);
```

### Key endpoints
- `api.apple-mapkit.com/v1/search` — search results (main target)
- `api.apple-mapkit.com/v1/place` — place detail enrichment
- `cdn.apple-mapkit.com/ma/bootstrap` — auth init (401 here = nothing will load)

### Non-obvious rules
- Service workers must be blocked via `serviceWorkers: 'block'` in browser context options (`.mcp.json` also blocks them via `--block-service-workers` for MCP testing)
- Apple Maps results are geolocation-biased by IP — proxy country drives which results you get
- The MapKit JWT token is embedded by Apple's own frontend — no Apple Developer account needed
- Use residential proxies (`RESIDENTIAL` group) — datacenter IPs get rate-limited
- For PPE pricing: `await Actor.pushData(place, 'place-found')` charges + pushes in one call
```

### Keep and update: `code-reviewer.md`

Add a new section `### Apple Maps Specifics` to the review checklist:

```markdown
### Apple Maps Specifics
- [ ] Service workers blocked in browser context (`serviceWorkers: 'block'`)
- [ ] Network interception uses `page.on('response')` not DOM selectors
- [ ] Proxy uses `RESIDENTIAL` group, not `DATACENTER`
- [ ] `fromPrebuiltFull` used for Ghostery adblocker (not `fromPrebuiltAdsOnly`)
- [ ] PPE event name `'place-found'` used consistently in `Actor.pushData()`
- [ ] TypeScript types reference `src/types.ts` interfaces, not inline `any`
```

### Delete: `selector-analyzer.md`

This agent analyzes CSS/XPath selectors. This actor uses network interception, not DOM selectors. The agent is irrelevant and adds noise to agent selection. Delete `.claude/agents/selector-analyzer.md`.

### Keep as-is: `test-runner.md`

No changes needed.

### Add: `.claude/agents/network-interceptor.md`

Create this new file:

```markdown
---
name: network-interceptor
description: Use when exploring, prototyping, or debugging network interception against maps.apple.com. Opens a real browser via Playwright MCP to discover API endpoints, inspect response shapes, and validate that interception code captures the correct data. Read-only — never modifies source files.
tools: Read, Grep, mcp__playwright__*
disallowedTools: Write, Edit, MultiEdit
model: sonnet
color: purple
---

You are a network traffic analyst specializing in reverse-engineering web application
API calls. You use Playwright MCP browser tools to navigate maps.apple.com live and
discover the exact API endpoints and response formats.

## Workflow

1. Use `browser_navigate` to load `https://maps.apple.com/?q=<encoded query>`
2. Use `browser_network_requests` to list all XHR/fetch calls after page load
3. Identify calls to `api.apple-mapkit.com/v1/search` and `api.apple-mapkit.com/v1/place`
4. Use `browser_evaluate` to inspect a response body directly if needed
5. Document exact URL patterns, query params, and the JSON response shape
6. Report findings as actionable interception patterns for `src/interceptor.ts`

## What to look for

| Endpoint | Purpose | Key response fields |
|----------|---------|---------------------|
| `cdn.apple-mapkit.com/ma/bootstrap` | Auth init | Check for 401 = nothing works |
| `api.apple-mapkit.com/v1/search` | Main search | `results[]`, `displayMapRegion` |
| `api.apple-mapkit.com/v1/place` | Place detail | `results[0]` enriched data |
| `api.apple-mapkit.com/v1/searchAutocomplete` | Autocomplete suggestions | `results[].displayLines` |

## Known response fields (search endpoint)

From `results[]` items: `name`, `coordinate.latitude`, `coordinate.longitude`,
`formattedAddress`, `country`, `countryCode`, `administrativeArea`, `locality`,
`postCode`, `thoroughfare`, `subThoroughfare`, `pointOfInterestCategory`,
`telephone`, `urls`, `rating`, `ratingCount`, `openNowType`.

## Never modify code

Only diagnose and report. Provide copy-paste-ready code snippets in your report
but do not write to any source file — that is the scraper-coder agent's job.
```

### Add: `.claude/agents/scraper-coder.md`

The existing `apify-ts-coder` agent is broad. Add a focused companion agent for the Apple Maps implementation specifically. Create this new file:

```markdown
---
name: scraper-coder
description: Use for implementing the Apple Maps-specific scraping logic: Playwright request handlers, MapKit JS response interception, place data extraction and normalization, Ghostery cookie consent setup, and route configuration. More focused than apify-ts-coder for this specific actor.
tools: Read, Write, Edit, MultiEdit, Glob, Grep, Bash, mcp__apify__*, mcp__playwright__*
model: sonnet
color: blue
skills: apify-ops, apify-schemas, mapkit-interception, cookie-consent, ppe-pricing, apify-proxy
---

You are the primary implementation agent for this Apple Maps Apify actor.

## Your scope

- `src/main.ts` — actor entry point, input parsing, crawler instantiation
- `src/routes.ts` — Crawlee router: SEARCH and PLACE handlers
- `src/interceptor.ts` — `page.on('response')` setup and response parsing
- `src/types.ts` — TypeScript interfaces for Input, MapKitPlace, MapKitSearchResponse
- `src/cookies.ts` — Ghostery adblocker setup
- `src/utils.ts` — URL builders, data normalization, geo helpers

## Non-negotiables

1. Network interception only — never scrape the DOM for place data
2. Block service workers: pass `{ serviceWorkers: 'block' }` to browser context
3. Residential proxies: `Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'] })`
4. Cookie consent: `PlaywrightBlocker.fromPrebuiltFull(fetch)` from `@ghostery/adblocker-playwright`
5. PPE charging: `await Actor.pushData(place, 'place-found')` — shortcut charges + pushes
6. All types defined in `src/types.ts` — no inline `any`

## Skill loading

When working on network interception, load the `mapkit-interception` skill.
When working on cookie handling, load the `cookie-consent` skill.
When working on pricing logic, load the `ppe-pricing` skill.
When working on proxy config, load the `apify-proxy` skill.
```

---

## 3 — Update `.claude/skills/`

### Keep existing skills as-is

`actor-scaffold`, `apify-ops`, `apify-schemas`, `skill-creator` — no changes needed.

### Add: `.claude/skills/mapkit-interception/SKILL.md`

Create directory and file:

```markdown
---
name: mapkit-interception
description: Patterns for intercepting MapKit JS API responses from maps.apple.com. Use when implementing or debugging network interception for Apple Maps search results.
allowed-tools: Read, Write, Edit, Grep, Glob
---

# MapKit JS Network Interception

## Target endpoints

| Endpoint | Trigger | Data |
|----------|---------|------|
| `cdn.apple-mapkit.com/ma/bootstrap` | Page load | Auth JWT — 401 here = fatal |
| `api.apple-mapkit.com/v1/search` | URL `?q=` param | Array of place objects |
| `api.apple-mapkit.com/v1/place` | Place detail page | Single enriched place |
| `api.apple-mapkit.com/v1/searchAutocomplete` | Typing in search box | Suggestion strings |

## Passive interception (recommended pattern)

```typescript
// src/interceptor.ts
import type { Page } from 'playwright';
import type { MapKitSearchResponse, MapKitPlace } from './types.js';
import { log } from 'apify';

export function setupInterception(page: Page, results: MapKitPlace[]): void {
    page.on('response', async (response) => {
        const url = response.url();
        if (!url.includes('api.apple-mapkit.com/v1/search')) return;
        if (!response.ok()) return;

        try {
            const data = await response.json() as MapKitSearchResponse;
            const places = data.results ?? [];
            results.push(...places);
            log.debug(`Intercepted ${places.length} places`, { url });
        } catch (err) {
            log.warning('Failed to parse MapKit response', { url, err });
        }
    });
}
```

## Triggering a search

Navigate to `maps.apple.com/?q=<encoded>` — the `q` URL parameter triggers the
automatic search that fires the API call:

```typescript
await page.goto(`https://maps.apple.com/?q=${encodeURIComponent(query)}&lang=${locale}`);
await page.waitForResponse(
    (res) => res.url().includes('api.apple-mapkit.com/v1/search'),
    { timeout: 15_000 },
);
```

## Service workers — critical

apple.com registers service workers that intercept network requests BEFORE Playwright
sees them. You MUST block service workers or the API calls will be invisible:

```typescript
// In PlaywrightCrawler launchContext or preNavigationHooks
const context = await browser.newContext({ serviceWorkers: 'block' });
```

Or via launchContext in the crawler:
```typescript
new PlaywrightCrawler({
    launchContext: {
        userDataDir: undefined,
        launchOptions: { args: ['--disable-gpu'] },
    },
    browserPoolOptions: {
        preLaunchHooks: [(_id, launchContext) => {
            launchContext.launchOptions = {
                ...launchContext.launchOptions,
            };
        }],
    },
    preNavigationHooks: [async ({ page }) => {
        await page.context().route('**/*', (route) => route.continue());
        // Block SW registration
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined });
        });
    }],
});
```

## Known response shape (search endpoint)

```typescript
// src/types.ts
export interface MapKitSearchResponse {
    results: MapKitPlace[];
    displayMapRegion?: { centerLat: number; centerLng: number };
}

export interface MapKitPlace {
    name: string;
    coordinate: { latitude: number; longitude: number };
    formattedAddress: string;
    country: string;
    countryCode: string;
    administrativeArea?: string;
    locality?: string;
    postCode?: string;
    thoroughfare?: string;
    subThoroughfare?: string;
    pointOfInterestCategory?: string;
    telephone?: string;
    urls?: string[];
    rating?: number;
    ratingCount?: number;
    openNowType?: string;
    // enriched via /v1/place:
    hours?: { closingTime: string; openingTime: string; dayOfWeek: number }[];
    photos?: { url: string }[];
}
```

## Auth token

The MapKit JWT is embedded by Apple's own page load — no Apple Developer account needed.
If `cdn.apple-mapkit.com/ma/bootstrap` returns 401, Apple has rotated their token
(rare). Just retry the page load; the token is auto-refreshed per session.
```

### Add: `.claude/skills/cookie-consent/SKILL.md`

```markdown
---
name: cookie-consent
description: Handling cookie consent dialogs on apple.com using @ghostery/adblocker-playwright. Use when implementing or debugging cookie banner dismissal in the Apple Maps actor.
allowed-tools: Read, Write, Edit
---

# Cookie Consent via Ghostery Adblocker

## Package

`@ghostery/adblocker-playwright` — successor to the unmaintained `@cliqz/adblocker-playwright`.
Uses EasyList "Annoyances" filter lists. Blocks consent framework network requests AND
hides DOM elements. Active community maintenance via EasyList.

## Installation

```bash
npm install @ghostery/adblocker-playwright cross-fetch
```

## Setup with disk caching (use this pattern)

Cache the prebuilt engine to disk to avoid re-downloading filter lists on every run:

```typescript
// src/cookies.ts
import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';
import fetch from 'cross-fetch';
import { promises as fs } from 'node:fs';
import type { Page } from 'playwright';

let blocker: PlaywrightBlocker | null = null;

export async function blockAdsAndConsent(page: Page): Promise<void> {
    if (!blocker) {
        blocker = await PlaywrightBlocker.fromPrebuiltFull(fetch, {
            path: './engine.bin',
            read: (p) => fs.readFile(p),
            write: (p, d) => fs.writeFile(p, d),
        });
    }
    blocker.enableBlockingInPage(page);
}
```

Call it in `preNavigationHooks`:

```typescript
preNavigationHooks: [async ({ page }) => {
    await blockAdsAndConsent(page);
}],
```

## Mode comparison

| Method | Covers |
|--------|--------|
| `fromPrebuiltAdsOnly` | Ads only |
| `fromPrebuiltAdsAndTracking` | Ads + trackers |
| `fromPrebuiltFull` | Ads + trackers + annoyances/cookie dialogs ← USE THIS |
| `fromLists(fetch, urls)` | Custom EasyList URLs |

## Fallback click (if banner still appears)

apple.com rarely shows consent banners in headless mode, but if testing shows one:

```typescript
try {
    await page.click('[aria-label*="Accept"], button:has-text("Accept All")', {
        timeout: 3_000,
    });
} catch { /* no banner, continue */ }
```

## Do not use closeCookieModals()

Crawlee's built-in `closeCookieModals()` uses `idcac-playwright` (I Don't Care About
Cookies extension), which has not been maintained since November 2023. It misses many
modern Consent Management Platforms. Use Ghostery instead.
```

### Add: `.claude/skills/ppe-pricing/SKILL.md`

```markdown
---
name: ppe-pricing
description: Implementing Apify Pay-Per-Event (PPE) pricing in the Apple Maps actor. Use when adding charging logic, configuring event names, or testing PPE locally.
allowed-tools: Read, Write, Edit
---

# Pay-Per-Event Pricing

## SDK pattern

```typescript
import { Actor } from 'apify';

await Actor.init();

// Charge for actor initialization (optional — usually $0.05/1000 starts)
await Actor.charge({ eventName: 'init' });

// Charge per result — shortcut: charges AND pushes in one call
await Actor.pushData(placeObject, 'place-found');

// Or charge in bulk without pushing
await Actor.charge({ eventName: 'place-found', count: results.length });

// Check if user's charge limit has been reached before continuing
const cm = Actor.getChargingManager();
if (cm.eventChargeLimitReached('place-found')) {
    log.info('Charge limit reached — stopping');
    break;
}

await Actor.exit();
```

## Event names for this actor

| Event | Trigger | Suggested price |
|-------|---------|-----------------|
| `place-found` | Each place pushed to dataset | $1–3 per 1000 |
| `init` | Actor start | $0.05 per 1000 (platform default) |

## Local testing

```bash
# Simulate PPE mode locally (logs charges, does not actually charge)
ACTOR_TEST_PAY_PER_EVENT=true npm start

# Log charges to storage/datasets/charging_log/ for inspection
ACTOR_USE_CHARGING_LOG_DATASET=true npm start
```

## Key SDK properties

```typescript
const cm = Actor.getChargingManager();
cm.getPricingInfo().isPayPerEvent   // true when PPE mode is active
cm.chargeableWithinLimit            // false when user's maxTotalCharge is reached
cm.eventChargeLimitReached('place-found')  // per-event limit check
```

## User-controlled limit

Users set `maxTotalCharge` in the Actor run input. The Apify SDK enforces it
automatically — you don't need to check it manually; `eventChargeLimitReached`
handles it. Just call it before continuing to the next page/query.

## Revenue

Developer receives ~80% of event charges minus Apify platform compute costs.
Typical Apple Maps scraper pricing on Apify Store: **$1–3 per 1,000 places**.
```

### Add: `.claude/skills/apify-proxy/SKILL.md`

```markdown
---
name: apify-proxy
description: Configuring Apify proxy for the Apple Maps scraper. Use when setting up proxy rotation, session management, or geo-targeting for location-biased search results.
allowed-tools: Read, Write, Edit
---

# Proxy Configuration for Apple Maps

## Why residential proxies

Apple Maps returns **geolocation-biased results** based on the requesting IP address.
- Searching "pizza" from a US IP → US pizza places
- Searching "pizza" from a Czech IP → Czech pizza places
- Datacenter IPs are often rate-limited or blocked entirely by apple.com

Always use `RESIDENTIAL` group. Set `countryCode` to match the target geography.

## Standard setup

```typescript
// src/main.ts
const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: ['RESIDENTIAL'],
    countryCode: input.countryCode ?? 'US',
});

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    useSessionPool: true,
    sessionPoolOptions: {
        sessionOptions: {
            maxUsageCount: 5,       // Rotate proxy after 5 requests per session
            maxErrorScore: 1,       // Retire session after first error
        },
    },
});
```

## Input schema entry

```json
{
  "proxyConfiguration": {
    "sectionCaption": "Proxy and browser",
    "title": "Proxy configuration",
    "type": "object",
    "description": "Residential proxies strongly recommended. The proxy country determines which geographic area Apple Maps returns results for.",
    "editor": "proxy",
    "prefill": { "useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"] },
    "default": { "useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"] }
  },
  "countryCode": {
    "sectionCaption": "Proxy and browser",
    "title": "Country code",
    "type": "string",
    "description": "ISO 3166-1 alpha-2 country code for proxy geo-targeting (e.g. US, GB, DE). Drives which geographic results Apple Maps returns.",
    "default": "US",
    "editor": "textfield"
  }
}
```

## Three mutually exclusive proxy modes (Crawlee)

```typescript
// Mode 1: Static list
proxyUrls: ['http://user:pass@proxy1.example.com:8000']

// Mode 2: Dynamic per-request function
newUrlFunction: async (sessionId) => `http://${sessionId}@proxy.example.com:8000`

// Mode 3: Tiered fallback (try cheap proxies first, fall back to residential)
tieredProxyUrls: [
    ['http://datacenter1:8000'],      // tier 1 — cheap
    ['http://residential1:8000'],     // tier 2 — fallback
]
```

Only one of these can be set at a time. `proxyConfiguration` from
`Actor.createProxyConfiguration()` uses `newUrlFunction` internally — do not also
set `proxyUrls` or `tieredProxyUrls` in the same crawler config.
```

---

## 4 — Update `CLAUDE.md`

Replace the current `CLAUDE.md` with the following. The current file is a generic Apify actor template with no Apple Maps specifics. The new version should be concise (under 150 lines), use `@AGENTS.md` import for cross-tool compatibility, and add Claude Code-specific pointers.

```markdown
# Apple Maps Scraper — Apify Actor

> Full instructions in AGENTS.md (imported below)

@AGENTS.md

---

## Claude Code specifics

### Agents
- `@scraper-coder` — primary implementation agent for this actor (routes, interception, normalization)
- `@apify-ts-coder` — TypeScript patterns, type definitions, general refactoring  
- `@network-interceptor` — live Playwright MCP browser exploration of `maps.apple.com` API endpoints
- `@debugger` — runtime error diagnosis (read-only, never modifies code)
- `@schema-expert` — `.actor/input_schema.json`, output/dataset schemas, Console UI
- `@code-reviewer` — post-change code review against checklist
- `@test-runner` — `npm test` and local `apify run` validation

### Skills (invoke with /skill-name or mention to load)
- `/mapkit-interception` — MapKit JS endpoint patterns, interception code, known response shapes
- `/cookie-consent` — Ghostery adblocker setup for apple.com banners
- `/ppe-pricing` — Pay-Per-Event SDK patterns, local testing commands
- `/apify-proxy` — Residential proxy config, session management, geo-targeting
- `/apify-ops` — Platform operations: builds, runs, datasets, storage
- `/apify-schemas` — Input/output/dataset schema spec and Console UI patterns

### MCP servers (configured in .mcp.json)
- **Apify** — `mcp__apify__*` — actor docs, run management, storage access
- **Playwright** — `mcp__playwright__*` — live browser for API discovery and testing  
  Say "use Playwright MCP" to trigger the network-interceptor agent workflow
- **Fetch** — HTTP without a browser, for checking API responses

### Key non-obvious facts
- Service workers on apple.com hide network requests — always block them
- Apple Maps results are IP-geolocation biased — proxy country = result country
- The MapKit JWT is Apple's own embedded token — no Developer account needed
- Do NOT use `closeCookieModals()` — it relies on unmaintained IDCAC; use Ghostery
```

---

## 5 — Update `.actor/actor.json`

Update the `generatedBy` field in `.actor/actor.json` from `"<FILL-IN-MODEL>"` to `"Claude Code with claude-sonnet-4-6"`.

Also update the `name` from `"my-actor"` and `"title"` from the template values to Apple Maps-specific values:
- `name`: `"apple-maps-scraper"`
- `title`: `"Apple Maps Scraper"`
- `description`: `"Scrapes Apple Maps for places, businesses, and POIs via MapKit JS API network interception. Returns name, coordinates, address, category, phone, rating, and more."`

---

## 6 — Update `.actor/input_schema.json`

Replace the current generic template schema with an Apple Maps-specific schema:

```json
{
    "$schema": "https://apify.com/schemas/v1/input.ide.json",
    "title": "Apple Maps Scraper",
    "type": "object",
    "schemaVersion": 1,
    "properties": {
        "searchQueries": {
            "sectionCaption": "Input",
            "title": "Search queries",
            "type": "array",
            "description": "Search terms to run on Apple Maps, e.g. 'coffee shops in Prague' or 'dentists near 90210'. Each query produces up to maxResultsPerQuery results.",
            "editor": "stringList",
            "prefill": ["restaurants in New York"]
        },
        "startUrls": {
            "sectionCaption": "Input",
            "title": "Direct Apple Maps URLs",
            "type": "array",
            "description": "Direct maps.apple.com URLs to scrape instead of search queries.",
            "editor": "requestListSources"
        },
        "maxResultsPerQuery": {
            "sectionCaption": "Limits",
            "title": "Max results per query",
            "type": "integer",
            "description": "Maximum number of places returned per search query.",
            "default": 100,
            "minimum": 1,
            "maximum": 500
        },
        "locale": {
            "sectionCaption": "Localization",
            "title": "Language / locale",
            "type": "string",
            "description": "Language code passed to Apple Maps API (e.g. en-US, fr-FR, de-DE). Affects result language.",
            "default": "en-US",
            "editor": "textfield"
        },
        "countryCode": {
            "sectionCaption": "Localization",
            "title": "Country code",
            "type": "string",
            "description": "ISO 3166-1 alpha-2 country code for proxy geo-targeting. Drives which geographic results Apple Maps returns.",
            "default": "US",
            "editor": "textfield"
        },
        "proxyConfiguration": {
            "sectionCaption": "Proxy",
            "title": "Proxy configuration",
            "type": "object",
            "description": "Residential proxies strongly recommended. Datacenter IPs are often blocked by Apple Maps. Proxy country determines geographic result bias.",
            "editor": "proxy",
            "prefill": { "useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"] },
            "default": { "useApifyProxy": true, "apifyProxyGroups": ["RESIDENTIAL"] }
        }
    },
    "required": ["searchQueries"]
}
```

---

## Checklist

After all changes, verify:

- [ ] `.mcp.json` has all three servers (apify, playwright, fetch)
- [ ] `.claude/agents/selector-analyzer.md` deleted
- [ ] `.claude/agents/network-interceptor.md` created
- [ ] `.claude/agents/scraper-coder.md` created
- [ ] `apify-ts-coder.md` updated with Apple Maps section
- [ ] `code-reviewer.md` updated with Apple Maps checklist section
- [ ] `.claude/skills/mapkit-interception/SKILL.md` created
- [ ] `.claude/skills/cookie-consent/SKILL.md` created
- [ ] `.claude/skills/ppe-pricing/SKILL.md` created
- [ ] `.claude/skills/apify-proxy/SKILL.md` created
- [ ] `CLAUDE.md` replaced with new version
- [ ] `.actor/actor.json` `generatedBy`, `name`, `title`, `description` updated
- [ ] `.actor/input_schema.json` replaced with Apple Maps schema
