import { fetch } from 'undici';
import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { normalizeListing } from '../utils/normalize.js';
import { logger } from '../utils/logger.js';

// Craigslist category codes
const TYPE_CODES = {
  apartamento: 'apa',   // apartments / housing
  habitacion: 'roo',    // rooms / shared
  casa: 'hou'           // houses
};

export class CraigslistScraper extends BaseScraper {
  constructor() {
    super('craigslist', {
      interval: 8 * 60 * 1000,  // 8 min
      maxPages: 2,
      baseUrl: 'https://miami.craigslist.org',
      propertyTypes: ['apartamento', 'habitacion', 'casa']
    });
  }

  async fetchPage(city, page, propertyType) {
    const code = TYPE_CODES[propertyType] || 'apa';
    const offset = page * 120; // Craigslist uses 120 per page
    const url = offset > 0
      ? `${this.baseUrl}/search/${code}?s=${offset}`
      : `${this.baseUrl}/search/${code}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const items = [];

    // Modern Craigslist uses .cl-search-result or .result-row
    const resultSelector = $('.cl-search-result').length > 0
      ? '.cl-search-result'
      : '.result-row';

    $(resultSelector).each((_, el) => {
      try {
        const $el = $(el);
        const item = this.parseSearchResult($, $el, resultSelector);
        if (item) items.push(item);
      } catch {
        // skip malformed result
      }
    });

    // Fallback: try JSON-LD
    if (items.length === 0) {
      const jsonLdItems = this.extractJsonLd($);
      if (jsonLdItems.length > 0) return jsonLdItems;
    }

    // Fallback: try gallery cards
    if (items.length === 0) {
      $('li.cl-static-search-result, .gallery-card').each((_, el) => {
        try {
          const $el = $(el);
          const item = this.parseGalleryCard($, $el);
          if (item) items.push(item);
        } catch {
          // skip
        }
      });
    }

    logger.info(`[craigslist] Parsed ${items.length} items from ${url}`);
    return items;
  }

  parseSearchResult($, $el, selectorType) {
    let link, title, price, date, imgSrc, location;

    if (selectorType === '.cl-search-result') {
      // New Craigslist layout
      const $title = $el.find('.titlestring, .posting-title .label, a.posting-title');
      link = $el.find('a.posting-title, a.titlestring, a[href*="/housing/"]').attr('href')
        || $title.closest('a').attr('href')
        || $el.find('a').first().attr('href');
      title = $title.text().trim() || $el.find('.title').text().trim();

      const priceText = $el.find('.priceinfo, .price, .result-price').text();
      price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;

      date = $el.find('time').attr('datetime')
        || $el.find('.meta .date, .datetime').text().trim();

      imgSrc = $el.find('img').attr('src') || $el.find('img').attr('data-src');

      location = $el.find('.meta .location, .result-hood').text().trim()
        .replace(/[()]/g, '');
    } else {
      // Legacy layout (.result-row)
      const $link = $el.find('a.result-title, a.hdrlnk');
      link = $link.attr('href');
      title = $link.text().trim();

      price = parseInt($el.find('.result-price').text().replace(/[^\d]/g, '')) || 0;
      date = $el.find('time').attr('datetime');
      imgSrc = $el.find('img').attr('src');
      location = $el.find('.result-hood').text().trim().replace(/[()]/g, '');
    }

    if (!link || price <= 0) return null;

    // Ensure absolute URL
    if (link && !link.startsWith('http')) {
      link = `${this.baseUrl}${link}`;
    }

    return {
      title: title || null,
      price,
      link,
      date: date || null,
      image_url: imgSrc || null,
      location: location || null
    };
  }

  parseGalleryCard($, $el) {
    const link = $el.find('a').attr('href');
    const title = $el.find('.titlestring, .title, .label').text().trim();
    const priceText = $el.find('.price, .priceinfo').text();
    const price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
    const date = $el.find('time').attr('datetime') || $el.attr('data-date');
    const imgSrc = $el.find('img').attr('src');
    const location = $el.find('.location, .hood').text().trim().replace(/[()]/g, '');

    if (!link || price <= 0) return null;

    return {
      title: title || null,
      price,
      link: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
      date: date || null,
      image_url: imgSrc || null,
      location: location || null
    };
  }

  extractJsonLd($) {
    const items = [];
    try {
      $('script[type="application/ld+json"]').each((_, el) => {
        const content = $(el).html();
        if (!content) return;
        const data = JSON.parse(content);

        if (data['@type'] === 'SearchResultsPage' && Array.isArray(data.about)) {
          for (const item of data.about) {
            if (item['@type'] === 'Residence' || item['@type'] === 'Apartment') {
              const offers = item.offers || {};
              items.push({
                title: item.name || null,
                price: parseInt(offers.price) || 0,
                link: item.url || '',
                date: item.datePosted || null,
                image_url: item.image || null,
                location: item.address?.addressLocality || null
              });
            }
          }
        }
      });
    } catch (err) {
      logger.warn(`[craigslist] JSON-LD parse error: ${err.message}`);
    }
    return items;
  }

  async fetchDetailImages(sourceUrl) {
    try {
      const response = await fetch(sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      if (!response.ok) return null;

      const html = await response.text();
      const $ = cheerio.load(html);
      const images = [];

      // Strategy 1: thumbs strip links (most common on Craigslist detail pages)
      $('a.thumb').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.startsWith('http')) images.push(href);
      });

      // Strategy 2: #thumbs container
      if (images.length === 0) {
        $('#thumbs a').each((_, el) => {
          const href = $(el).attr('href');
          if (href && href.startsWith('http')) images.push(href);
        });
      }

      // Strategy 3: swipe gallery images
      if (images.length === 0) {
        $('.swipe .slide img, .gallery img, .iw img').each((_, el) => {
          const src = $(el).attr('src') || $(el).attr('data-src');
          if (src && src.startsWith('http') && !src.includes('static')) images.push(src);
        });
      }

      // Strategy 4: var imgList in script tags
      if (images.length === 0) {
        const scriptMatch = html.match(/var\s+imgList\s*=\s*(\[[\s\S]*?\]);/);
        if (scriptMatch) {
          try {
            const imgList = JSON.parse(scriptMatch[1]);
            for (const img of imgList) {
              const url = typeof img === 'string' ? img : (img?.url || img?.href || null);
              if (url) images.push(url);
            }
          } catch { /* skip */ }
        }
      }

      // Strategy 5: any img with craigslist image CDN URLs
      if (images.length === 0) {
        $('img[src*="images.craigslist"]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) images.push(src);
        });
      }

      // Deduplicate
      const unique = [...new Set(images)];
      return unique.length > 0 ? unique : null;
    } catch (err) {
      logger.warn(`[craigslist] Detail fetch failed for ${sourceUrl}: ${err.message}`);
      return null;
    }
  }

  parseListing(item, city, propertyType) {
    return normalizeListing({
      external_id: item.link || String(Math.random()),
      source: 'craigslist',
      title: item.title || null,
      address: item.location || null,
      neighborhood: item.location || null,
      city: 'miami',
      building_name: null,
      price: item.price,
      admin_fee: 0,
      rooms: this.extractRooms(item.title, propertyType),
      bathrooms: this.extractBaths(item.title),
      area_m2: this.extractArea(item.title),
      stratum: null,
      contact_phone: null,
      contact_name: null,
      source_url: item.link,
      image_url: item.image_url || null,
      images: item.image_url ? [item.image_url] : null,
      posted_at: item.date || null,
      property_type: propertyType
    });
  }

  extractRooms(title, propertyType) {
    if (!title) return propertyType === 'habitacion' ? 1 : null;
    const match = title.match(/(\d+)\s*(?:br|bed|bedroom|hab)/i);
    if (match) return parseInt(match[1]);
    return propertyType === 'habitacion' ? 1 : null;
  }

  extractBaths(title) {
    if (!title) return null;
    const match = title.match(/(\d+)\s*(?:ba|bath|bathroom)/i);
    return match ? parseInt(match[1]) : null;
  }

  extractArea(title) {
    if (!title) return null;
    // Craigslist uses sq ft, convert to m²
    const match = title.match(/(\d+)\s*(?:ft²|sqft|sq\s*ft|sf)/i);
    if (match) {
      const sqft = parseInt(match[1]);
      return Math.round(sqft * 0.0929 * 10) / 10; // to m²
    }
    return null;
  }
}
