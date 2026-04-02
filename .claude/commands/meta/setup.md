---
description: Audit, cleanup, and update the .claude/ setup — agents, skills, commands, rules, MCP servers, settings. No args = full audit. With path = fix specific file/folder.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
model: claude-opus-4-6
argument-hint: [path to .md file or folder in .claude/]
---

# Claude Setup — Audit, Cleanup, and Update

Audit and fix the `.claude/` ecosystem. Scan codebase, find orphaned/stale/bloated files, ask user about cleanup, create missing content, validate.

**Scope**: `.claude/`, `CLAUDE.md`, `.mcp.json`, `settings.json`. Does NOT touch `prompts/` or repo source code.

**Mode**: No args = full audit. With path = fix that file/folder only.

## Step INVENTORY

Get line counts and read frontmatter for every file:

```bash
# One-liner to inventory all .claude/ files with line counts
for f in .claude/agents/*.md; do echo "$(wc -l < "$f") $f"; done
for f in .claude/skills/*/SKILL.md; do echo "$(wc -l < "$f") $f"; done
find .claude/commands -name "*.md" -exec sh -c 'echo "$(wc -l < "$1") $1"' _ {} \;
```

Also read: `CLAUDE.md`, `.claude/settings.json`, `.mcp.json`, `.claude/rules/*.md`.

In path-specific mode, read only the target.

## Step CODEBASE_SCAN

Read `package.json`, `src/` files, `.actor/actor.json`, `tsconfig.json`, `biome.json`, `Dockerfile` to build a technology domain map.

This repo: **TypeScript Apify Actor** using **Crawlee PlaywrightCrawler** scraping `maps.apple.com` via **MapKit JS API network interception** (not DOM parsing). Linting/formatting via **Biome** (not ESLint/Prettier).

Key domains: network interception (`api.apple-mapkit.com`), Playwright automation, Apify platform (PPE, proxy, schemas), MapKit JS API, Ghostery cookie consent.

Skip in path-specific mode.

## Step GAP_ANALYSIS

Compare inventory against codebase. Build two lists:

### Cleanup candidates

| Check | What to look for |
|-------|-----------------|
| Orphaned agents/skills | For technologies not in this repo (e.g., selector-analyzer in a network-interception actor, actor-scaffold when actor already exists) |
| Imported-from-other-repo commands | Commands referencing paths/projects that don't exist here (e.g., `apps/contextractor-apify/`, `pnpm-workspace.yaml`, `pyproject.toml`) |
| Stale commands | References to removed tools (ESLint when using Biome), missing files, completed one-time tasks |
| Bloated agents | Over 100 lines — trim generic philosophy, keep only actionable guidance |
| Stale CLAUDE.md | References to agents/skills that don't exist as files |
| Stale settings.json | MCP permissions for servers not in `.mcp.json`, irrelevant plugins |
| Stale .mcp.json | Servers not in `settings.json` `enabledMcpjsonServers` |

### Gaps to identify

- Missing agents for technology domains in use
- Missing skills for patterns used repeatedly
- Missing commands for common workflows
- CLAUDE.md not listing all actual agents/skills

### Expected state (validate these exist)

| Type | Name | Purpose |
|------|------|---------|
| Agent | `scraper-coder` | Apple Maps implementation (routes, interception) |
| Agent | `apify-ts-coder` | TypeScript patterns, general refactoring |
| Agent | `network-interceptor` | Playwright MCP browser exploration |
| Agent | `code-reviewer` | Post-change review with Apple Maps checklist |
| Agent | `test-runner` | `npm test` and `apify run` validation |
| Skill | `mapkit-interception` | Endpoint patterns, response shapes |
| Skill | `cookie-consent` | Ghostery adblocker for apple.com |
| Skill | `ppe-pricing` | Pay-Per-Event SDK patterns |
| Skill | `apify-proxy` | Residential proxy, geo-targeting |
| Skill | `apify-ops` | Platform operations |
| Skill | `apify-schemas` | Input/output/dataset schemas |
| MCP | `apify` | Actor docs, runs, storage |
| MCP | `playwright` | Live browser with `--block-service-workers` |
| MCP | `fetch` | HTTP without browser |

## Step CLEANUP

**Interactive.** Present findings in a table (file, lines, reason) and use `AskUserQuestion` to confirm actions: **delete**, **keep**, or **trim**.

After confirmation:
- Delete confirmed files, remove empty directories
- Auto-fix invalid frontmatter and stale references
- Trim bloated agents (extract generic content, keep actionable parts)
- Sync `.mcp.json` ↔ `settings.json` `enabledMcpjsonServers`
- Remove stale MCP permissions from `settings.json` `allow` list

## Step FIX

For every agent:
- Verify `description` has activation keywords (`Use PROACTIVELY`, `Use when`, `Use for`)
- Verify `skills:` references resolve to existing `.claude/skills/{name}/SKILL.md`
- Remove references to deleted skills

Sync `CLAUDE.md`:
- List only agents that exist as files in `.claude/agents/`
- List only skills that exist as directories in `.claude/skills/`
- List only MCP servers present in `.mcp.json`

## Step VALIDATE

```bash
# Check all skill references resolve
grep -h "^skills:" .claude/agents/*.md | tr ',' '\n' | sed 's/skills: //' | xargs -I{} test -f .claude/skills/{}/SKILL.md

# Check MCP alignment
diff <(grep -oE '"[a-z]+":' .mcp.json | tr -d '":' | sort) <(grep -A20 enabledMcpjsonServers .claude/settings.json | grep '"' | tr -d ' ",' | sort)
```

Validate:
- Every agent has `name`, `description`, `tools`, `model` in frontmatter
- Every skill has `name`, `description` in frontmatter
- Every command has `description` in frontmatter
- All skill references resolve
- All CLAUDE.md agent/skill/MCP references match actual files
- MCP servers aligned between `.mcp.json` and `settings.json`

Report summary: files deleted, created, modified, trimmed, skipped, validation issues.
