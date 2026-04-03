import { log } from 'apify';
import type { Page } from 'playwright';
import type { AppleMapsResult, AppleMapsSearchResponse } from './types.js';

export async function setupSearchInterception(page: Page, results: AppleMapsResult[]): Promise<void> {
    // Match /data/search but not /data/search-home or /data/search-placeholder-text
    await page.route(/\/data\/search(\?|$)/, async (route) => {
        const response = await route.fetch();
        const body = await response.text();

        try {
            const data = JSON.parse(body) as AppleMapsSearchResponse;

            // Only process successful search responses with results
            if (data.status !== 'STATUS_SUCCESS' || !data.mapsResult) {
                await route.fulfill({ response, body });
                return;
            }

            const mapsResults = data.mapsResult;
            for (const item of mapsResults) {
                if (item?.place?.component) {
                    results.push(item);
                }
            }
            log.info(`Intercepted ${results.length} places from search`);
        } catch (err) {
            log.warning('Failed to parse search response', { error: String(err) });
        }

        await route.fulfill({ response, body });
    });
}

export async function setupPlaceInterception(page: Page, results: AppleMapsResult[]): Promise<void> {
    await page.route('**/data/place/**', async (route) => {
        const response = await route.fetch();
        const body = await response.text();

        try {
            const data = JSON.parse(body);
            // Place detail response may have different structure
            const mapsResults = data.mapsResult ?? [];
            for (const item of mapsResults) {
                if (item?.place?.component) {
                    results.push(item);
                }
            }
            if (results.length === 0 && data.place?.component) {
                results.push({ resultType: 'MAPS_RESULT_TYPE_PLACE', place: data.place });
            }
            log.info(`Intercepted ${results.length} place details`);
        } catch (err) {
            log.warning('Failed to parse place response', { error: String(err) });
        }

        await route.fulfill({ response, body });
    });
}
