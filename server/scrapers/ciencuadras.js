import { fetch } from 'undici';
import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { defaultHeaders } from '../utils/userAgent.js';
import { normalizeListing } from '../utils/normalize.js';
import { logger } from '../utils/logger.js';

const CITY_SLUGS = {
  bogota: 'bogota-dc',
  medellin: 'medellin',
  cali: 'cali',
  barranquilla: 'barranquilla',
  bucaramanga: 'bucaramanga',
  cartagena: 'cartagena-de-indias'
};

const TYPE_SLUGS = {
  apartamento: 'apartamento',
  casa: 'casa',
  habitacion: 'habitacion'
};

export class CiencuadrasScraper extends BaseScraper {
  constructor() {
    super('ciencuadras', {
      interval: 4 * 60 * 1000,  // 4 min
      maxPages: 3,
      baseUrl: 'https://www.ciencuadras.com',
      propertyTypes: ['apartamento', 'casa', 'habitacion']
    });
  }

  async fetchPage(city, page, propertyType) {
    const slug = CITY_SLUGS[city] || city;
    const typeSlug = TYPE_SLUGS[propertyType] || 'apartamento';
    const url = page === 0
      ? `${this.baseUrl}/arriendo/${typeSlug}/${slug}`
      : `${this.baseUrl}/arriendo/${typeSlug}/${slug}?pagina=${page + 1}`;

    const response = await fetch(url, {
      headers: {
        ...defaultHeaders(),
        'Referer': this.baseUrl
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Priority 1: JSON-LD structured data (most reliable)
    const jsonLd = this.extractJsonLd($);
    if (jsonLd && jsonLd.length > 0) {
      logger.info(`[ciencuadras] Found ${jsonLd.length} JSON-LD listings for ${city} page ${page}`);
      return jsonLd.map(item => ({ ...item, _fromJsonLd: true, _city: city }));
    }

    // Priority 2: Angular transfer state
    const transferState = this.extractTransferState($);
    if (transferState && transferState.length > 0) {
      return transferState;
    }

    // Priority 3: HTML parsing
    return this.parseHtml($, city);
  }

  extractJsonLd($) {
    try {
      const scripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < scripts.length; i++) {
        const content = $(scripts[i]).html();
        if (!content) continue;

        const data = JSON.parse(content);
        if (data['@type'] === 'ItemList' && Array.isArray(data.itemListElement)) {
          return data.itemListElement
            .filter(el => el.item || el.url)
            .map(el => {
              const item = el.item || {};
              const offers = item.offers || {};
              const apt = offers.itemOffered || {};
              const geo = apt.geo || {};
              const floor = apt.floorSize || {};

              // Handle image as string or array
              const rawImage = item.image;
              const imageUrl = Array.isArray(rawImage) ? rawImage[0] : (rawImage || '');
              const imageArray = Array.isArray(rawImage) ? rawImage : (rawImage ? [rawImage] : []);

              // Also check apt.photo and apt.image (Schema.org Accommodation)
              const aptPhotos = apt.photo || apt.image || [];
              const aptPhotoUrls = Array.isArray(aptPhotos)
                ? aptPhotos.map(p => typeof p === 'string' ? p : (p?.url || p?.contentUrl || null)).filter(Boolean)
                : (typeof aptPhotos === 'string' ? [aptPhotos] : []);

              // Merge all image sources, deduplicate
              const allImages = [...new Set([...imageArray, ...aptPhotoUrls])].filter(Boolean);

              return {
                name: item.name || '',
                url: el.url || '',
                image: imageUrl,
                imageArray: allImages,
                price: parseInt(offers.price) || 0,
                bathrooms: parseInt(apt.numberOfBathroomsTotal) || null,
                area_m2: parseFloat(floor.value) || null,
                latitude: parseFloat(geo.latitude) || null,
                longitude: parseFloat(geo.longitude) || null
              };
            })
            .filter(item => item.price > 0);
        }
      }
      return null;
    } catch (err) {
      logger.warn(`[ciencuadras] JSON-LD parse error: ${err.message}`);
      return null;
    }
  }

  extractTransferState($) {
    try {
      const stateScript = $('script#serverApp-state').html() || $('script[id*="state"]').html();
      if (!stateScript) return null;

      const data = JSON.parse(stateScript);
      for (const key of Object.keys(data)) {
        if (key.includes('listing') || key.includes('result') || key.includes('property')) {
          const val = data[key];
          if (val?.body && Array.isArray(val.body)) return val.body;
          if (Array.isArray(val)) return val;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  parseHtml($, city) {
    const listings = [];

    $('[class*="card"], article, [class*="property"]').each((_, el) => {
      try {
        const $card = $(el);
        const link = $card.find('a[href*="/inmueble/"]').attr('href');
        if (!link) return;

        const priceText = $card.find('[class*="price"], [class*="precio"]').first().text();
        const price = parseInt(priceText.replace(/[^\d]/g, '')) || 0;
        if (price <= 0) return;

        const title = $card.find('h2, h3, [class*="title"]').first().text().trim();
        const location = $card.find('[class*="location"], [class*="address"]').first().text().trim();
        const imgSrc = $card.find('img').first().attr('src') || $card.find('img').first().attr('data-src');
        const details = $card.text();
        const rooms = parseInt(details.match(/(\d+)\s*(?:hab|cuarto|alcoba)/i)?.[1]) || null;
        const baths = parseInt(details.match(/(\d+)\s*(?:baño|bano)/i)?.[1]) || null;
        const area = parseFloat(details.match(/(\d+(?:\.\d+)?)\s*m[²2]/i)?.[1]) || null;

        listings.push({ title, price, location, rooms, bathrooms: baths, area_m2: area, link, image_url: imgSrc, city });
      } catch {
        // Skip malformed cards
      }
    });

    return listings;
  }

  parseListing(item, city, propertyType) {
    // From JSON-LD
    if (item._fromJsonLd) {
      const titleParts = (item.name || '').split(' - ');
      const locationPart = titleParts[0] || '';
      // Extract city/neighborhood from title like "Apartamento en arriendo - Bogotá/SAMPER"
      const locMatch = locationPart.match(/([^/]+)\/(.+)/);
      const neighborhood = locMatch ? locMatch[2]?.trim() : null;

      return normalizeListing({
        external_id: item.url || String(Math.random()),
        source: 'ciencuadras',
        title: item.name || null,
        address: null,
        neighborhood,
        city: item._city || city,
        building_name: null,
        price: item.price,
        admin_fee: 0,
        rooms: null,
        bathrooms: item.bathrooms,
        area_m2: item.area_m2,
        stratum: null,
        contact_phone: null,
        contact_name: null,
        source_url: item.url.startsWith('http') ? item.url : `${this.baseUrl}${item.url}`,
        image_url: item.image || null,
        images: (item.imageArray && item.imageArray.length > 0) ? item.imageArray : (item.image ? [item.image] : null),
        posted_at: null,
        property_type: propertyType
      });
    }

    // From transfer state
    if (item.precio || item.price || item.valorArriendo) {
      return normalizeListing({
        external_id: item.id || item.codigo || String(Math.random()),
        source: 'ciencuadras',
        title: item.titulo || item.title || null,
        address: item.direccion || item.address || null,
        neighborhood: item.barrio || item.sector || null,
        city: item.ciudad || city,
        building_name: item.nombreProyecto || item.proyecto || null,
        price: parseInt(item.precio || item.price || item.valorArriendo || 0),
        admin_fee: parseInt(item.administracion || 0),
        rooms: parseInt(item.habitaciones || item.alcobas || 0) || null,
        bathrooms: parseInt(item.banos || 0) || null,
        area_m2: parseFloat(item.areaConstruida || item.area || 0) || null,
        stratum: parseInt(item.estrato || 0) || null,
        contact_phone: item.telefono || item.celular || null,
        contact_name: item.inmobiliaria || null,
        source_url: item.link
          ? (item.link.startsWith('http') ? item.link : `${this.baseUrl}${item.link}`)
          : `${this.baseUrl}/inmueble/${item.id || ''}`,
        image_url: item.imagen || item.foto || null,
        images: Array.isArray(item.imagenes || item.galeria || item.fotos)
          ? (item.imagenes || item.galeria || item.fotos)
          : (item.imagen || item.foto ? [item.imagen || item.foto] : null),
        posted_at: item.fechaPublicacion || item.datePublished || item.fechaCreacion || null,
        property_type: propertyType
      });
    }

    // From HTML parsing
    return normalizeListing({
      external_id: item.link || String(Math.random()),
      source: 'ciencuadras',
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

  // Fetch full image gallery from property detail page
  async fetchDetailImages(sourceUrl) {
    try {
      const response = await fetch(sourceUrl, {
        headers: {
          ...defaultHeaders(),
          'Referer': this.baseUrl
        }
      });
      if (!response.ok) return null;

      const html = await response.text();
      const images = [];

      // Strategy 1: Extract S3 image URLs from the page
      // Ciencuadras uses: https://www-img-cc.s3.amazonaws.com/inmuebles/images/{id}/{hash}_plana.jpeg
      const s3Regex = /https:\/\/www-img-cc\.s3\.amazonaws\.com\/inmuebles\/images\/[^"'\s&;]+/g;
      let match;
      while ((match = s3Regex.exec(html)) !== null) {
        // Unescape HTML entities that ciencuadras uses (&q; for quotes)
        const url = match[0].replace(/&amp;/g, '&');
        images.push(url);
      }

      // Strategy 2: Look for gallery objects with "url" field (encoded with &q;)
      if (images.length === 0) {
        // Unescape the HTML entities first
        const unescaped = html.replace(/&q;/g, '"').replace(/&amp;/g, '&');
        const urlRegex = /"url"\s*:\s*"(https:\/\/www-img-cc\.s3\.amazonaws\.com\/[^"]+)"/g;
        while ((match = urlRegex.exec(unescaped)) !== null) {
          images.push(match[1]);
        }
      }

      // Strategy 3: Any img tags with ciencuadras image CDN
      if (images.length === 0) {
        const $ = cheerio.load(html);
        $('img[src*="s3.amazonaws.com"], img[data-src*="s3.amazonaws.com"]').each((_, el) => {
          const src = $(el).attr('src') || $(el).attr('data-src');
          if (src && src.includes('inmuebles/images')) images.push(src);
        });
      }

      // Deduplicate
      const unique = [...new Set(images)];
      return unique.length > 0 ? unique : null;
    } catch (err) {
      logger.warn(`[ciencuadras] Detail fetch failed for ${sourceUrl}: ${err.message}`);
      return null;
    }
  }
}
