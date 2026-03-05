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
);

CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_rooms ON listings(rooms);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_fingerprint ON listings(fingerprint);
