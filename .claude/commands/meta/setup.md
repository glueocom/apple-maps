---
description: Audit, cleanup, research, and update the entire .claude/ setup — agents, skills, commands, rules, MCP servers, settings, activation patterns. No args = full audit + cleanup + update. With path = fix specific file/folder.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch, Task, AskUserQuestion
model: claude-opus-4-6
argument-hint: [path to .md file or folder in .claude/]
---

# Claude Setup — Audit, Cleanup, Research, and Update

Comprehensive audit, cleanup, and update of the `.claude/` ecosystem. Scans the codebase, identifies orphaned/stale/bloated files, asks user about cleanup, then creates missing content and validates everything.

**Scope**: `.claude/` directory, `CLAUDE.md` files, `.mcp.json`, `settings.json`. Does NOT touch `prompts/` (backup) or actual repo code.

## Mode

- **No arguments**: Full audit + cleanup + update of entire `.claude/` directory
- **With path**: Fix specific .md file or folder only

## Step INVENTORY: Catalog Current Setup

Read every file in `.claude/`:

```
.claude/agents/**/*.md     → name, description, tools, skills, model, line count
.claude/skills/**/SKILL.md → name, description, version, frontmatter fields used
.claude/commands/**/*.md   → description, argument-hint, allowed-tools, line count
.claude/rules/**/*.md      → purpose (first heading + paragraph)
```

Also read: `CLAUDE.md`, `settings.json`, `.mcp.json`.

Track **line counts** for every file — needed for bloat detection in cleanup.

If running in path-specific mode, read only the target file/folder.

## Step CODEBASE_SCAN: Map Technology Domains

Scan the actual codebase to understand what technologies are in use:

- Read `package.json` — extract framework/library dependencies
- Read `src/` files — understand the actor's architecture and patterns
- Check for `.actor/`, `actor.json` — Apify actor configuration
- Check for `tsconfig.json`, `vitest.config.*` — build and test setup
- Read `Dockerfile` — deployment configuration

### Apple Maps Actor specifics

This repo is a **TypeScript Apify Actor** using **Crawlee PlaywrightCrawler** that scrapes `maps.apple.com` via **MapKit JS API network interception** (not DOM parsing).

Key technology domains to validate coverage for:
- **Network interception** — `page.on('response')` for `api.apple-mapkit.com` endpoints
- **Playwright browser automation** — service worker blocking, cookie consent
- **Apify platform** — PPE pricing, proxy configuration, dataset schemas
- **MapKit JS API** — search, place detail, autocomplete endpoints

Build a technology domain map: which technologies exist and which `.claude/` files cover them.

Skip this step in path-specific mode.

## Step GAP_ANALYSIS: Identify Gaps AND Cleanup Candidates

Compare inventory against codebase domains. Build two lists: **gaps** (missing) and **cleanup** (orphaned/stale/bloated).

### Cleanup candidates to identify

- **Orphaned skills** — skills for technologies not used in this actor
- **Orphaned agents** — agents for tech domains not present (e.g., CSS selector agents in a network-interception actor)
- **Completed one-time commands** — commands whose task is verified done
- **Stale commands** — commands with outdated paths or references to removed MCP servers
- **Bloated agents** — agents over 100 lines. Suggest trimming: extract to skill resources, reference rules instead of repeating content.
- **Invalid frontmatter** — skills/agents with unrecognized fields. Valid skill fields: `name`, `displayName`, `description`, `version`. Flag anything else.
- **Redundant MCP servers** — servers overlapping with built-in tools (e.g., `filesystem` MCP vs native Read/Write/Edit)
- **Stale CLAUDE.md references** — version inconsistencies, TODO comments, incomplete agent/skill lists
- **Missing settings permissions** — MCP servers in `.mcp.json` with no permissions in `settings.json`

### Gaps to identify

- **Missing agents** — technology domains with no specialist agent
- **Missing skills** — technologies used but no skill directory
- **Missing commands** — common workflows without slash commands
- **Missing rules** — conventions used across multiple files but not documented

### Apple Maps-specific gap checks

- `network-interceptor` agent exists for Playwright MCP browser exploration
- `scraper-coder` agent exists for Apple Maps implementation
- `mapkit-interception` skill covers endpoint patterns and response shapes
- `cookie-consent` skill covers Ghostery adblocker setup
- `ppe-pricing` skill covers Pay-Per-Event SDK patterns
- `apify-proxy` skill covers residential proxy and geo-targeting
- `.mcp.json` has all three servers: apify, playwright, fetch
- `code-reviewer` has Apple Maps-specific checklist items
- `selector-analyzer` agent is NOT present (irrelevant for network interception)

### Research for gaps

For each identified gap, research current best practices using official documentation and Claude Code docs.

Skip in path-specific mode (only check the target file).

## Step CLEANUP: Ask User and Remove Orphaned/Stale/Bloated Files

**This step is interactive.** Present cleanup findings grouped by category and use `AskUserQuestion` to get user confirmation before each action.

Do NOT touch the `prompts/` folder — it's a backup.

### Present findings by category

For each category, show a table of candidates with file path, line count, and reason. Then ask which items to **delete**, **archive** (move to `prompts/archive/claude-setup-cleanup-YYYY-MM-DD/`), **keep**, or **trim**.

### Cleanup categories (in order)

- **Orphaned skills** — skills for technologies not used
- **Orphaned agents** — agents for technologies not present
- **Completed one-time commands** — verified done
- **Stale commands** — outdated references, completed migrations
- **Bloated agents** (>100 lines) — suggest trimming
- **Invalid frontmatter** — auto-fix, inform user
- **Redundant MCP servers** — overlapping with built-in tools
- **Stale CLAUDE.md content** — version mismatches, TODO comments (auto-fix, inform user)
- **Missing settings permissions** — MCP servers without whitelisted permissions

### After user confirmation

- Archive confirmed items to `prompts/archive/claude-setup-cleanup-YYYY-MM-DD/`
- Delete confirmed items from `.claude/`
- Auto-fix factual corrections and invalid frontmatter
- Trim confirmed bloated agents
- Update `.mcp.json` and `settings.json` as needed

Skip in path-specific mode (only clean up the target file if it has issues).

## Step ASK_IMPROVEMENTS: Ask User About Desired Improvements

Before creating new content, ask the user what they want. Use `AskUserQuestion`:

- **Agents**: "These agents are proposed: [list]. Which do you want?"
- **Skills**: "These skills are proposed: [list]. Which do you want?"
- **Commands**: "These commands are proposed: [list]. Which do you want?"

Only create items the user confirms. Skip in path-specific mode.

## Step FIX_ACTIVATION: Fix Activation Patterns

For every agent in `.claude/agents/**/*.md`:

- Check `description` for activation keywords (`USE PROACTIVELY`, `ACTIVATE for`, `ACTIVATE when`, `Use when`)
- If missing, add appropriate keywords based on the agent's purpose
- Check for `skills:` field — add if missing, using relevant existing skills

## Step FIX_SKILLS_REFS: Ensure Skill References Resolve

For every agent with `skills:` field:
- Verify `.claude/skills/{name}/SKILL.md` exists for each referenced skill
- If missing: create the skill (if valuable) or remove the reference

## Step CREATE_MISSING: Create Missing Agents, Skills, Commands

Based on gap analysis and user confirmation, create missing files.

## Step UPDATE_CLAUDE_MD: Sync CLAUDE.md

Update `CLAUDE.md` to reflect changes:

- Add/remove agents in the agents section
- Add/remove skills from the skills section
- Update MCP server references
- Fix version references
- Remove stale TODO comments
- Remove references to deleted agents, skills, or commands

## Step VALIDATE: Run Validation Checks

After all changes, validate:

- **Frontmatter**: Every agent has `name`, `description`, `tools`, `model`. Every skill has `name`, `description`. Every command has `description`.
- **Skills references**: Every `skills:` reference resolves to an existing skill directory
- **Cross-references**: Every rule/skill path referenced in agents or CLAUDE.md exists
- **Activation**: Every agent has activation keywords in description
- **MCP alignment**: Every MCP server in `.mcp.json` has permissions in `settings.json`

Report results as a summary:
- Files **deleted**: N (list them)
- Files **archived**: N (list them)
- Files **created**: N (list them)
- Files **modified**: N (list them with brief change description)
- Files **trimmed**: N (old line count → new line count)
- Files **skipped**: N (already correct)
- Validation issues: N (list any remaining problems)
