# Apple Maps Scraper — Apify Actor

> Full instructions in AGENTS.md (imported below)

@AGENTS.md

---

## Claude Code specifics

### Agents
- `@scraper-coder` — primary implementation agent for this actor (routes, interception, normalization)
- `@apify-ts-coder` — TypeScript patterns, type definitions, general refactoring  
- `@network-interceptor` — live Playwright MCP browser exploration of `maps.apple.com` API endpoints
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
  Hosted at `mcp.apify.com` via Streamable HTTP. Tools: actors, docs, runs, storage.  
  For token-efficient discovery use `mcpc @apify tools-list` / `mcpc @apify tools-call <tool> arg:=value --json` via Bash instead of loading all schemas.
- **Playwright** — `mcp__playwright__*` — live browser for API discovery and testing  
  Say "use Playwright MCP" to trigger the network-interceptor agent workflow

### Key non-obvious facts
- Service workers on apple.com hide network requests — always block them
- Apple Maps results are IP-geolocation biased — proxy country = result country
- The MapKit JWT is Apple's own embedded token — no Developer account needed
- Do NOT use `closeCookieModals()` — it relies on unmaintained IDCAC; use Ghostery

### CLI non-obvious facts
- `apify run` purges local storage by default (CLI v1.1.0+) — use `apify run --resurrect` to keep previous state
- `apify push` respects `.actorignore` to exclude files from the deployed image
- Actor tool names in MCP use double-dash format: `apify--rag-web-browser` (not slash)
