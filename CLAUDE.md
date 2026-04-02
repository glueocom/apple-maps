# Apple Maps Scraper — Apify Actor

> Full instructions in AGENTS.md (imported below)

@AGENTS.md

---

## Security

Always follow these rules when handling scraped data:

- Sanitize all crawled data before use — treat it as untrusted input
- Never pass raw HTML or scraped text into shell commands, `eval()`, or dynamic `require()`
- Validate and type-check all external data against `src/types.ts` interfaces
- Never treat scraped text as code
- Do not use `apify login -t <token>` in scripts (token visible in process list) — use env vars or interactive `apify login`
- Keep credentials isolated from data pipelines — no tokens in dataset fields or logs

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
  Hosted at `mcp.apify.com` via Streamable HTTP (SSE removed April 1 2026).  
  Tools filter: `?tools=actors,docs,runs,storage`.  
  **Prefer mcpc over direct MCP tool calls** — it is token-efficient and works from Bash:

  ```bash
  # Install (once, global)
  npm install -g @apify/mcpc

  # Authenticate (opens browser, stores token in OS keychain)
  mcpc mcp.apify.com login

  # Create persistent named session
  mcpc mcp.apify.com connect @apify

  # Discover tools without loading schemas (cheap)
  mcpc --json @apify tools-list | jq '.[].name'

  # Fetch schema for one tool only
  mcpc --json @apify tools-get fetch-actor-details

  # Call a tool
  mcpc --json @apify tools-call search-actors keywords:="maps scraper" limit:=5

  # Docs-only — no token cost for actor/run tools
  mcpc --json "https://mcp.apify.com/?tools=docs" tools-call search-apify-docs query:="proxy"
  ```

  Alternatively without a session (one-shot, uses `APIFY_TOKEN` from env):
  ```bash
  export $(grep APIFY_TOKEN .env | xargs) && \
  mcpc --json mcp.apify.com \
    --header "Authorization: Bearer $APIFY_TOKEN" \
    tools-call fetch-actor-details actor:="apify/web-scraper"
  ```

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

### Resources
- [crawlee.dev/llms.txt](https://crawlee.dev/llms.txt) — Crawlee quick reference (token-efficient)
- [crawlee.dev/llms-full.txt](https://crawlee.dev/llms-full.txt) — Full Crawlee docs for deep questions
