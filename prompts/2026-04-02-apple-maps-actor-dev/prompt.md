# Develop Apple Maps Scraper Actor

Implement the Apple Maps scraper Apify Actor in TypeScript. The actor scrapes `maps.apple.com` via **MapKit JS API network interception** using Crawlee PlaywrightCrawler — no DOM parsing for place data.

Before making any changes, read the files listed below to understand the current state. Do not assume — read first.

Files to read before starting:
- `CLAUDE.md`
- `package.json`
- `.actor/actor.json`
- `.actor/input_schema.json`
- `src/main.ts`
- `src/routes.ts`
- `.claude/skills/mapkit-interception/SKILL.md`
- `.claude/skills/cookie-consent/SKILL.md`
- `.claude/skills/ppe-pricing/SKILL.md`
- `.claude/skills/apify-proxy/SKILL.md`

---

## Skills and Agents

- `@scraper-coder` — primary implementation agent
- `@apify-ts-coder` — TypeScript patterns, type safety
- `@network-interceptor` — live Playwright MCP browser exploration (use for debugging)
- `@code-reviewer` — post-implementation review
- `@test-runner` — validation
- `/mapkit-interception` — endpoint patterns, interception code
- `/cookie-consent` — Ghostery adblocker setup
- `/ppe-pricing` — Pay-Per-Event pricing
- `/apify-proxy` — residential proxy config

---

## Step 1 — Install dependencies

Add missing packages:

```bash
npm install @ghostery/adblocker-playwright cross-fetch
```

---

## Step 2 — Create `src/types.ts`

Define all TypeScript interfaces:

- `Input` — actor input matching `.actor/input_schema.json` (searchQueries, startUrls, maxResultsPerQuery, locale, countryCode, proxyConfiguration)
- `MapKitSearchResponse` — `{ results: MapKitPlace[]; displayMapRegion?: { centerLat: number; centerLng: number } }`
- `MapKitPlace` — all known fields from MapKit JS API search response:
  - `name`, `coordinate.latitude`, `coordinate.longitude`, `formattedAddress`
  - `country`, `countryCode`, `administrativeArea`, `locality`, `postCode`
  - `thoroughfare`, `subThoroughfare`, `pointOfInterestCategory`
  - `telephone`, `urls`, `rating`, `ratingCount`, `openNowType`
  - Enriched fields (from `/v1/place`): `hours[]`, `photos[]`
- `PlaceResult` — normalized output shape pushed to dataset (flat, clean field names)

No inline `any` anywhere.

---

## Step 3 — Create `src/interceptor.ts`

Implement passive network interception using the pattern from `/mapkit-interception` skill.

- Export `setupInterception(page: Page, results: MapKitPlace[]): void`
- Listen on `page.on('response')` for URLs containing `api.apple-mapkit.com/v1/search`
- Parse successful JSON responses as `MapKitSearchResponse`
- Push parsed `results[]` into the shared array
- Log intercepted count with `apify/log`
- Gracefully handle non-JSON responses (skip with warning)

---

## Step 4 — Create `src/cookies.ts`

Implement cookie consent / ad blocking using the pattern from `/cookie-consent` skill.

- Export `blockAdsAndConsent(page: Page): Promise<void>`
- Use `PlaywrightBlocker.fromPrebuiltFull(fetch)` from `@ghostery/adblocker-playwright`
- Cache the blocker engine to disk (`./engine.bin`) to avoid re-downloading filter lists
- Use singleton pattern (initialize once, reuse across pages)

Do NOT use Crawlee's `closeCookieModals()` — it relies on unmaintained IDCAC.

---

## Step 5 — Create `src/utils.ts`

Utility functions:

- `buildSearchUrl(query: string, locale: string): string` — builds `https://maps.apple.com/?q=<encoded>&lang=<locale>`
- `normalizePlaceData(place: MapKitPlace, query: string): PlaceResult` — converts raw MapKit response fields to clean flat output:
  - `name`, `latitude`, `longitude`, `address`, `country`, `countryCode`
  - `state` (from `administrativeArea`), `city` (from `locality`), `postalCode` (from `postCode`)
  - `street` (from `thoroughfare`), `streetNumber` (from `subThoroughfare`)
  - `category` (from `pointOfInterestCategory`), `phone` (from `telephone`)
  - `website` (first URL from `urls[]`), `rating`, `ratingCount`
  - `isOpenNow` (boolean derived from `openNowType`)
  - `searchQuery` (the original query string)
  - `scrapedAt` (ISO 8601 UTC timestamp)

---

## Step 6 — Rewrite `src/routes.ts`

Replace the template router with Apple Maps-specific handlers:

### SEARCH handler (default)

1. Call `setupInterception(page, results)` before navigation
2. Call `blockAdsAndConsent(page)` in preNavigationHooks or at handler start
3. Navigate to the search URL built from the query
4. Wait for the MapKit API response (`page.waitForResponse` with 15s timeout)
5. Optionally scroll / interact to trigger additional result loads if `maxResultsPerQuery > initial batch`
6. Normalize each intercepted place via `normalizePlaceData()`
7. Push results via `Actor.pushData(result, 'place-found')` (PPE charging)
8. Check `Actor.getChargingManager().eventChargeLimitReached('place-found')` before continuing

### PLACE handler (label: 'place')

For direct Apple Maps place URLs (`maps.apple.com/place/...`):
1. Set up interception for `api.apple-mapkit.com/v1/place`
2. Navigate to the place URL
3. Intercept the place detail response
4. Normalize and push the enriched result

---

## Step 7 — Rewrite `src/main.ts`

Replace the template boilerplate:

1. `await Actor.init()`
2. `await Actor.charge({ eventName: 'init' })` — PPE init charge
3. Read and validate input (`Actor.getInput<Input>()`)
4. Validate `searchQueries` or `startUrls` present (fail early with `Actor.fail()`)
5. Create proxy configuration:
   - `Actor.createProxyConfiguration({ groups: ['RESIDENTIAL'], countryCode: input.countryCode ?? 'US' })`
   - Or use `input.proxyConfiguration` if provided directly
6. Create `PlaywrightCrawler` with:
   - `proxyConfiguration`
   - `requestHandler: router`
   - `maxRequestsPerCrawl` derived from query count * `maxResultsPerQuery`
   - `maxConcurrency: 3` (browser — keep low)
   - `launchContext` with `--disable-gpu` arg
   - `preNavigationHooks` that block service workers:
     ```
     await page.addInitScript(() => {
         Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined });
     });
     ```
   - `useSessionPool: true` with session rotation (maxUsageCount: 5, maxErrorScore: 1)
7. Build request list from `searchQueries` (each as a search URL with `userData: { query }`) and `startUrls` (with label `'place'`)
8. `await crawler.run(requests)`
9. `await Actor.exit()`

---

## Step 8 — Update `.actor/output_schema.json` and `.actor/dataset_schema.json`

Define output schema matching the `PlaceResult` interface from step 5. Include all normalized fields with descriptions and examples.

---

## Step 9 — Review, test, autofix

1. Run `npm run build` — fix any TypeScript errors
2. Run `npm run lint` — fix any linting issues
3. Run `npm test` if tests exist
4. Run `apify run --purge` locally with test input:
   ```json
   { "searchQueries": ["coffee shops in San Francisco"], "maxResultsPerQuery": 5 }
   ```
5. Check dataset output for correct fields and data
6. Use `@code-reviewer` agent to review against the Apple Maps checklist:
   - Service workers blocked
   - Network interception (not DOM selectors)
   - Residential proxies
   - Ghostery `fromPrebuiltFull`
   - PPE event name `'place-found'`
   - No inline `any`
7. Fix all issues found

---

## Competitive context

This actor competes with existing Apple Maps scrapers on Apify Store. Key differentiators to aim for:

- **Completeness**: Extract all available fields (ratings, hours, photos, category)
- **Reliability**: Service worker blocking + Ghostery consent handling = robust automation
- **Geo-targeting**: Residential proxy with country code = accurate location-biased results
- **PPE pricing**: $1-3 per 1,000 places — competitive with existing scrapers
- **Clean output**: Flat, normalized field names (not raw MapKit nested objects)
- **TypeScript**: Full type safety, no `any`
