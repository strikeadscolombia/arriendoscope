import { fetch } from 'undici';
import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { defaultHeaders } from '../utils/userAgent.js';
import { normalizeListing } from '../utils/normalize.js';
import { logger } from '../utils/logger.js';

const CITY_SLUGS = {
  bogota: 'bogota-d-c-colombia',
  medellin: 'medellin-antioquia',
  cali: 'cali-valle-del-cauca',
  barranquilla: 'barranquilla-atlantico',
  cartagena: 'cartagena-bolivar',
  bucaramanga: 'bucaramanga',
  pereira: 'pereira',
  manizales: 'manizales-caldas'
};

const TYPE_SLUGS = {
  apartamento: 'apartamento',
  casa: 'casa',
  habitacion: 'habitacion'
};

export class ProperatiScraper extends BaseScraper {
  constructor() {
    super('properati', {
      interval: 5 * 60 * 1000,  // 5 min
      maxPages: 3,
      baseUrl: 'https://www.properati.com.co',
      propertyTypes: ['apartamento', 'casa']
    });
  }

  async fetchPage(city, page, propertyType) {
    const slug = CITY_SLUGS[city];
    if (!slug) {
      logger.warn(`[properati] No slug for city: ${city}`);
      return [];
    }

    const typeSlug = TYPE_SLUGS[propertyType] || 'apartamento';
    const pageNum = page + 1;
    const url = pageNum === 1
      ? `${this.baseUrl}/s/${slug}/${typeSlug}/arriendo`
      : `${this.baseUrl}/s/${slug}/${typeSlug}/arriendo/${pageNum}`;

    const response = await fetch(url, {
      headers: {
        ...defaultHeaders(),
        'Referer': `${this.baseUrl}/`,
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const items = [];

    // Parse listing cards using data-test attributes and article.snippet
    $('article.snippet, [class*="listing-card"], [data-qa="posting"]').each((_, el) => {
      try {
        const $card = $(el);
        const item = this.parseCard($, $card, city);
        if (item) items.push(item);
      } catch {
        // Skip malformed card
      }
    });

    // Fallback: look for any cards with price data-test attributes
    if (items.length === 0) {
      $('[data-test="snippet__price"]').each((_, el) => {
        try {
          const $card = $(el).closest('article, div[class*="card"], div[class*="listing"]');
          if ($card.length) {
            const item = this.parseCard($, $card, city);
            if (item) items.push(item);
          }
        } catch {
          // Skip
        }
      });
    }

    // Fallback 2: generic card parsing
    if (items.length === 0) {
      $('a[href*="/detalle/"]').each((_, el) => {
        try {
          const $link = $(el);
          const $card = $link.closest('article, div, li');
          if ($card.length) {
            const item = this.parseGenericCard($, $card, $link, city);
            if (item) items.push(item);
          }
        } catch {
          // Skip
        }
      });
    }

    logger.info(`[properati] ${city}/${propertyType} page ${page}: ${items.length} items from ${url}`);
    return items;
  }

  parseCard($, $card, city) {
    // Extract URL — from article attributes or first link
    let url = $card.attr('data-url')
      || $card.find('a[href*="/detalle/"]').attr('href')
      || $card.find('a[href*="properati"]').attr('href')
      || $card.find('a').first().attr('href');

    if (!url) return null;
    if (!url.startsWith('http')) url = `${this.baseUrl}${url}`;

    // External ID — from data attribute or URL
    const externalId = $card.attr('data-idanuncio')
      || $card.attr('data-id')
      || url;

    // Price: data-test="snippet__price" → "$ 6.500.000" or "COP 3.200.000"
    const priceText = $card.find('[data-test="snippet__price"]').text()
      || $card.find('[class*="price"]').first().text();
    const price = this.parsePrice(priceText);
    if (price <= 0) return null;

    // Title
    const title = ($card.find('[data-test="snippet__title"]').text()
      || $card.find('h2, h3, [class*="title"]').first().text()
    ).trim();

    // Location: "Barrio, Zona, Ciudad, Depto"
    const locationText = ($card.find('[data-test="snippet__location"]').text()
      || $card.find('[class*="location"], [class*="address"]').first().text()
    ).trim();

    const { neighborhood, address } = this.parseLocation(locationText);

    // Rooms
    const roomsText = $card.find('[data-test="bedrooms-value"]').text()
      || $card.find('[class*="bedroom"]').text();
    const rooms = parseInt(roomsText) || null;

    // Bathrooms
    const bathText = $card.find('[data-test="full-bathrooms-value"]').text()
      || $card.find('[class*="bathroom"]').text();
    const bathrooms = parseInt(bathText) || null;

    // Area
    const areaText = $card.find('[data-test="area-value"]').text()
      || $card.find('[class*="area"]').text();
    const area = parseFloat(areaText?.replace(/[^\d.,]/g, '').replace(',', '.')) || null;

    // Agency / contact name
    const agencyName = ($card.find('[data-test="agency-name"]').text()
      || $card.find('[class*="agency"], [class*="publisher"]').text()
    ).trim() || null;

    // Images from swiper or gallery
    const images = [];
    $card.find('.swiper-slide img, img[src*="properati"], img[data-src]').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      if (src && src.startsWith('http') && !src.includes('placeholder') && !src.includes('logo')) {
        images.push(src);
      }
    });
    // Also check main card image
    const mainImg = $card.find('img').first().attr('src') || $card.find('img').first().attr('data-src');
    if (mainImg && mainImg.startsWith('http') && !mainImg.includes('placeholder') && !mainImg.includes('logo')) {
      if (!images.includes(mainImg)) images.unshift(mainImg);
    }

    return {
      externalId,
      url,
      title: title || null,
      price,
      neighborhood,
      address,
      city,
      rooms,
      bathrooms,
      area,
      agencyName,
      images: images.length > 0 ? images : null,
      imageUrl: images[0] || null
    };
  }

  parseGenericCard($, $card, $link, city) {
    let url = $link.attr('href');
    if (!url) return null;
    if (!url.startsWith('http')) url = `${this.baseUrl}${url}`;

    const priceText = $card.find('[class*="price"], [data-test*="price"]').text();
    const price = this.parsePrice(priceText);
    if (price <= 0) return null;

    const title = ($card.find('h2, h3, [class*="title"]').first().text()).trim();
    const locationText = ($card.find('[class*="location"], [class*="address"]').first().text()).trim();
    const { neighborhood, address } = this.parseLocation(locationText);

    const mainImg = $card.find('img').first().attr('src');

    return {
      externalId: url,
      url,
      title: title || null,
      price,
      neighborhood,
      address,
      city,
      rooms: null,
      bathrooms: null,
      area: null,
      agencyName: null,
      images: mainImg ? [mainImg] : null,
      imageUrl: mainImg || null
    };
  }

  parsePrice(text) {
    if (!text) return 0;
    // Remove currency symbols, dots as thousands separator
    // "$ 6.500.000" → "6500000", "COP 3.200.000" → "3200000"
    const cleaned = text.replace(/[^\d]/g, '');
    return parseInt(cleaned) || 0;
  }

  parseLocation(text) {
    if (!text) return { neighborhood: null, address: null };

    // "Chapinero, Zona Chapinero, Bogota D.C, Cundinamarca"
    // "El Poblado, Medellin, Antioquia"
    // "Granada, Cali, Valle del Cauca"
    const parts = text.split(',').map(s => s.trim()).filter(Boolean);

    if (parts.length >= 2) {
      return {
        neighborhood: parts[0],
        address: parts.slice(0, Math.min(parts.length - 1, 3)).join(', ')
      };
    }

    return { neighborhood: parts[0] || null, address: text || null };
  }

  parseListing(item, city, propertyType) {
    return normalizeListing({
      external_id: item.externalId || item.url || String(Math.random()),
      source: 'properati',
      title: item.title || null,
      address: item.address || null,
      neighborhood: item.neighborhood || null,
      city: item.city || city,
      building_name: null,
      price: item.price,
      admin_fee: 0,
      rooms: item.rooms,
      bathrooms: item.bathrooms,
      area_m2: item.area,
      stratum: null,
      contact_phone: null,
      contact_name: item.agencyName || null,
      source_url: item.url,
      image_url: item.imageUrl || null,
      images: item.images,
      posted_at: null,
      property_type: propertyType
    });
  }
}
