import { createPlaywrightRouter } from '@crawlee/playwright';
import { Actor, log } from 'apify';
import type { AppleMapsResult } from './types.js';
import { normalizePlaceData } from './utils.js';

export const router = createPlaywrightRouter();

const isSearchResponse = (url: string) =>
    (url.includes('maps.apple.com/data/search') &&
        !url.includes('search-home') &&
        !url.includes('search-placeholder')) ||
    url.includes('api.apple-mapkit.com/v1/search?');

const isPlaceResponse = (url: string) =>
    url.includes('maps.apple.com/data/place') || url.includes('api.apple-mapkit.com/v1/place');

router.addDefaultHandler(async ({ request, page }) => {
    const query = (request.userData.query as string) || '';
    log.info(`Searching: "${query}"`, { url: request.url });

    const results = request.userData.interceptedResults as AppleMapsResult[];

    try {
        await page.waitForResponse((res) => isSearchResponse(res.url()) && res.ok(), {
            timeout: 30_000,
        });
    } catch {
        log.warning(`No search response received for "${query}"`, { url: request.url });
    }

    // Short delay to collect any additional responses
    await page.waitForTimeout(2_000);

    if (results.length === 0) {
        log.warning(`No results found for "${query}"`);
        return;
    }

    log.info(`Found ${results.length} places for "${query}"`);

    let pushed = 0;
    let skipped = 0;
    for (const result of results) {
        const normalized = normalizePlaceData(result, query);
        if (!normalized) {
            skipped++;
            continue;
        }

        await Actor.pushData(normalized);
        pushed++;
    }
    log.info(`Pushed ${pushed} places, skipped ${skipped}`);

    if (pushed > 0) {
        await Actor.charge({ eventName: 'place-found', count: pushed });
    }
});

router.addHandler('place', async ({ request, page }) => {
    const url = request.url;
    log.info('Scraping place detail', { url });

    const results = request.userData.interceptedResults as AppleMapsResult[];

    try {
        await page.waitForResponse((res) => isPlaceResponse(res.url()) && res.ok(), {
            timeout: 30_000,
        });
    } catch {
        log.warning('No place detail response received', { url });
    }

    await page.waitForTimeout(1_000);

    if (results.length === 0) {
        log.warning('No place detail intercepted', { url });
        return;
    }

    const normalized = normalizePlaceData(results[0], url);
    if (normalized) {
        await Actor.charge({ eventName: 'place-found' });
        await Actor.pushData(normalized);
    }
});
