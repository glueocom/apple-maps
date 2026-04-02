---
name: actor-scaffold
description: Creates new Apify Actor projects with proper structure, schemas, and boilerplate. Use when starting a new Actor.
allowed-tools: Read, Write, Bash, Glob
---

# Actor Scaffold

Create new Apify Actor projects with complete structure.

## Quick Start

When creating a new Actor:

1. Determine crawler type based on target site:
   - Static HTML -> CheerioCrawler
   - Dynamic/JS-heavy -> PlaywrightCrawler

2. Create project structure:
```
.actor/
├── actor.json
├── input_schema.json
└── output_schema.json
src/
├── main.ts
├── routes.ts
└── types.ts
package.json
Dockerfile
```

3. Set up actor.json with standby mode enabled:
```json
{
    "actorSpecification": 1,
    "name": "my-actor",
    "title": "My Actor",
    "version": "1.0.0",
    "usesStandbyMode": true
}
```

4. Configure input schema with proper defaults

5. Implement readiness probe if standby enabled

## Templates

For detailed templates, see [TEMPLATES.md](TEMPLATES.md).
