import { logger } from '../utils/logger.js';

export class BaseScraper {
  constructor(name, config = {}) {
    this.name = name;
    this.interval = config.interval || 5 * 60 * 1000;
    this.maxPages = config.maxPages || 3;
    this.baseUrl = config.baseUrl || '';
    this.propertyTypes = config.propertyTypes || ['apartamento'];
    this.running = false;
  }

  async fetchPage(city, page, propertyType) {
    throw new Error(`${this.name}: fetchPage() not implemented`);
  }

  parseListing(raw, city, propertyType) {
    throw new Error(`${this.name}: parseListing() not implemented`);
  }

  async scrape(cities) {
    if (this.running) {
      logger.warn(`[${this.name}] Already running, skipping`);
      return [];
    }
    this.running = true;
    const allListings = [];

    for (const propertyType of this.propertyTypes) {
      for (const city of cities) {
        for (let page = 0; page < this.maxPages; page++) {
          try {
            const rawItems = await this.fetchPage(city, page, propertyType);
            if (!rawItems || rawItems.length === 0) break;

            for (const item of rawItems) {
              try {
                const parsed = this.parseListing(item, city, propertyType);
                if (parsed && parsed.price > 0) {
                  allListings.push(parsed);
                }
              } catch (err) {
                logger.error(`[${this.name}] parse error: ${err.message}`);
              }
            }

            logger.info(`[${this.name}] ${city}/${propertyType} page ${page}: ${rawItems.length} items`);
            await this.delay(2000 + Math.random() * 3000);
          } catch (err) {
            logger.error(`[${this.name}] ${city}/${propertyType} page ${page}: ${err.message}`);
            break;
          }
        }
      }
    }

    this.running = false;
    logger.info(`[${this.name}] Total: ${allListings.length} listings`);
    return allListings;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
