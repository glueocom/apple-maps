---
allowed-tools: Bash(apify:*), Bash(git:*), Bash(npm:*)
description: Deploy Actor to Apify platform (one-shot, no error fixing loop)
---

Deploy the current Actor to Apify platform. For iterative deploy with automatic error fixing, use `/deploy-and-get-working` instead.

## Pre-deployment checklist

1. Verify logged in: `apify whoami`
2. Verify actor target: `apify info` - confirm `<username>/<actor-name>` is correct
3. Check for uncommitted changes: `git status`
4. Run build: `npm run build`
5. Run tests if available: `npm test`

## Git Integration Warning

If `apify info` shows source is "Git repository", warn the user that `apify push` will break Git integration and switch to Web IDE source.

## Deploy

```bash
apify push
```

## Post-deployment

Report the deployment URL and any warnings from the push output.

## Common Error Patterns

| Error Pattern | Fix Location |
|--------------|--------------|
| `Invalid input schema` | `.actor/input_schema.json` |
| `Invalid output schema` | `.actor/output_schema.json` |
| `Invalid dataset schema` | `.actor/dataset_schema.json` |
| `COPY failed` | `Dockerfile` |
| `npm ERR!` | `package.json` |
| `TS\d+:` | TypeScript source files |
