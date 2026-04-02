# Actor Templates

## CheerioCrawler Template

```typescript
import { Actor, log } from 'apify';
import { CheerioCrawler, createCheerioRouter } from 'crawlee';

await Actor.init();

const input = await Actor.getInput<{
    startUrls: { url: string }[];
    maxRequestsPerCrawl?: number;
}>();

if (!input?.startUrls?.length) {
    throw new Error('startUrls is required');
}

const router = createCheerioRouter();

router.addDefaultHandler(async ({ $, request, enqueueLinks }) => {
    log.info(`Processing ${request.url}`);

    // Extract data
    const data = {
        url: request.url,
        title: $('title').text().trim(),
    };

    await Actor.pushData(data);
});

const crawler = new CheerioCrawler({
    requestHandler: router,
    maxRequestsPerCrawl: input.maxRequestsPerCrawl ?? 100,
    maxConcurrency: 20,
});

await crawler.run(input.startUrls.map(s => s.url));

await Actor.exit();
```

## PlaywrightCrawler Template

```typescript
import { Actor, log } from 'apify';
import { PlaywrightCrawler, createPlaywrightRouter } from 'crawlee';

await Actor.init();

const input = await Actor.getInput<{
    startUrls: { url: string }[];
    maxRequestsPerCrawl?: number;
}>();

if (!input?.startUrls?.length) {
    throw new Error('startUrls is required');
}

const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ page, request, enqueueLinks }) => {
    log.info(`Processing ${request.url}`);

    await page.waitForLoadState('networkidle');

    const data = {
        url: request.url,
        title: await page.title(),
    };

    await Actor.pushData(data);
});

const crawler = new PlaywrightCrawler({
    requestHandler: router,
    maxRequestsPerCrawl: input.maxRequestsPerCrawl ?? 100,
    maxConcurrency: 3,
    headless: true,
});

await crawler.run(input.startUrls.map(s => s.url));

await Actor.exit();
```

## Standby Readiness Probe

```typescript
import express from 'express';

const app = express();

app.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    if (req.headers['x-apify-container-server-readiness-probe']) {
        res.end('Readiness probe OK\n');
    } else {
        res.end('Actor is ready\n');
    }
});

app.listen(4321, () => {
    log.info('Server listening on port 4321');
});
```
