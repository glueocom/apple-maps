import type {
    AddressObjectData,
    AppleMapsResult,
    EntityData,
    PlaceInfoData,
    PlaceResult,
    RatingData,
    ResultSnippetData,
} from './types.js';

export function buildSearchUrl(query: string, locale: string): string {
    return `https://maps.apple.com/?q=${encodeURIComponent(query)}&lang=${locale}`;
}

function getComponent<T>(
    place: { component: { type: string; value?: Record<string, unknown>[] }[] },
    type: string,
): T | null {
    const comp = place.component.find((c) => c.type === type);
    return (comp?.value?.[0] as T) ?? null;
}

export function normalizePlaceData(result: AppleMapsResult, query: string): PlaceResult | null {
    const place = result.place;
    if (!place?.component) return null;

    const entity = getComponent<EntityData>(place, 'COMPONENT_TYPE_ENTITY');
    const address = getComponent<AddressObjectData>(place, 'COMPONENT_TYPE_ADDRESS_OBJECT');
    const placeInfo = getComponent<PlaceInfoData>(place, 'COMPONENT_TYPE_PLACE_INFO');
    const rating = getComponent<RatingData>(place, 'COMPONENT_TYPE_RATING');
    const snippet = getComponent<ResultSnippetData>(place, 'COMPONENT_TYPE_RESULT_SNIPPET');

    const structured = address?.addressObject?.address?.structuredAddress;
    const name = entity?.entity?.name?.[0]?.stringValue || snippet?.resultSnippet?.name || '';

    if (!name) return null;

    const category =
        entity?.entity?.localizedCategory?.[0]?.localizedName?.[0]?.stringValue ||
        snippet?.resultSnippet?.category ||
        null;

    return {
        name: name.trim(),
        latitude: placeInfo?.placeInfo?.center?.lat ?? 0,
        longitude: placeInfo?.placeInfo?.center?.lng ?? 0,
        address: address?.addressObject?.formattedAddressLines?.join(', ') || '',
        country: structured?.country || address?.addressObject?.countryName || '',
        countryCode: structured?.countryCode || '',
        state: structured?.administrativeArea || null,
        city: structured?.locality || null,
        postalCode: structured?.postCode || null,
        street: structured?.thoroughfare || null,
        streetNumber: structured?.subThoroughfare || null,
        category,
        phone: entity?.entity?.telephone || null,
        website: entity?.entity?.url || null,
        rating: rating?.rating?.score ?? null,
        ratingCount: rating?.rating?.numRatingsUsedForScore ?? null,
        searchQuery: query,
        scrapedAt: new Date().toISOString(),
    };
}
