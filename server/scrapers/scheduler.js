import { MetrocuadradoScraper } from './metrocuadrado.js';
import { CiencuadrasScraper } from './ciencuadras.js';
import { MitulaScraper } from './mitula.js';
import { FincaRaizScraper } from './fincaraiz.js';
import { CraigslistScraper } from './craigslist.js';
import { insertMany, getListingsNeedingImages, updateListingImages } from '../db/queries.js';
import { logger } from '../utils/logger.js';

const COLOMBIA_CITIES = ['bogota', 'medellin', 'cali', 'barranquilla', 'bucaramanga', 'cartagena'];

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

  async enrichCraigslistImages() {
    if (this.enriching) return;
    this.enriching = true;

    try {
      const needsImages = getListingsNeedingImages('craigslist', 20);
      if (needsImages.length === 0) {
        logger.info('[scheduler] Craigslist enrich: no listings need images');
        this.enriching = false;
        return;
      }

      logger.info(`[scheduler] Enriching images for ${needsImages.length} craigslist listings...`);
      const clScraper = this.scraperConfigs.find(c => c.scraper.name === 'craigslist')?.scraper;
      if (!clScraper) { this.enriching = false; return; }

      let enriched = 0;
      for (const listing of needsImages) {
        try {
          await clScraper.delay(3000 + Math.random() * 4000);
          const images = await clScraper.fetchDetailImages(listing.source_url);
          if (images && images.length > 0) {
            updateListingImages(listing.fingerprint, images[0], JSON.stringify(images));
            enriched++;
            logger.info(`[scheduler] Enriched ${listing.fingerprint.slice(0, 8)}: ${images.length} images`);
          }
        } catch (err) {
          logger.warn(`[scheduler] Enrich failed: ${err.message}`);
        }
      }

      logger.info(`[scheduler] Craigslist enrich done: ${enriched}/${needsImages.length} updated`);

      // Broadcast update so frontend refreshes
      if (enriched > 0) {
        this.broadcast({
          type: 'images_updated',
          source: 'craigslist',
          count: enriched
        });
      }
    } catch (err) {
      logger.error(`[scheduler] Craigslist enrich error: ${err.message}`);
    } finally {
      this.enriching = false;
    }
  }

  async start() {
    logger.info('[scheduler] Starting initial scrape of all sources...');

    // Run all scrapers once on startup, staggered by 10s
    for (let i = 0; i < this.scraperConfigs.length; i++) {
      setTimeout(() => {
        this.runScraper(this.scraperConfigs[i]);
      }, i * 10000);
    }

    // Set up recurring intervals
    for (const config of this.scraperConfigs) {
      const timer = setInterval(() => {
        this.runScraper(config);
      }, config.scraper.interval);
      this.timers.push(timer);
    }

    // Image enrichment: start 5 min after boot, then every 10 min
    const enrichTimer = setTimeout(() => {
      this.enrichCraigslistImages();
      const recurring = setInterval(() => {
        this.enrichCraigslistImages();
      }, 10 * 60 * 1000);
      this.timers.push(recurring);
    }, 5 * 60 * 1000);
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
