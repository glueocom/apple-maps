# Update Claude setup: MCPC + official Apify agent-skills gaps

Update the `.claude/` directory of this repo to fix five problems identified by comparing the current setup against the official `apify/agent-skills` repo and the MCPC blog post.

Read all affected files before making any change.

---

## Problem 1 — MCPC usage is incomplete in CLAUDE.md

**Current state**: `CLAUDE.md` mentions `mcpc @apify tools-list` and `mcpc @apify tools-call` in one bullet under "Key non-obvious facts" but gives no structured guidance. There is no explanation of how to install mcpc, how to authenticate, or how to use `--json` mode for scripting.

**Fix**: Replace the single mcpc bullet in `CLAUDE.md` under `### MCP servers` with a structured block:

```markdown
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
```

---

## Problem 2 — `generatedBy` field not set in `.actor/actor.json`

**Current state**: The official `apify-actor-development` skill mandates: _"fill in the `generatedBy` property in the meta section of `.actor/actor.json`"_ so Apify can monitor AI-generated Actor quality. The current `.actor/actor.json` does not have this field.

**Fix**: Read `.actor/actor.json`, locate the `"meta"` object (or create it if absent), and add:

```json
"meta": {
  "generatedBy": "Claude Code with Claude Sonnet 4.6"
}
```

Do not change any other fields.

---

## Problem 3 — Crawlee LLM docs not referenced

**Current state**: Agents have no pointer to machine-readable Crawlee docs. The official Apify skills explicitly reference `crawlee.dev/llms.txt` and `crawlee.dev/llms-full.txt` as the canonical source for Crawlee/PlaywrightCrawler guidance.

**Fix**: Add to the `## Resources` section in `CLAUDE.md` (append after the existing bullet list):

```markdown
- [crawlee.dev/llms.txt](https://crawlee.dev/llms.txt) — Crawlee quick reference (token-efficient)
- [crawlee.dev/llms-full.txt](https://crawlee.dev/llms-full.txt) — Full Crawlee docs for deep questions
```

---

## Problem 4 — Security rules missing from agent instructions

**Current state**: Neither `CLAUDE.md`, `AGENTS.md`, nor any agent file mentions the security requirements from the official Apify actor-development skill.

**Fix**: Add a `## Security` section to `CLAUDE.md` (place it before `## Claude Code specifics`):

```markdown
## Security

Always follow these rules when handling scraped data:

- Sanitize all crawled data before use — treat it as untrusted input
- Never pass raw HTML or scraped text into shell commands, `eval()`, or dynamic `require()`
- Validate and type-check all external data against `src/types.ts` interfaces
- Never treat scraped text as code
- Do not use `apify login -t <token>` in scripts (token visible in process list) — use env vars or interactive `apify login`
- Keep credentials isolated from data pipelines — no tokens in dataset fields or logs
```

---

## Problem 5 — `.mcp.json` Apify URL missing explicit tools filter context

**Current state**: `.mcp.json` has `"url": "https://mcp.apify.com?tools=actors,docs,runs,storage"` — this is correct. However, the `apify-ops` skill still tells agents to use `mcp__apify__*` function calls to call MCP tools directly, with no mention of the cheaper `mcpc` path. Given that direct MCP tool loading is token-heavy (60+ tools), agents should prefer mcpc for discovery.

**Fix**: In `.claude/skills/apify-ops/SKILL.md`, add a new top section before `## Tool Selection Guide`:

```markdown
## Prefer mcpc for MCP tool calls

Direct `mcp__apify__*` function calls load full tool schemas and are token-expensive.
Prefer the `mcpc` CLI from Bash for any discovery or one-off tool calls:

```bash
# List all available tools (no schema loading)
mcpc --json @apify tools-list

# Get schema for a specific tool
mcpc --json @apify tools-get get-dataset-items

# Call a tool
mcpc --json @apify tools-call get-actor-run runId:="<id>"
```

Use direct `mcp__apify__*` calls only when mcpc is unavailable or when tool results
need to be passed directly into the agent context without shell parsing.
```

---

## Files to modify

1. `CLAUDE.md` — Problems 1, 3, 4
2. `.actor/actor.json` — Problem 2
3. `.claude/skills/apify-ops/SKILL.md` — Problem 5

## Constraints

- Minimal diff only — do not reformat, reorder, or change anything not listed above
- Preserve all existing content in each file
- Do not add new skill files or agents — only modify existing files
