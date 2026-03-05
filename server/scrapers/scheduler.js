import { MetrocuadradoScraper } from './metrocuadrado.js';
import { CiencuadrasScraper } from './ciencuadras.js';
import { MitulaScraper } from './mitula.js';
import { FincaRaizScraper } from './fincaraiz.js';
import { insertMany } from '../db/queries.js';
import { logger } from '../utils/logger.js';

const CITIES = ['bogota', 'medellin', 'cali', 'barranquilla', 'bucaramanga', 'cartagena'];

export class Scheduler {
  constructor(broadcast) {
    this.broadcast = broadcast;
    this.scrapers = [
      new MetrocuadradoScraper(),
      new CiencuadrasScraper(),
      new MitulaScraper(),
      new FincaRaizScraper()
    ];
    this.timers = [];
  }

  async runScraper(scraper) {
    try {
      logger.info(`[scheduler] Running ${scraper.name}...`);
      const listings = await scraper.scrape(CITIES);

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
    for (let i = 0; i < this.scrapers.length; i++) {
      setTimeout(() => {
        this.runScraper(this.scrapers[i]);
      }, i * 10000);
    }

    // Set up recurring intervals
    for (const scraper of this.scrapers) {
      const timer = setInterval(() => {
        this.runScraper(scraper);
      }, scraper.interval);
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
