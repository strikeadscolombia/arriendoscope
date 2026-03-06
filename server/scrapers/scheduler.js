import { MetrocuadradoScraper } from './metrocuadrado.js';
import { CiencuadrasScraper } from './ciencuadras.js';
import { MitulaScraper } from './mitula.js';
import { FincaRaizScraper } from './fincaraiz.js';
import { CraigslistScraper } from './craigslist.js';
import { insertMany } from '../db/queries.js';
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
  }

  stop() {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers = [];
    logger.info('[scheduler] Stopped');
  }
}
