import type { ProxyConfigurationOptions } from 'apify';

export interface Input {
    searchQueries?: string[];
    startUrls?: { url: string; userData?: Record<string, unknown> }[];
    maxResultsPerQuery: number;
    locale: string;
    countryCode: string;
    proxyConfiguration?: ProxyConfigurationOptions;
}

// Apple Maps web app response types (maps.apple.com/data/search)

export interface AppleMapsSearchResponse {
    status: string;
    mapsResult: AppleMapsResult[];
    globalResult?: {
        searchResult?: {
            searchResultSection?: { sectionSubHeaderDisplayName?: string }[];
        };
    };
}

export interface AppleMapsResult {
    resultType: string;
    place: AppleMapsPlace;
}

export interface AppleMapsPlace {
    muid: string;
    status: string;
    component: AppleMapsComponent[];
    mapsId?: Record<string, unknown>;
}

export interface AppleMapsComponent {
    type: string;
    status?: string;
    value?: Record<string, unknown>[];
}

// Extracted component data interfaces

export interface EntityData {
    entity: {
        type?: string;
        telephone?: string;
        url?: string;
        name?: { locale: string; stringValue: string }[];
        localizedCategory?: { level: number; localizedName: { locale: string; stringValue: string }[] }[];
    };
}

export interface AddressObjectData {
    addressObject: {
        shortAddress?: string;
        formattedAddressLines?: string[];
        countryName?: string;
        address?: {
            structuredAddress?: {
                country?: string;
                countryCode?: string;
                administrativeArea?: string;
                locality?: string;
                postCode?: string;
                thoroughfare?: string;
                subThoroughfare?: string;
            };
        };
    };
}

export interface PlaceInfoData {
    placeInfo: {
        center: { lat: number; lng: number };
    };
}

export interface RatingData {
    rating: {
        ratingType?: string;
        score?: number;
        maxScore?: number;
        numRatingsUsedForScore?: number;
    };
}

export interface ResultSnippetData {
    resultSnippet: {
        name: string;
        category?: string;
        locationString?: string;
    };
}

// Normalized output pushed to dataset

export interface PlaceResult {
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    country: string;
    countryCode: string;
    state: string | null;
    city: string | null;
    postalCode: string | null;
    street: string | null;
    streetNumber: string | null;
    category: string | null;
    phone: string | null;
    website: string | null;
    rating: number | null;
    ratingCount: number | null;
    searchQuery: string;
    scrapedAt: string;
}
