# Apify Actor Development

## Commands

```bash
apify run              # Run Actor locally
apify push             # Deploy to Apify platform
apify login            # Authenticate account
npm test               # Run tests
npm run lint           # Lint code
```

## Code Style

- Use TypeScript with strict mode
- Use `apify/log` for logging (censors sensitive data)
- Use ES modules (import/export)
- Validate input early, fail gracefully

## Crawler Selection

- **CheerioCrawler**: Static HTML (10x faster than browsers)
- **PlaywrightCrawler**: JavaScript-heavy sites, dynamic content
- Use router pattern for complex crawls

## Concurrency Settings

- HTTP/Cheerio: 10-50 concurrent requests
- Browser/Playwright: 1-5 concurrent requests

## Critical Rules

- NEVER disable standby mode without explicit permission
- ALWAYS implement readiness probe for standby Actors
- NEVER use `Dataset.getInfo()` for final counts on Cloud
- NEVER use deprecated `additionalHttpHeaders` - use `preNavigationHooks`
