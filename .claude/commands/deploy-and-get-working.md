---
description: Deploy to Apify, build, test run, and fix errors until everything works (iterative loop)
allowed-tools: Bash(*), Read(*), Edit(*), Write(*), Glob(*), Grep(*), Skill(*), AskUserQuestion(*)
---

# Deploy and Get Working

Automated workflow to deploy code to Apify platform, wait for build, run a test scrape, and fix any errors until everything works. For simple one-shot deploy, use `/deploy` instead.

## Pre-flight Checks (REQUIRED)

### 1. Verify Apify CLI Login

```bash
apify info
```

If not logged in, stop and inform the user to run `apify login` first.

### 2. Verify Actor Target

The `apify push` command uses:
- **Actor name** from `.actor/actor.json` (`name` field)
- **Logged-in user** to form `<username>/<actor-name>`

Check the current actor configuration:

```bash
cat .actor/actor.json | grep '"name"'
apify info
```

**STOP and confirm with the user:**
- "This will push to actor `<username>/<actor-name>`. Is this correct?"
- If the actor doesn't exist yet, it will be created
- Only proceed after user confirms the target is correct

### 3. Check Git Integration

If `apify info` shows the actor source is "Git repository":

1. **STOP and ask the user**: "This actor is currently linked to a Git repository. Running `apify push` will break Git integration and switch to Web IDE source. Do you want to proceed?"
2. Only continue if the user explicitly confirms
3. If user declines, suggest using `/commit` instead

### 4. Check for Uncommitted Changes

```bash
git status
```

If there are uncommitted changes, inform the user. They may want to commit first.

### 5. Run Tests (if available)

```bash
npm test
```

If tests fail, fix them before proceeding.

## Phase 1: Local Build & Run

### 1.1 Build Locally

Validate TypeScript compiles before running:

```bash
npm run build
```

If local build fails, fix TypeScript errors before proceeding.

### 1.2 Run Locally with Test Input

Run the Actor locally to verify it works before deploying:

```bash
apify run
```

**Input Selection Strategy (be autonomous):**

1. **Check input_schema.json for `prefill` values** - These are the recommended test inputs!
   ```bash
   cat .actor/input_schema.json
   ```
   Look for `"prefill"` fields - use these URLs/values as test input.

2. **Analyze the Actor code for URL patterns** (if no prefill or prefill is generic):
   - Check `src/routes.ts` for `globs`, `regexps`, or URL patterns in `enqueueLinks()`
   - If the Actor is designed for a specific site (e.g., `apify.com/*`), use that site's URL
   - Example: If routes.ts has `globs: ['https://apify.com/*']`, use `https://apify.com` as test URL

3. **Check for existing test input**: Look for `storage/key_value_stores/default/INPUT.json`

4. **If no specific pattern found**:
   - Use the input schema's prefill URL if available
   - Otherwise use `https://example.com` as a generic fallback
   - Add limit field: `maxRequestsPerCrawl: 5` (enough to generate output)

5. **If specialized Actor** (requires API keys, credentials, or non-public URLs): Ask the user what to scrape

**Example: Determine test input from code analysis:**
```bash
# Check prefill in input schema
cat .actor/input_schema.json | grep -A2 prefill

# Check URL patterns in routes
grep -E "(globs|regexp|url)" src/routes.ts
```

**Use `-i` flag for inline input:**
```bash
apify run -i '{"startUrls":[{"url":"https://apify.com"}],"maxRequestsPerCrawl":5}'
```

### 1.3 Verify Local Run Success

Check local run output:

```bash
# Check if dataset has items
ls storage/datasets/default/ 2>/dev/null
cat storage/datasets/default/*.json 2>/dev/null | head -50
```

**If no dataset output but run completed without errors:**
- The Actor may need more requests to produce output (e.g., first page enqueues links, second page scrapes data)
- Increase `maxRequestsPerCrawl` (try 5-10) and run again
- Check routes.ts to understand the scraping flow

**If local run fails:**
1. Analyze the error from the run output
2. Fix the source code
3. Rebuild: `npm run build`
4. **Repeat from step 1.2** until local run succeeds with output data

## Phase 2: Deploy to Apify Platform

### 2.1 Push to Apify

Deploy to Apify platform:

```bash
apify push
```

This uploads source code and triggers a build on Apify infrastructure.

### 2.2 Wait for Build

Poll build status:

```bash
# Wait for build to start processing
sleep 5

# Check build status
apify builds ls
```

Keep polling every 10-15 seconds until the latest build shows "Succeeded" or "Failed".

### 2.3 Check Build Result

If **SUCCEEDED**: Proceed to Phase 3 (Platform Test).

If **FAILED**:
1. Fetch build log using the build ID from `apify builds ls`:
   ```bash
   apify builds log <BUILD_ID>
   ```

2. Analyze the error type:
   - Schema validation errors → Fix `*_schema.json` files
   - Dockerfile errors → Fix `Dockerfile`
   - Dependency errors → Fix `package.json`, run `npm install`
   - TypeScript errors → Fix source files, run `npm run build`

3. Apply fix locally

4. **Repeat from Phase 1** (local build and run, then push again)

## Phase 3: Platform Test Run

After build succeeds, verify the Actor works on the Apify platform.

### 3.1 Run on Platform

Execute a test run on Apify with the same input used for local testing:

```bash
# Use the same input that worked locally
apify call -o --input '{"startUrls":[{"url":"<URL_FROM_LOCAL_TEST>"}],"maxRequestsPerCrawl":5}'
```

- The `-o` flag prints the dataset output directly after the run completes
- **IMPORTANT**: Use the exact same input that produced output locally
- The command waits for the run to complete and shows results

### 3.2 Check Run Result

After `apify call` completes, check if it succeeded:

```bash
# List recent runs
apify runs ls

# Get run log (use run ID from apify runs ls or from apify call output)
apify runs log <RUN_ID>
```

**If RUN SUCCEEDED with data:**
- Verify output dataset has items
- The workflow is complete!

**If RUN FAILED or no output:**
1. Fetch run log to diagnose:
   ```bash
   apify runs log <RUN_ID>
   ```

2. Common run errors and fixes:

| Error Pattern | Likely Cause | Fix |
|--------------|--------------|-----|
| `Navigation timeout` | Page too slow or blocking | Add retry logic, increase timeout, check proxy settings |
| `net::ERR_NAME_NOT_RESOLVED` | Invalid URL | Fix URL in input or code |
| `Target closed` | Browser crash | Reduce concurrency, add error handling |
| `Request blocked` | Anti-bot protection | Use proxy, add headers, reduce rate |
| `Cannot read property of undefined` | Selector not found | Fix CSS selectors, add null checks |
| `Out of memory` | Memory limit exceeded | Reduce batch size, optimize memory usage |
| `Input validation failed` | Invalid input format | Fix input to match schema |

3. Fix the code locally
4. **Repeat from Phase 1** (full cycle: local build, local run, push, platform test)

## Arguments

$ARGUMENTS - Optional: specific files to focus on, "skip-local-run" to skip local run test, or "skip-tests" to skip npm test

## Error Type Reference (Build Errors)

| Error Pattern | Fix Location |
|--------------|--------------|
| `Invalid input schema` | `.actor/input_schema.json` |
| `Invalid output schema` | `.actor/output_schema.json` |
| `Invalid dataset schema` | `.actor/dataset_schema.json` |
| `COPY failed` | `Dockerfile` |
| `npm ERR!` | `package.json` |
| `TS\d+:` | TypeScript source files |
| `Cannot find module` | Missing dependency |

## Apify CLI Commands Reference

```bash
# Check login status and actor info
apify info

# Login to Apify (if needed)
apify login

# Run locally
apify run

# Run locally with inline input
apify run -i '{"key":"value"}'

# Push to Apify (triggers build)
apify push

# Push to specific actor (override actor.json name)
apify push --actor-id <username>/<actor-name>

# List recent builds
apify builds ls

# Get build log
apify builds log <BUILD_ID>

# Run the actor on platform
apify call

# Run with inline input
apify call --input '{"key":"value"}'

# Run and output dataset results
apify call -o --input '{"key":"value"}'

# List recent runs
apify runs ls

# Get run log
apify runs log <RUN_ID>
```

## Success Criteria

The workflow completes when ALL of the following pass:
1. Pre-flight checks pass (logged in, correct target confirmed)
2. Local `npm run build` passes
3. Local `apify run` completes successfully with output data
4. `apify push` succeeds
5. Build status is `SUCCEEDED`
6. `apify call` (platform run) completes successfully with output data

Report to the user:
- Build URL: `https://console.apify.com/actors/<actorId>/builds/<buildId>`
- Run URL: `https://console.apify.com/actors/<actorId>/runs/<runId>`
- Dataset URL (if applicable): `https://console.apify.com/storage/datasets/<datasetId>`

## Restoring Git Integration

If you need to restore Git integration after using this command:
1. Go to Apify Console → Actor Settings → Source
2. Change source type back to "Git repository"
3. Re-link the repository URL and branch

## Troubleshooting Flowchart

```
START
  │
  ▼
[Pre-flight checks] ──FAIL──► Fix or abort
  │ PASS
  ▼
[Local Build] ──FAIL──► Fix TypeScript errors ──┐
  │ PASS                                        │
  ▼                                             │
[Local Run] ──FAIL──► Fix code ─────────────────┘
  │ PASS
  ▼
[Push to Apify]
  │
  ▼
[Build Status] ──FAIL──► Fix errors ──► Back to Local Build
  │ PASS
  ▼
[Platform Run] ──FAIL──► Fix errors ──► Back to Local Build
  │ PASS
  ▼
SUCCESS! Report URLs to user
```
