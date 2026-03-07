import { createServer } from 'http';
import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db/init.js';
import listingsRouter from './api/listings.js';
import contactRouter from './api/contact.js';
import createListingRouter from './api/create-listing.js';
import { setupWebSocket, broadcast } from './ws/broadcast.js';
import { Scheduler } from './scrapers/scheduler.js';
import { logger } from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['*'];

// Initialize database
getDb();
logger.info('Database initialized');

const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Make broadcast available to route handlers
app.locals.broadcast = broadcast;

// API routes
app.use('/api', listingsRouter);
app.use('/api', contactRouter);
app.use('/api', createListingRouter);

// Serve client build in production (if available)
const clientDist = join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') return next();
  res.sendFile(join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Not found' });
  });
});

// Create HTTP server
const server = createServer(app);

// WebSocket
setupWebSocket(server);

// Start scraper scheduler
const scheduler = new Scheduler(broadcast);
scheduler.start();

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on http://0.0.0.0:${PORT}`);
  logger.info(`WebSocket on ws://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  scheduler.stop();
  server.close();
  process.exit(0);
});
