---
allowed-tools: Bash(npm:*), Read
description: Lint Actor code and fix issues
---

Run linting and fix common issues.

## Steps

1. Run ESLint: `npm run lint`
2. If fix available: `npm run lint -- --fix`
3. Run TypeScript check: `npm run typecheck` or `npx tsc --noEmit`
4. Report remaining issues

## Common Issues

- Missing type annotations
- Unused imports
- Incorrect async/await usage
- Console.log instead of apify/log
