---
name: ppe-pricing
description: Implementing Apify Pay-Per-Event (PPE) pricing in the Apple Maps actor. Use when adding charging logic, configuring event names, or testing PPE locally.
allowed-tools: Read, Write, Edit
---

# Pay-Per-Event Pricing

## SDK pattern

```typescript
import { Actor } from 'apify';

await Actor.init();

// Charge for actor initialization (optional — usually $0.05/1000 starts)
await Actor.charge({ eventName: 'init' });

// Charge per result — shortcut: charges AND pushes in one call
await Actor.pushData(placeObject, 'place-found');

// Or charge in bulk without pushing
await Actor.charge({ eventName: 'place-found', count: results.length });

// Check if user's charge limit has been reached before continuing
const cm = Actor.getChargingManager();
if (cm.eventChargeLimitReached('place-found')) {
    log.info('Charge limit reached — stopping');
    break;
}

await Actor.exit();
```

## Event names for this actor

| Event | Trigger | Suggested price |
|-------|---------|-----------------|
| `place-found` | Each place pushed to dataset | $1–3 per 1000 |
| `init` | Actor start | $0.05 per 1000 (platform default) |

## Local testing

```bash
# Simulate PPE mode locally (logs charges, does not actually charge)
ACTOR_TEST_PAY_PER_EVENT=true npm start

# Log charges to storage/datasets/charging_log/ for inspection
ACTOR_USE_CHARGING_LOG_DATASET=true npm start
```

## Key SDK properties

```typescript
const cm = Actor.getChargingManager();
cm.getPricingInfo().isPayPerEvent   // true when PPE mode is active
cm.chargeableWithinLimit            // false when user's maxTotalCharge is reached
cm.eventChargeLimitReached('place-found')  // per-event limit check
```

## User-controlled limit

Users set `maxTotalCharge` in the Actor run input. The Apify SDK enforces it
automatically — you don't need to check it manually; `eventChargeLimitReached`
handles it. Just call it before continuing to the next page/query.

## Revenue

Developer receives ~80% of event charges minus Apify platform compute costs.
Typical Apple Maps scraper pricing on Apify Store: **$1–3 per 1,000 places**.
