---
allowed-tools: Read, Write, Edit, Glob, Grep, Task, mcp__apify__search-apify-docs, mcp__apify__fetch-apify-docs
description: Review and fix Claude Code configuration issues
---

# Review Claude Code Setup

**Auto-fix all issues - don't just report.**

Comprehensive review of Claude Code configuration files for this project. Auto-fixes issues and reports changes.

## Documentation Sources

Before reviewing, consult these sources for best practices:

**Claude Code Documentation:**
- Use `Task` tool with `subagent_type: claude-code-guide` to research Claude Code best practices
- Topics: slash commands, settings, hooks, MCP servers, agents

**Apify Documentation:**
- Use MCP tools: `search-apify-docs` and `fetch-apify-docs`
- Or reference `.claude/skills/apify-ops/` for platform operations
- Topics: Actor development, schemas, deployment, Crawlee patterns

## Files to Review

- `CLAUDE.md` - Project instructions
- `.claude/settings.json` - Project settings
- `.claude/settings.local.json` - Local settings (if exists)
- `.claude/commands/*.md` - Custom commands/skills
- `.mcp.json` - MCP server configuration

## Checks to Perform

### 1. File References & Links

Check for broken references:
- File paths mentioned in CLAUDE.md that don't exist
- References to commands that don't exist
- Invalid tool names in command frontmatter `allowed-tools`

### 2. CLAUDE.md Best Practices

- Should have clear sections (Commands, Code Style, Critical Rules)
- Commands section should list actual commands from `.claude/commands/`
- No placeholder text like `<FILL-IN>`, `TODO`, `FIXME` unless intentional
- No duplicate instructions
- Code blocks should specify language
- File paths should use backticks

### 3. MCP Configuration

Check `.mcp.json`:
- Valid JSON syntax
- Server names are descriptive
- Command paths exist (e.g., `npx` is available)
- Environment variables referenced exist or are documented
- No duplicate server definitions

### 4. Settings Files

Check `.claude/settings.json`:
- Valid JSON syntax
- No deprecated settings
- `allowedTools` patterns are valid
- MCP server configurations are correct

### 5. Commands Best Practices

For each `.claude/commands/*.md`:
- Has valid YAML frontmatter with `---` delimiters
- `description` field is present and concise
- `allowed-tools` validation:
  - Uses valid tool names (see reference below)
  - Uses fine-grained Bash patterns like `Bash(git:*)` instead of `Bash(*)`
- No placeholder text in instructions
- Clear step-by-step instructions
- No references to non-existent files or commands

Available frontmatter fields:
- `allowed-tools` - Tools the command can use (inherits from conversation if omitted)
- `description` - Brief command description
- `argument-hint` - Hint for arguments (e.g., `[message]`)
- `model` - Specific model to use
- `context` - Set to `fork` for isolated execution

### 6. Clutter & Cleanup

- Remove empty sections
- Remove commented-out content that's no longer relevant
- Remove duplicate instructions across files
- Fix inconsistent formatting
- Remove trailing whitespace

## Valid Tool Names Reference

```
Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch, Task, TodoWrite,
AskUserQuestion, NotebookEdit, Skill, KillShell, EnterPlanMode, ExitPlanMode, mcp__*
```

Bash pattern examples:
- `Bash(git:*)` - all git commands
- `Bash(npm:*)` - all npm commands
- `Bash(apify:*)` - all apify CLI commands
- `Bash(cat:*)`, `Bash(ls:*)` - specific commands

## Output

After review, provide:

1. **Issues Found** - List of all issues detected
2. **Fixes Applied** - List of auto-fixes made
3. **Manual Action Needed** - Issues that require user decision
4. **Summary** - Overall health of Claude Code setup