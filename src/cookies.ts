import { promises as fs } from 'node:fs';
import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';
import fetch from 'cross-fetch';
import type { Page } from 'playwright';

let blocker: PlaywrightBlocker | null = null;

export async function blockAdsAndConsent(page: Page): Promise<void> {
    if (!blocker) {
        blocker = await PlaywrightBlocker.fromPrebuiltFull(fetch, {
            path: './engine.bin',
            read: (p) => fs.readFile(p),
            write: (p, d) => fs.writeFile(p, d),
        });
    }
    blocker.enableBlockingInPage(page);
    // Unblock MapKit API domains — Ghostery's EasyPrivacy rules block them as "trackers"
    await page.unroute('**://api.apple-mapkit.com/**');
    await page.unroute('**://cdn.apple-mapkit.com/**');
}
