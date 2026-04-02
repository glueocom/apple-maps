# Update apple-maps Claude Code setup

Update the Claude Code configuration in this repo to fix stale and broken patterns found
during an audit against the Apify ecosystem as of April 2026.

Read every file listed below before making any change. Make all changes as described.
No reformatting, no extra blank lines, no unrelated edits.

---

## Files to read first

- `.mcp.json`
- `CLAUDE.md`
- `AGENTS.md`
- `.claude/settings.json`
- `.claude/skills/apify-ops/SKILL.md`
- `.claude/skills/ppe-pricing/SKILL.md`
- `.claude/skills/apify-proxy/SKILL.md`

---

## Fix 1 — `.mcp.json`: wrong `--tools` flag values + migrate to Streamable HTTP

**Problem 1a — broken tool category names.**
The current config passes `--tools actors,docs,actor-runs,apify-storage` to
`@apify/actors-mcp-server`. The correct category names are:
- `actor-runs` → `runs`
- `apify-storage` → `storage`

**Problem 1b — Apify SSE transport removed April 1 2026.**
The stdio `npx` invocation still works locally, but the hosted SSE endpoint
(`actors-mcp-server.apify.actor/sse`) is dead. Migrate the `apify` entry to the
hosted Streamable HTTP endpoint so Claude Code can connect to it in both local
and CI contexts without npx overhead.

**Problem 1c — `@anthropic/fetch-mcp` is redundant.**
Claude Code has native HTTP fetch. Remove the `fetch` entry entirely.

**Replace `.mcp.json` with exactly:**

```json
{
    "mcpServers": {
        "apify": {
            "type": "http",
            "url": "https://mcp.apify.com?tools=actors,docs,runs,storage",
            "headers": {
                "Authorization": "Bearer ${APIFY_TOKEN}"
            }
        },
        "playwright": {
            "command": "npx",
            "args": [
                "-y",
                "@playwright/mcp@latest",
                "--browser",
                "chromium",
                "--headless",
                "--caps",
                "core,devtools",
                "--block-service-workers",
                "--viewport-size",
                "1280x720"
            ]
        }
    }
}
```

---

## Fix 2 — `.claude/settings.json`: remove stale `enabledMcpjsonServers` entry

`fetch` was removed from `.mcp.json`. Remove it from `enabledMcpjsonServers` too.

Change:
```json
"enabledMcpjsonServers": ["apify", "playwright", "fetch"]
```
To:
```json
"enabledMcpjsonServers": ["apify", "playwright"]
```

---

## Fix 3 — `CLAUDE.md`: update MCP section and add mcpc + CLI notes

**Problem 3a — MCP server list references the removed `fetch` entry.**
**Problem 3b — No mention of `mcpc` for token-efficient tool discovery.**
**Problem 3c — Missing `apify run --resurrect` note (CLI v1.1.0+: storage is purged by default).**

In the `### MCP servers` section, replace the current three-bullet list:

```
- **Apify** — `mcp__apify__*` — actor docs, run management, storage access
- **Playwright** — `mcp__playwright__*` — live browser for API discovery and testing  
  Say "use Playwright MCP" to trigger the network-interceptor agent workflow
- **Fetch** — HTTP without a browser, for checking API responses
```

With:

```
- **Apify** — `mcp__apify__*` — actor docs, run management, storage access  
  Hosted at `mcp.apify.com` via Streamable HTTP. Tools: actors, docs, runs, storage.  
  For token-efficient discovery use `mcpc @apify tools-list` / `mcpc @apify tools-call <tool> arg:=value --json` via Bash instead of loading all schemas.
- **Playwright** — `mcp__playwright__*` — live browser for API discovery and testing  
  Say "use Playwright MCP" to trigger the network-interceptor agent workflow
```

Then add a new subsection after `### Key non-obvious facts`:

```markdown
### CLI non-obvious facts
- `apify run` purges local storage by default (CLI v1.1.0+) — use `apify run --resurrect` to keep previous state
- `apify push` respects `.actorignore` to exclude files from the deployed image
- Actor tool names in MCP use double-dash format: `apify--rag-web-browser` (not slash)
```

---

## Fix 4 — `AGENTS.md`: fix `apify run` docs and add `.actorignore`

**Problem 4a — `apify run` in the Commands section has no purge warning.**
**Problem 4b — `.actorignore` not documented.**
**Problem 4c — `apify actor-runs` and `apify-storage` wrong flag names used implicitly in prose.**

In the `## Commands` block, replace:

```bash
apify run                              # Run Actor locally
```

With:

```bash
apify run                              # Run Actor locally (purges storage by default)
apify run --resurrect                  # Run locally, keep previous storage state
```

In the `## Project Structure` block, add after the `Dockerfile` line:

```
.actorignore    # Files/dirs excluded from apify push (like .dockerignore for the CLI)
```

In the `## Do` list, add:

```
- use `.actorignore` to exclude `node_modules/`, `storage/`, test fixtures, and prompt files from `apify push`
```

---

## Fix 5 — `.claude/skills/ppe-pricing/SKILL.md`: fix `ChargingManager` API

**Problem — `cm.chargeableWithinLimit` and `cm.eventChargeLimitReached()` are stale.**
The current SDK v3.3.0+ `ChargingManager` API uses:
- `cm.calculateMaxEventChargeCountWithinLimit(eventName)` → returns remaining chargeable count (`Infinity` if free)
- `Actor.charge()` returns `{ eventChargeLimitReached: boolean }` directly

`Actor.pushData(item, eventName)` two-argument overload is now official — keep it.

Replace the `## Key SDK properties` section with:

```markdown
## Key SDK properties

```typescript
const cm = Actor.getChargingManager();
cm.getPricingInfo().isPayPerEvent                        // true when PPE mode is active
cm.getMaxTotalChargeUsd()                               // user's spending limit in USD
cm.getChargedEventCount('place-found')                  // events charged so far
cm.calculateMaxEventChargeCountWithinLimit('place-found') // remaining budget (Infinity = free)
```

`Actor.charge()` returns `{ eventChargeLimitReached: boolean }` — check it and stop when true.

`Actor.pushData(items)` also accepts an event name as second arg and returns `ChargeResult`:
```typescript
const { eventChargeLimitReached } = await Actor.pushData(place, 'place-found');
if (eventChargeLimitReached) break;
```
```

Also update the SDK pattern example at the top — replace:

```typescript
const cm = Actor.getChargingManager();
if (cm.eventChargeLimitReached('place-found')) {
    log.info('Charge limit reached — stopping');
    break;
}
```

With:

```typescript
const { eventChargeLimitReached } = await Actor.charge({ eventName: 'place-found' });
if (eventChargeLimitReached) {
    log.info('Charge limit reached — stopping');
    break;
}
```

---

## Fix 6 — `.claude/skills/apify-ops/SKILL.md`: add new CLI commands

**Problem — CLI commands section is missing the entire v1.x command surface.**

Add a new subsection to the `## CLI Commands (Preferred for Builds)` section:

```markdown
### New in CLI v1.x

```bash
# Runs
apify runs ls --actor <actorId>        # List runs
apify runs info <runId>                # Run details
apify runs log <runId>                 # Run logs
apify runs abort <runId>               # Abort a run

# Datasets (alias: apify ds)
apify datasets ls                      # List datasets
apify datasets get-items <id>          # Download items

# Key-value stores (alias: apify kvs)
apify key-value-stores ls
apify key-value-stores get-value <id> <key>

# Builds
apify builds add-tag -b <buildId> -t latest   # Tag a build
apify builds remove-tag -b <buildId> -t beta

# Actors
apify actors calculate-memory         # Suggest memory for Actor
apify actors search <query>           # Search Apify Store

# Misc
apify upgrade                          # Self-update CLI
apify auth token                       # Print current API token
apify secrets ls                       # List stored secrets
```
```

---

## Verification

After all edits:

1. Run `cat .mcp.json` — confirm no `fetch` entry, `apify` uses `type: http` and `mcp.apify.com`.
2. Run `cat .claude/settings.json` — confirm `enabledMcpjsonServers` has no `fetch`.
3. Run `grep -n "resurrect\|purge" CLAUDE.md AGENTS.md` — confirm both mention it.
4. Run `grep -n "chargeableWithinLimit" .claude/skills/ppe-pricing/SKILL.md` — should return nothing (removed).
5. Run `grep -n "calculateMaxEventChargeCountWithinLimit" .claude/skills/ppe-pricing/SKILL.md` — should return a hit.
