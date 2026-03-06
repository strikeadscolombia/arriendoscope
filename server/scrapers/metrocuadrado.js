import { fetch } from 'undici';
import * as cheerio from 'cheerio';
import { BaseScraper } from './BaseScraper.js';
import { defaultHeaders } from '../utils/userAgent.js';
import { normalizeListing } from '../utils/normalize.js';
import { logger } from '../utils/logger.js';

const CITY_MAP = {
  bogota: 'bogota',
  medellin: 'medellin',
  cali: 'cali',
  barranquilla: 'barranquilla',
  bucaramanga: 'bucaramanga',
  cartagena: 'cartagena'
};

const TYPE_SLUGS = {
  apartamento: 'apartamento',
  casa: 'casa',
  habitacion: 'habitacion'
};

export class MetrocuadradoScraper extends BaseScraper {
  constructor() {
    super('metrocuadrado', {
      interval: 5 * 60 * 1000,
      maxPages: 3,
      baseUrl: 'https://www.metrocuadrado.com',
      propertyTypes: ['apartamento', 'casa', 'habitacion']
    });
  }

  async fetchPage(city, page, propertyType) {
    const from = page * 20;
    const typeSlug = TYPE_SLUGS[propertyType] || 'apartamento';
    const url = `${this.baseUrl}/arriendo/${typeSlug}/${CITY_MAP[city] || city}/?search=form&from=${from}`;

    const response = await fetch(url, {
      headers: defaultHeaders()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const html = await response.text();

    // Strategy 1: Classic __NEXT_DATA__
    const classicResults = this.extractClassicNextData(html);
    if (classicResults.length > 0) return classicResults;

    // Strategy 2: React Server Components streaming format (self.__next_f.push)
    const rscResults = this.extractRscData(html);
    if (rscResults.length > 0) return rscResults;

    // Strategy 3: Search for any JSON arrays with property-like objects
    const jsonResults = this.extractEmbeddedJson(html);
    if (jsonResults.length > 0) return jsonResults;

    logger.warn(`[metrocuadrado] No data found for ${city} page ${page}`);
    return [];
  }

  extractClassicNextData(html) {
    try {
      const $ = cheerio.load(html);
      const script = $('#__NEXT_DATA__').html();
      if (!script) return [];

      const data = JSON.parse(script);
      const props = data?.props?.pageProps;
      if (!props) return [];

      const candidates = [
        props?.initialFilter?.data?.results,
        props?.initialResults?.results,
        props?.results,
        props?.data?.results
      ];

      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0) return c;
      }
      return [];
    } catch {
      return [];
    }
  }

  extractRscData(html) {
    try {
      // Match self.__next_f.push chunks that contain property data
      const chunks = [];
      const regex = /self\.__next_f\.push\(\[[\d,]*"([^]*?)"\]\)/g;
      let match;

      while ((match = regex.exec(html)) !== null) {
        chunks.push(match[1]);
      }

      // Look for chunks that contain property field names
      for (const chunk of chunks) {
        // Unescape the string
        let unescaped;
        try {
          unescaped = chunk
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        } catch {
          continue;
        }

        // Find JSON arrays/objects with listing data
        const jsonMatches = unescaped.match(/\{"totalHits"[^]*?\}/g) ||
                           unescaped.match(/\{"results":\[[^]*?\]\}/g);

        if (jsonMatches) {
          for (const jsonStr of jsonMatches) {
            try {
              const data = JSON.parse(jsonStr);
              if (data.results && Array.isArray(data.results)) return data.results;
            } catch {
              // Try to find the results array within
            }
          }
        }

        // Also try to find arrays of objects with mvalorarriendo
        if (unescaped.includes('mvalorarriendo') || unescaped.includes('valorArriendo')) {
          const arrayMatches = unescaped.match(/\[\{[^]*?"(?:mvalorarriendo|valorArriendo)"[^]*?\}\]/g);
          if (arrayMatches) {
            for (const arrStr of arrayMatches) {
              try {
                const arr = JSON.parse(arrStr);
                if (Array.isArray(arr) && arr.length > 0) return arr;
              } catch {
                // Continue
              }
            }
          }
        }
      }

      // Alternative: try to extract JSON objects directly from the full HTML
      // Look for initialResults pattern
      const initialResultsMatch = html.match(/"initialResults"\s*:\s*(\{[^}]*"totalHits"\s*:\s*\d+[^}]*\})/);
      if (initialResultsMatch) {
        try {
          // Find the full JSON structure around it
          const startIdx = html.indexOf('"initialResults"');
          if (startIdx !== -1) {
            // Try to extract the results array
            const resultsStart = html.indexOf('"results":[', startIdx);
            if (resultsStart !== -1) {
              const arrayStart = html.indexOf('[', resultsStart);
              let depth = 0;
              let end = arrayStart;
              for (let i = arrayStart; i < html.length && i < arrayStart + 500000; i++) {
                if (html[i] === '[') depth++;
                if (html[i] === ']') depth--;
                if (depth === 0) { end = i + 1; break; }
              }
              const arrayStr = html.substring(arrayStart, end);
              const results = JSON.parse(arrayStr);
              if (Array.isArray(results) && results.length > 0) {
                logger.info(`[metrocuadrado] Extracted ${results.length} results from RSC data`);
                return results;
              }
            }
          }
        } catch {
          // Continue to next strategy
        }
      }

      return [];
    } catch (err) {
      logger.warn(`[metrocuadrado] RSC extraction error: ${err.message}`);
      return [];
    }
  }

  extractEmbeddedJson(html) {
    try {
      // Look for any JSON containing property listing fields
      const patterns = [
        /"title":"[^"]*arriendo[^"]*"/gi,
        /"mvalorarriendo":\d+/g,
        /"link":"\/inmueble\//g
      ];

      for (const pattern of patterns) {
        if (pattern.test(html)) {
          // Found property data, try to extract the containing array
          const matches = html.match(/\[\{"[^"]{1,30}":[^[\]]{10,}?"link":"\/inmueble\/[^]*?\}\]/g);
          if (matches) {
            for (const m of matches) {
              try {
                const parsed = JSON.parse(m);
                if (Array.isArray(parsed) && parsed.length > 2) return parsed;
              } catch {
                // Try a shorter extraction
              }
            }
          }
        }
        pattern.lastIndex = 0;
      }
      return [];
    } catch {
      return [];
    }
  }

  // Extract string from field that might be an object with 'nombre' or 'name'
  str(val) {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.nombre || val.name || val.valor || String(val);
    return String(val);
  }

  num(val) {
    if (!val) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'object') return parseInt(val.valor || val.value || val.id) || null;
    return parseInt(val) || null;
  }

  parseListing(item, city, propertyType) {
    const externalId = item.midinmueble || item.id || item.idInmueble || item.codigo || String(Math.random());
    const price = this.num(item.mvalorarriendo) || this.num(item.valorArriendo) || this.num(item.precio) || 0;

    if (!price || price <= 0) return null;

    // WhatsApp number is often the best contact - clean it
    const whatsapp = item.whatsapp ? item.whatsapp.replace(/\D/g, '').replace(/^57/, '') : null;

    // Images: try multiple gallery field names
    const gallery = Array.isArray(item.mgaleriainmueble) ? item.mgaleriainmueble
      : Array.isArray(item.imagenes) ? item.imagenes
      : Array.isArray(item.galeria) ? item.galeria
      : Array.isArray(item.fotos) ? item.fotos
      : null;

    return normalizeListing({
      external_id: externalId,
      source: 'metrocuadrado',
      title: item.title || this.str(item.mtitulo) || null,
      address: this.str(item.mdireccion) || this.str(item.direccion) || null,
      neighborhood: this.str(item.mbarrio) || this.str(item.mnombrecomunbarrio) || this.str(item.mzona) || null,
      city: this.str(item.mciudad) || this.str(item.ciudad) || city,
      building_name: this.str(item.mnombrecomunbarrio) || this.str(item.mnombreproyecto) || null,
      price,
      admin_fee: this.num(item.mvaloradministracion) || 0,
      rooms: this.num(item.mnrocuartos) || this.num(item.numHabitaciones) || null,
      bathrooms: this.num(item.mnrobanos) || this.num(item.numBanos) || null,
      area_m2: parseFloat(this.str(item.mareaconstruida) || this.str(item.mareac) || this.str(item.marea) || '0') || null,
      stratum: this.num(item.mestrato) || null,
      contact_phone: whatsapp || item.contactPhone || item.mcontactoinmobiliaria_celular1 || item.mcontactosucursal_celular1 || null,
      contact_name: this.str(item.mnombreconstructor) || item.contactName || null,
      source_url: item.link
        ? `${this.baseUrl}${item.link}`
        : `${this.baseUrl}/inmueble/${externalId}`,
      image_url: item.imageLink || (gallery && gallery[0]) || item.imagen || null,
      images: gallery || (item.imageLink ? [item.imageLink] : null),
      posted_at: item.fechaCreacion || item.fechaPublicacion || null,
      property_type: propertyType
    });
  }
}
