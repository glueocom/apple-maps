---
allowed-tools: Read, Glob, Grep, Task, Edit, Write
description: Verify all content from original AGENTS.md is migrated to Claude Code structure
---

# Verify AGENTS.md Migration

**Auto-fix all missing content - don't just report.**

Compare the original `docs/original-AGENTS.md` file against the current Claude Code structure to ensure all information has been properly migrated.

## Source and Targets

**Source file:** `docs/original-AGENTS.md`

**Target locations:**
- `CLAUDE.md` - Project-level instructions (commands, code style, critical rules)
- `.claude/agents/*.md` - Specialized agent definitions
- `.claude/commands/*.md` - Slash commands
- `.claude/rules/*.md` - Always-active rules and patterns
- `.claude/skills/*/SKILL.md` - Skill definitions with reference materials

## Migration Mapping

The original AGENTS.md sections should map to:

| Original Section | Target Location | Notes |
|-----------------|-----------------|-------|
| What are Apify Actors? | `CLAUDE.md` or `skills/actor-scaffold/` | Core concepts |
| Core Concepts | `CLAUDE.md` | Brief summary |
| Do / Don't | `rules/apify-patterns.md` | Always-active rules |
| Logging | `rules/apify-patterns.md` | Logging best practices |
| Standby Mode | `rules/apify-patterns.md` or `CLAUDE.md` | Critical rule |
| Commands | `CLAUDE.md` | CLI reference |
| Safety and Permissions | `.claude/settings.json` | Permissions config |
| Project Structure | `CLAUDE.md` or `skills/actor-scaffold/` | Directory layout |
| Actor Input Schema | `skills/apify-schemas/SKILL.md` | Schema specs |
| Actor Output Schema | `skills/apify-schemas/SKILL.md` | Schema specs |
| Dataset Schema | `skills/apify-schemas/SKILL.md` | Schema specs |
| Key-Value Store Schema | `skills/apify-schemas/SKILL.md` | Schema specs |
| Apify MCP Tools | `skills/apify-ops/` | MCP tool reference |
| Resources | `CLAUDE.md` or skills | External links |

## Verification Steps

### 1. Parse Original AGENTS.md

Read and extract all sections from `docs/original-AGENTS.md`:
- Section headers (## level)
- Code examples
- Lists of do's and don'ts
- Configuration examples

### 2. Check Each Target File

For each target location, verify the corresponding content exists:

**CLAUDE.md checklist:**
- [ ] Commands section with CLI reference
- [ ] Code Style section
- [ ] Crawler Selection guidance
- [ ] Concurrency Settings
- [ ] Critical Rules (standby mode, Dataset.getInfo, etc.)

**rules/apify-patterns.md checklist:**
- [ ] Do's list (all items from original)
- [ ] Don'ts list (all items from original)
- [ ] Logging guidance with `apify/log`
- [ ] Standby mode rules

**skills/apify-schemas/SKILL.md checklist:**
- [ ] Input schema structure and example
- [ ] Output schema structure and example
- [ ] Dataset schema structure and example
- [ ] Key-value store schema structure and example
- [ ] Template variables reference

**skills/apify-ops/ checklist:**
- [ ] MCP tools reference
- [ ] CLI commands reference
- [ ] API endpoints reference

### 3. Content Comparison

For each section in original AGENTS.md:
1. Find where it should be in new structure
2. Verify content is present and complete
3. Note any missing items or discrepancies

### 4. Report Format

Generate a report with:

```
## Migration Verification Report

### Fully Migrated
- [x] Section name → target file

### Partially Migrated
- [~] Section name → target file
  - Missing: specific items

### Not Migrated
- [ ] Section name
  - Content summary
  - Suggested target

### Recommendations
- List of suggested actions
```

## Output

Provide:
1. **Coverage Summary** - Percentage of original content migrated
2. **Detailed Report** - Section-by-section analysis
3. **Missing Content** - Specific items not found in new structure
4. **Recommendations** - Suggested fixes or additions
