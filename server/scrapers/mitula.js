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

export class MitulaScraper extends BaseScraper {
  constructor() {
    super('mitula', {
      interval: 10 * 60 * 1000,
      maxPages: 2,
      baseUrl: 'https://casas.mitula.com.co'
    });
    this.cookies = '';
  }

  async initSession() {
    try {
      const res = await fetch(this.baseUrl, {
        headers: defaultHeaders(),
        redirect: 'follow'
      });
      const setCookies = res.headers.getSetCookie?.() || [];
      this.cookies = setCookies.map(c => c.split(';')[0]).join('; ');
      logger.info(`[mitula] Session initialized`);
    } catch (err) {
      logger.warn(`[mitula] Session init failed: ${err.message}`);
    }
  }

  async fetchPage(city, page) {
    if (!this.cookies) {
      await this.initSession();
    }

    const slug = CITY_SLUGS[city] || city;
    const pageParam = page > 0 ? `?page=${page + 1}` : '';
    const url = `${this.baseUrl}/arriendo/apartamento/${slug}${pageParam}`;

    const response = await fetch(url, {
      headers: {
        ...defaultHeaders(),
        'Referer': this.baseUrl,
        'Cookie': this.cookies
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        this.cookies = '';
        throw new Error(`Auth failed (${response.status}), will retry next cycle`);
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return this.parseHtml(html, city);
  }

  parseHtml(html, city) {
    const $ = cheerio.load(html);
    const listings = [];

    const cardSelectors = [
      '.listing-card',
      '.result-item',
      '[data-listing]',
      '.property-item',
      'article.listing'
    ];

    let cards = $([]);
    for (const sel of cardSelectors) {
      cards = $(sel);
      if (cards.length > 0) break;
    }

    // Fallback: try to find any card-like structure with price
    if (cards.length === 0) {
      cards = $('div').filter((_, el) => {
        const text = $(el).text();
        return text.includes('$') && text.includes('arriendo');
      });
    }

    cards.each((_, el) => {
      try {
        const $card = $(el);
        const link = $card.find('a[href]').first().attr('href') || '';
        const priceText = $card.find('[class*="price"], .price, strong').first().text();
        const price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
        if (price <= 0) return;

        const title = $card.find('h2, h3, .title, [class*="title"]').first().text().trim();
        const location = $card.find('.location, [class*="location"], [class*="address"]').first().text().trim();
        const details = $card.text();

        const rooms = parseInt(details.match(/(\d+)\s*(?:hab|cuarto|dorm)/i)?.[1]) || null;
        const baths = parseInt(details.match(/(\d+)\s*(?:baño|bano)/i)?.[1]) || null;
        const area = parseFloat(details.match(/(\d+(?:\.\d+)?)\s*m[²2]/i)?.[1]) || null;
        const imgSrc = $card.find('img').first().attr('src') || $card.find('img').first().attr('data-src');

        listings.push({
          title,
          price,
          location,
          rooms,
          bathrooms: baths,
          area_m2: area,
          link: link.startsWith('http') ? link : (link ? `${this.baseUrl}${link}` : ''),
          image_url: imgSrc,
          city
        });
      } catch {
        // Skip
      }
    });

    return listings;
  }

  parseListing(item, city) {
    return normalizeListing({
      external_id: item.link || String(Math.random()),
      source: 'mitula',
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
      source_url: item.link || this.baseUrl,
      image_url: item.image_url || null
    });
  }
}
