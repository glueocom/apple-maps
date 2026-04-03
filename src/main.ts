import { setTimeout } from 'node:timers/promises';
import type { RequestOptions } from '@crawlee/playwright';
import { PlaywrightCrawler } from '@crawlee/playwright';
import { Actor, log } from 'apify';
import { blockAdsAndConsent } from './cookies.js';
import { setupPlaceInterception, setupSearchInterception } from './interceptor.js';
import { router } from './routes.js';
import type { AppleMapsResult, Input } from './types.js';
import { buildSearchUrl } from './utils.js';

await Actor.init();

Actor.on('aborting', async () => {
    await setTimeout(1000);
    await Actor.exit();
});

await Actor.charge({ eventName: 'init' });

const input = await Actor.getInput<Input>();
if (!input) {
    await Actor.fail('No input provided');
    throw new Error('unreachable');
}

const {
    searchQueries = [],
    startUrls = [],
    maxResultsPerQuery = 100,
    locale = 'en-US',
    countryCode = 'US',
    proxyConfiguration: proxyInput,
} = input;

if (searchQueries.length === 0 && startUrls.length === 0) {
    await Actor.fail('Either searchQueries or startUrls must be provided');
    throw new Error('unreachable');
}

const proxyConfiguration = await Actor.createProxyConfiguration({
    ...(proxyInput ?? { groups: ['RESIDENTIAL'] }),
    countryCode, // Always apply countryCode for geo-targeting
});

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    requestHandler: router,
    maxRequestsPerCrawl: searchQueries.length * maxResultsPerQuery + startUrls.length,
    maxConcurrency: 3,
    useSessionPool: true,
    sessionPoolOptions: {
        sessionOptions: {
            maxUsageCount: 5,
            maxErrorScore: 1,
        },
    },
    launchContext: {
        launchOptions: {
            args: ['--disable-gpu'],
        },
    },
    browserPoolOptions: {
        preLaunchHooks: [
            (_pageId, launchContext) => {
                launchContext.browserContextOptions = Object.assign({}, launchContext.browserContextOptions, {
                    serviceWorkers: 'block' as const,
                    // Use a real desktop user agent — Apple Maps redirects to /unsupported for headless browsers
                    userAgent:
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    viewport: { width: 1920, height: 1080 },
                });
            },
        ],
    },
    preNavigationHooks: [
        async ({ page, request }) => {
            // Block service workers via init script
            await page.addInitScript(() => {
                Object.defineProperty(navigator, 'serviceWorker', { get: () => undefined });
            });

            // Block ads and cookie consent dialogs
            await blockAdsAndConsent(page);

            // Set up network interception BEFORE navigation so we capture API responses
            const results: AppleMapsResult[] = [];
            const isPlaceDetail = request.label === 'place';
            if (isPlaceDetail) {
                await setupPlaceInterception(page, results);
            } else {
                await setupSearchInterception(page, results);
            }
            request.userData.interceptedResults = results;
        },
    ],
});

const requests: RequestOptions[] = [];

for (const query of searchQueries) {
    requests.push({
        url: buildSearchUrl(query, locale),
        userData: { query },
    });
}

for (const startUrl of startUrls) {
    const url = typeof startUrl === 'string' ? startUrl : startUrl.url;
    requests.push({
        url,
        label: 'place',
        userData: { query: url },
    });
}

log.info(`Starting crawl with ${requests.length} requests`);

await crawler.run(requests);

await Actor.exit();
