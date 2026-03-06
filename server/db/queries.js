import { getDb } from './init.js';

export function insertListing(listing) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO listings
      (external_id, source, title, address, neighborhood, city, building_name,
       price, admin_fee, rooms, bathrooms, area_m2, stratum,
       contact_phone, contact_name, source_url, image_url, images, posted_at, property_type, fingerprint)
    VALUES
      (@external_id, @source, @title, @address, @neighborhood, @city, @building_name,
       @price, @admin_fee, @rooms, @bathrooms, @area_m2, @stratum,
       @contact_phone, @contact_name, @source_url, @image_url, @images, @posted_at, @property_type, @fingerprint)
  `);
  const result = stmt.run(listing);
  return result.changes > 0;
}

export function insertMany(listings) {
  const db = getDb();
  const inserted = [];
  const tx = db.transaction((items) => {
    for (const item of items) {
      const wasInserted = insertListing(item);
      if (wasInserted) {
        const row = db.prepare('SELECT * FROM listings WHERE fingerprint = ?').get(item.fingerprint);
        if (row) inserted.push(row);
      }
    }
  });
  tx(listings);
  return inserted;
}

export function getListings(filters = {}) {
  const db = getDb();
  const conditions = [];
  const params = {};

  if (filters.source) {
    const sources = filters.source.split(',');
    const placeholders = sources.map((_, i) => `@source${i}`);
    conditions.push(`source IN (${placeholders.join(',')})`);
    sources.forEach((s, i) => { params[`source${i}`] = s; });
  }

  if (filters.city) {
    conditions.push('LOWER(city) = LOWER(@city)');
    params.city = filters.city;
  }

  if (filters.priceMin) {
    conditions.push('price >= @priceMin');
    params.priceMin = Number(filters.priceMin);
  }

  if (filters.priceMax) {
    conditions.push('price <= @priceMax');
    params.priceMax = Number(filters.priceMax);
  }

  if (filters.rooms) {
    conditions.push('rooms = @rooms');
    params.rooms = Number(filters.rooms);
  }

  if (filters.bathrooms) {
    conditions.push('bathrooms = @bathrooms');
    params.bathrooms = Number(filters.bathrooms);
  }

  if (filters.propertyType) {
    conditions.push('property_type = @propertyType');
    params.propertyType = filters.propertyType;
  }

  if (filters.before) {
    conditions.push('created_at < @before');
    params.before = filters.before;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(Number(filters.limit) || 50, 200);
  params.limit = limit + 1;

  const rows = db.prepare(`
    SELECT * FROM listings ${where}
    ORDER BY created_at DESC
    LIMIT @limit
  `).all(params);

  const hasMore = rows.length > limit;
  const listings = hasMore ? rows.slice(0, limit) : rows;

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM listings ${where}`).get(params);

  return {
    listings,
    total: countRow.total,
    hasMore
  };
}
