---
description: Audit, cleanup, and update the .claude/ setup — agents, skills, commands, rules, MCP servers, settings. No args = full audit. With path = fix specific file/folder.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion
model: claude-opus-4-6
argument-hint: [path to .md file or folder in .claude/]
---

# Claude Setup — Audit & Fix

Audit `.claude/`, `CLAUDE.md`, `.mcp.json`, `settings.json`. Does NOT touch `prompts/` or source code.

No args = full audit. With path = fix that file/folder only.

## 1. Inventory

Run in parallel:

```bash
# Line counts for all .claude/ content
for f in .claude/agents/*.md; do echo "$(wc -l < "$f") $f"; done
for f in .claude/skills/*/SKILL.md; do echo "$(wc -l < "$f") $f"; done
find .claude/commands -name "*.md" -exec sh -c 'echo "$(wc -l < "$1") $1"' _ {} \;
```

Also read: `CLAUDE.md`, `.claude/settings.json`, `.mcp.json`, `.claude/rules/*.md`.

In path-specific mode, read only the target — skip to step 3.

## 2. Codebase Scan

Read `package.json`, `src/` files, `.actor/actor.json` to build a technology domain map. Identify frameworks, tools, and key domains actually in use.

## 3. Gap Analysis

Compare inventory against codebase. Find:

**Cleanup candidates:**
- Orphaned agents/skills for technologies not in this repo
- Commands referencing paths/projects that don't exist here
- Stale references to removed tools (e.g., ESLint when using Biome)
- Bloated files over 100 lines — trim generic content, keep actionable parts
- `CLAUDE.md` referencing agents/skills that don't exist as files
- `.mcp.json` ↔ `settings.json` `enabledMcpjsonServers` misalignment

**Gaps:**
- Missing agents for technology domains in use
- Missing skills for patterns used repeatedly
- `CLAUDE.md` not listing all actual agents/skills/MCP servers

**Frontmatter validation:**
- Agents: must have `name`, `description` (with activation keywords like `Use PROACTIVELY`/`Use when`/`Use for`), `tools`, `model`
- Agent `tools:` must include file access tools (Read, Write, Edit) if the agent writes code
- Skills: must have `name`, `description`
- Commands: must have `description`
- All `skills:` references in agents must resolve to `.claude/skills/{name}/SKILL.md`

## 4. Cleanup (Interactive)

Present findings in a table (file, lines, issue) and use `AskUserQuestion` to confirm: **delete**, **keep**, or **trim**.

After confirmation:
- Delete confirmed files, remove empty directories
- Fix invalid frontmatter and stale references
- Trim bloated files
- Sync `.mcp.json` ↔ `settings.json`

## 5. Validate

```bash
# Skill references resolve
grep -h "^skills:" .claude/agents/*.md | tr ',' '\n' | sed 's/skills: //' | xargs -I{} test -f .claude/skills/{}/SKILL.md

# MCP alignment
diff <(grep -oE '"[a-z]+":' .mcp.json | tr -d '":' | sort) \
     <(grep -A20 enabledMcpjsonServers .claude/settings.json | grep '"' | tr -d ' ",' | sort)
```

Report summary: files deleted, created, modified, trimmed, validation issues.
