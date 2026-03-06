import { MetrocuadradoScraper } from './metrocuadrado.js';
import { CiencuadrasScraper } from './ciencuadras.js';
import { MitulaScraper } from './mitula.js';
import { FincaRaizScraper } from './fincaraiz.js';
import { CraigslistScraper } from './craigslist.js';
import { insertMany, getListingsNeedingImages, updateListingImages } from '../db/queries.js';
import { logger } from '../utils/logger.js';

const COLOMBIA_CITIES = ['bogota', 'medellin', 'cali', 'barranquilla', 'bucaramanga', 'cartagena'];

// Sources that support detail page image enrichment
const ENRICHABLE_SOURCES = ['craigslist', 'ciencuadras', 'metrocuadrado'];

export class Scheduler {
  constructor(broadcast) {
    this.broadcast = broadcast;
    this.scraperConfigs = [
      { scraper: new MetrocuadradoScraper(), cities: COLOMBIA_CITIES },
      { scraper: new CiencuadrasScraper(), cities: COLOMBIA_CITIES },
      { scraper: new MitulaScraper(), cities: COLOMBIA_CITIES },
      { scraper: new FincaRaizScraper(), cities: COLOMBIA_CITIES },
      { scraper: new CraigslistScraper(), cities: ['miami'] }
    ];
    this.timers = [];
    this.enriching = false;
  }

  async runScraper({ scraper, cities }) {
    try {
      logger.info(`[scheduler] Running ${scraper.name} for ${cities.join(', ')}...`);
      const listings = await scraper.scrape(cities);

      if (listings.length === 0) {
        logger.info(`[scheduler] ${scraper.name}: no listings found`);
        return;
      }

      const newListings = insertMany(listings);
      logger.info(`[scheduler] ${scraper.name}: ${newListings.length} new of ${listings.length} total`);

      if (newListings.length > 0) {
        this.broadcast({
          type: 'new_listings',
          listings: newListings,
          count: newListings.length,
          source: scraper.name
        });
      }
    } catch (err) {
      logger.error(`[scheduler] ${scraper.name} failed: ${err.message}`);
    }
  }

  // Generic image enrichment for any source that has fetchDetailImages()
  async enrichImages(sourceName, batchSize = 15) {
    const scraper = this.scraperConfigs.find(c => c.scraper.name === sourceName)?.scraper;
    if (!scraper || typeof scraper.fetchDetailImages !== 'function') return;

    const needsImages = getListingsNeedingImages(sourceName, batchSize);
    if (needsImages.length === 0) {
      return;
    }

    logger.info(`[scheduler] Enriching images for ${needsImages.length} ${sourceName} listings...`);

    let enriched = 0;
    for (const listing of needsImages) {
      try {
        // Rate limit: 2-5s between detail page requests
        await scraper.delay(2000 + Math.random() * 3000);
        const images = await scraper.fetchDetailImages(listing.source_url);
        if (images && images.length > 1) {
          updateListingImages(listing.fingerprint, images[0], JSON.stringify(images));
          enriched++;
          logger.info(`[scheduler] ${sourceName} enriched ${listing.fingerprint.slice(0, 8)}: ${images.length} images`);
        }
      } catch (err) {
        logger.warn(`[scheduler] ${sourceName} enrich failed: ${err.message}`);
      }
    }

    if (enriched > 0) {
      logger.info(`[scheduler] ${sourceName} enrich done: ${enriched}/${needsImages.length} updated`);
      this.broadcast({
        type: 'images_updated',
        source: sourceName,
        count: enriched
      });
    }
  }

  // Cycle through all enrichable sources
  async enrichAllSources() {
    if (this.enriching) return;
    this.enriching = true;

    try {
      for (const source of ENRICHABLE_SOURCES) {
        await this.enrichImages(source);
      }
    } catch (err) {
      logger.error(`[scheduler] Enrich cycle error: ${err.message}`);
    } finally {
      this.enriching = false;
    }
  }

  async start() {
    logger.info('[scheduler] Starting initial scrape of all sources...');

    // Run all scrapers once on startup, staggered by 5s for faster initial load
    for (let i = 0; i < this.scraperConfigs.length; i++) {
      setTimeout(() => {
        this.runScraper(this.scraperConfigs[i]);
      }, i * 5000);
    }

    // Set up recurring intervals with slight random jitter to avoid thundering herd
    for (const config of this.scraperConfigs) {
      const jitter = Math.floor(Math.random() * 30000); // 0-30s jitter
      const timer = setInterval(() => {
        this.runScraper(config);
      }, config.scraper.interval + jitter);
      this.timers.push(timer);
      logger.info(`[scheduler] ${config.scraper.name}: every ${Math.round(config.scraper.interval / 60000)}min`);
    }

    // Image enrichment: start 2 min after boot, then every 5 min
    // Cycles through craigslist, ciencuadras, and metrocuadrado
    const enrichTimer = setTimeout(() => {
      this.enrichAllSources();
      const recurring = setInterval(() => {
        this.enrichAllSources();
      }, 5 * 60 * 1000);
      this.timers.push(recurring);
    }, 2 * 60 * 1000);
    this.timers.push(enrichTimer);
  }

  stop() {
    for (const timer of this.timers) {
      clearInterval(timer);
      clearTimeout(timer);
    }
    this.timers = [];
    logger.info('[scheduler] Stopped');
  }
}
