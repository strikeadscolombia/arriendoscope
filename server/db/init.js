import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use DATA_DIR env var for persistent storage (e.g. Railway Volume at /data)
// Falls back to server/ directory for local development
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..');
const DB_PATH = join(DATA_DIR, 'arriendos.db');

let db;

export function getDb() {
  if (!db) {
    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    console.log(`[db] Opening database at: ${DB_PATH}`);
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Create base table (without migration columns)
    db.exec(`
      CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        external_id TEXT,
        source TEXT NOT NULL,
        title TEXT,
        address TEXT,
        neighborhood TEXT,
        city TEXT NOT NULL,
        building_name TEXT,
        price INTEGER NOT NULL,
        admin_fee INTEGER DEFAULT 0,
        rooms INTEGER,
        bathrooms INTEGER,
        area_m2 REAL,
        stratum INTEGER,
        contact_phone TEXT,
        contact_name TEXT,
        source_url TEXT NOT NULL,
        image_url TEXT,
        scraped_at TEXT NOT NULL DEFAULT (datetime('now')),
        posted_at TEXT,
        fingerprint TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Migrations: add columns if not exists
    const migrations = [
      'ALTER TABLE listings ADD COLUMN images TEXT',
      "ALTER TABLE listings ADD COLUMN property_type TEXT DEFAULT 'apartamento'"
    ];
    for (const sql of migrations) {
      try { db.exec(sql); } catch (e) { /* already exists */ }
    }

    // Indexes (after migrations so all columns exist)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);
      CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
      CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
      CREATE INDEX IF NOT EXISTS idx_listings_rooms ON listings(rooms);
      CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_listings_fingerprint ON listings(fingerprint);
      CREATE INDEX IF NOT EXISTS idx_listings_property_type ON listings(property_type);
    `);
  }
  return db;
}
