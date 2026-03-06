import { fetch } from 'undici';
import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { defaultHeaders } from '../utils/userAgent.js';
import { normalizeListing } from '../utils/normalize.js';
import { logger } from '../utils/logger.js';

const CITY_SLUGS = {
  bogota: 'bogota',
  medellin: 'medellin',
  cali: 'cali',
  barranquilla: 'barranquilla',
  bucaramanga: 'bucaramanga',
  cartagena: 'cartagena'
};

const TYPE_SLUGS = {
  apartamento: 'apartamentos',
  casa: 'casas',
  habitacion: 'habitaciones'
};

export class FincaRaizScraper extends BaseScraper {
  constructor() {
    super('fincaraiz', {
      interval: 10 * 60 * 1000,
      maxPages: 3,
      baseUrl: 'https://www.fincaraiz.com.co',
      propertyTypes: ['apartamento', 'casa', 'habitacion']
    });
  }

  async fetchPage(city, page, propertyType) {
    const slug = CITY_SLUGS[city] || city;
    const typeSlug = TYPE_SLUGS[propertyType] || 'apartamentos';
    const pageParam = page > 0 ? `?pagina=${page + 1}` : '';
    const url = `${this.baseUrl}/arriendo/${typeSlug}/${slug}${pageParam}`;

    const response = await fetch(url, {
      headers: defaultHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try __NEXT_DATA__ (FincaRaiz is also Next.js)
    const nextDataScript = $('#__NEXT_DATA__').html();
    if (nextDataScript) {
      try {
        const data = JSON.parse(nextDataScript);
        const results = this.extractResults(data);
        if (results.length > 0) return results;
      } catch (err) {
        logger.warn(`[fincaraiz] __NEXT_DATA__ parse failed: ${err.message}`);
      }
    }

    // Fallback: HTML parsing
    return this.parseHtml($, city);
  }

  extractResults(nextData) {
    try {
      const props = nextData?.props?.pageProps;
      if (!props) return [];

      // Search common paths for listings
      const candidates = [
        props?.results,
        props?.listings,
        props?.data?.results,
        props?.initialData?.results,
        props?.properties
      ];

      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0) return c;
      }

      // Deep search for arrays of objects with price-like fields
      const deepSearch = (obj, depth = 0) => {
        if (depth > 6 || !obj || typeof obj !== 'object') return null;
        if (Array.isArray(obj) && obj.length > 2 && typeof obj[0] === 'object') {
          const first = obj[0];
          // Check for various property data patterns
          if (first.precio || first.price || first.valorArriendo || first.valor ||
              (first.id && first.address) || (first.id && first.title && first.location)) {
            return obj;
          }
        }
        for (const val of Object.values(obj)) {
          const found = deepSearch(val, depth + 1);
          if (found) return found;
        }
        return null;
      };

      // Also search the full __NEXT_DATA__ not just pageProps
      return deepSearch(props) || deepSearch(nextData) || [];
    } catch {
      return [];
    }
  }

  parseHtml($, city) {
    const listings = [];

    $('article, [class*="card"], [class*="listing"], [class*="property"]').each((_, el) => {
      try {
        const $card = $(el);
        const link = $card.find('a[href*="/inmueble/"], a[href*="/arriendo/"]').first().attr('href');
        if (!link) return;

        const priceText = $card.find('[class*="price"], [class*="precio"]').first().text();
        const price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
        if (price <= 0) return;

        const title = $card.find('h2, h3, [class*="title"]').first().text().trim();
        const location = $card.find('[class*="location"], [class*="address"]').first().text().trim();
        const details = $card.text();
        const rooms = parseInt(details.match(/(\d+)\s*(?:hab|cuarto|alcoba)/i)?.[1]) || null;
        const baths = parseInt(details.match(/(\d+)\s*(?:baño|bano)/i)?.[1]) || null;
        const area = parseFloat(details.match(/(\d+(?:\.\d+)?)\s*m[²2]/i)?.[1]) || null;
        const imgSrc = $card.find('img').first().attr('src') || $card.find('img').first().attr('data-src');

        listings.push({
          title, price, location, rooms, bathrooms: baths,
          area_m2: area, link, image_url: imgSrc, city
        });
      } catch {
        // Skip
      }
    });

    return listings;
  }

  parseListing(item, city, propertyType) {
    const locations = item.locations || {};

    // Extract price - FincaRaiz uses {amount, admin_included, currency} object
    let price = 0;
    let adminFee = 0;
    if (item.price && typeof item.price === 'object') {
      price = parseInt(item.price.amount) || 0;
      // admin_included is total (price + admin), so admin = admin_included - amount
      if (item.price.admin_included) {
        adminFee = parseInt(item.price.admin_included) - price;
        if (adminFee < 0) adminFee = 0;
      }
    } else {
      price = parseInt(item.precio || item.price || item.valorArriendo || 0);
      adminFee = parseInt(item.administracion || 0);
    }

    const hasStructuredData = price > 0 || (item.id && item.title);

    if (hasStructuredData) {
      // Extract neighborhood from locations object
      const mainLocation = locations.location_main?.name || null;
      const neighborhood = mainLocation ||
        locations.neighbourhood?.[0]?.name ||
        locations.locality?.[0]?.name || null;

      const cityName = locations.city?.[0]?.name || city;

      // Extract contact from owner object
      const owner = item.owner || {};
      const phone = owner.masked_phone?.replace(/[^\d+]/g, '') || null;
      const contactName = owner.name || null;

      // Images
      const imageUrl = item.img || item.imagen || item.thumbnail || null;
      const imageArray = Array.isArray(item.images) ? item.images
        : Array.isArray(item.gallery) ? item.gallery
        : Array.isArray(item.media) ? item.media.map(m => m.url || m.image || m).filter(Boolean)
        : null;

      // Area and rooms from description or dedicated fields
      const desc = item.description || '';
      const rooms = parseInt(item.bedrooms || item.rooms || item.habitaciones || 0) ||
                    parseInt(desc.match(/(\d+)\s*(?:alcoba|habitaci|cuarto)/i)?.[1]) || null;
      const bathrooms = parseInt(item.bathrooms || item.banos || 0) ||
                        parseInt(desc.match(/(\d+)\s*(?:baño|bano)/i)?.[1]) || null;
      const area = parseFloat(item.area || item.areaConstruida || 0) ||
                   parseFloat(desc.match(/(\d+(?:\.\d+)?)\s*m[²2]/i)?.[1]) || null;
      const stratum = parseInt(item.estrato || item.stratum || 0) ||
                      parseInt(desc.match(/estrato\s*(\d)/i)?.[1]) || null;

      // Build source URL from slug or id
      let sourceUrl;
      if (item.slug) {
        sourceUrl = `${this.baseUrl}/${item.slug}`;
      } else if (item.link) {
        sourceUrl = item.link.startsWith('http') ? item.link : `${this.baseUrl}${item.link}`;
      } else {
        // Construct from title slug + id
        const titleSlug = (item.title || '').toLowerCase()
          .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
          .replace(/[óò]/g, 'o').replace(/[úù]/g, 'u').replace(/ñ/g, 'n')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        sourceUrl = `${this.baseUrl}/${titleSlug}/${item.id}`;
      }

      return normalizeListing({
        external_id: item.id || item.code || String(Math.random()),
        source: 'fincaraiz',
        title: item.title || null,
        address: item.showAddress ? item.address : null,
        neighborhood,
        city: cityName,
        building_name: null,
        price,
        admin_fee: adminFee,
        rooms,
        bathrooms,
        area_m2: area,
        stratum,
        contact_phone: phone,
        contact_name: contactName,
        source_url: sourceUrl,
        image_url: imageUrl,
        images: imageArray || (imageUrl ? [imageUrl] : null),
        posted_at: item.created_at || item.published_at || item.date || item.datePublished || item.fechaCreacion || null,
        property_type: propertyType
      });
    }

    // From HTML
    return normalizeListing({
      external_id: item.link || String(Math.random()),
      source: 'fincaraiz',
      title: item.title || null,
      address: item.location || null,
      neighborhood: null,
      city: item.city || city,
      building_name: null,
      price: item.price,
      admin_fee: 0,
      rooms: item.rooms,
      bathrooms: item.bathrooms,
      area_m2: item.area_m2,
      stratum: null,
      contact_phone: null,
      contact_name: null,
      source_url: item.link
        ? (item.link.startsWith('http') ? item.link : `${this.baseUrl}${item.link}`)
        : this.baseUrl,
      image_url: item.image_url || null,
      images: item.image_url ? [item.image_url] : null,
      posted_at: null,
      property_type: propertyType
    });
  }
}
