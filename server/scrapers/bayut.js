import { fetch } from 'undici';
import { BaseScraper } from './BaseScraper.js';
import { normalizeListing } from '../utils/normalize.js';
import { logger } from '../utils/logger.js';

// Bayut category external IDs (RapidAPI)
const CATEGORY_MAP = {
  apartamento: '4',   // Apartments
  casa: '16'          // Villas / Townhouses
};

// Dubai location external ID for RapidAPI
const DUBAI_LOCATION_ID = '5002';

export class BayutScraper extends BaseScraper {
  constructor() {
    super('bayut', {
      interval: 10 * 60 * 1000,  // 10 min (conserve free tier: 750 calls/month)
      maxPages: 2,                // 24 hits/page × 2 = 48 per cycle
      propertyTypes: ['apartamento', 'casa']
    });

    this.apiKey = process.env.RAPIDAPI_KEY || '';
    if (!this.apiKey) {
      logger.warn('[bayut] RAPIDAPI_KEY not set — scraper will be skipped');
    }
  }

  async fetchPage(city, page, propertyType) {
    if (!this.apiKey) return [];

    const categoryId = CATEGORY_MAP[propertyType] || '4';

    const url = 'https://bayut.p.rapidapi.com/properties/list';
    const params = new URLSearchParams({
      locationExternalIDs: DUBAI_LOCATION_ID,
      purpose: 'for-rent',
      categoryExternalID: categoryId,
      hitsPerPage: '24',
      page: String(page),
      sort: 'date-desc',
      lang: 'en'
    });

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': 'bayut.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from Bayut API`);
    }

    const data = await response.json();
    const hits = data.hits || [];

    logger.info(`[bayut] ${city}/${propertyType} page ${page}: ${hits.length} hits`);
    return hits;
  }

  parseListing(raw, city, propertyType) {
    const externalId = String(raw.externalID || raw.id || '');
    if (!externalId) return null;

    // Price: Bayut shows AED. Yearly rentals → divide by 12 for monthly
    let price = parseFloat(raw.price) || 0;
    if (raw.rentFrequency === 'yearly' && price > 0) {
      price = Math.round(price / 12);
    }

    // Area: Bayut returns sqft → convert to m²
    let areaM2 = null;
    if (raw.area != null) {
      areaM2 = Math.round(parseFloat(raw.area) * 0.0929 * 10) / 10;
    }

    // Location: build from location array (last items are most specific)
    const locationArr = raw.location || [];
    let neighborhood = null;
    let address = null;

    if (locationArr.length >= 3) {
      // Typically: [UAE, Dubai, Area, Sub-area]
      neighborhood = locationArr[locationArr.length - 2]?.name
        || locationArr[locationArr.length - 1]?.name
        || null;
      address = locationArr.map(l => l.name).slice(1).join(', ');
    } else if (locationArr.length > 0) {
      neighborhood = locationArr[locationArr.length - 1]?.name || null;
      address = locationArr.map(l => l.name).join(', ');
    }

    // Images
    const coverUrl = raw.coverPhoto?.url || null;
    const photos = raw.photoIDs
      ? null  // photoIDs are just IDs, not full URLs
      : (coverUrl ? [coverUrl] : null);

    // Source URL
    const sourceUrl = raw.externalURL
      ? `https://www.bayut.com${raw.externalURL}`
      : `https://www.bayut.com/property/details-${externalId}.html`;

    return normalizeListing({
      external_id: externalId,
      source: 'bayut',
      title: raw.title || raw.title_l1 || null,
      address,
      neighborhood,
      city: 'dubai',
      building_name: raw.buildingName || null,
      price,
      admin_fee: 0,
      rooms: raw.rooms != null ? parseInt(raw.rooms) : null,
      bathrooms: raw.baths != null ? parseInt(raw.baths) : null,
      area_m2: areaM2,
      stratum: null,
      contact_phone: raw.phoneNumber?.phone || raw.phoneNumber?.mobile || null,
      contact_name: raw.contactName || null,
      source_url: sourceUrl,
      image_url: coverUrl,
      images: photos,
      posted_at: raw.createdAt ? new Date(raw.createdAt * 1000).toISOString() : null,
      property_type: propertyType
    });
  }
}
