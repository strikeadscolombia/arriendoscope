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

export function updateListingImages(fingerprint, imageUrl, imagesJson) {
  const db = getDb();
  return db.prepare(`
    UPDATE listings
    SET image_url = @imageUrl, images = @images
    WHERE fingerprint = @fingerprint
  `).run({ fingerprint, imageUrl, images: imagesJson });
}

export function getListingsNeedingImages(source, limit = 20) {
  const db = getDb();
  return db.prepare(`
    SELECT id, fingerprint, source_url, images
    FROM listings
    WHERE source = @source
      AND (images IS NULL OR images = 'null' OR images = '[]' OR length(images) < 5
           OR (json_valid(images) AND json_array_length(images) <= 1))
    ORDER BY created_at DESC
    LIMIT @limit
  `).all({ source, limit });
}

export function getNeighborhoods(city = null, search = '') {
  const db = getDb();
  const conditions = [`neighborhood IS NOT NULL`, `neighborhood != ''`];
  const params = {};

  if (city) {
    const cities = city.split(',');
    const placeholders = cities.map((_, i) => `@city${i}`);
    conditions.push(`LOWER(city) IN (${placeholders.join(',')})`);
    cities.forEach((c, i) => { params[`city${i}`] = c.toLowerCase(); });
  }

  if (search) {
    conditions.push(`LOWER(neighborhood) LIKE @search`);
    params.search = `%${search.toLowerCase()}%`;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  return db.prepare(`
    SELECT LOWER(neighborhood) as name, COUNT(*) as count
    FROM listings ${where}
    GROUP BY LOWER(neighborhood)
    ORDER BY count DESC
    LIMIT 50
  `).all(params);
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
    const cities = filters.city.split(',');
    const placeholders = cities.map((_, i) => `@city${i}`);
    conditions.push(`LOWER(city) IN (${placeholders.join(',')})`);
    cities.forEach((c, i) => { params[`city${i}`] = c.toLowerCase(); });
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
    const types = filters.propertyType.split(',');
    const placeholders = types.map((_, i) => `@ptype${i}`);
    conditions.push(`property_type IN (${placeholders.join(',')})`);
    types.forEach((t, i) => { params[`ptype${i}`] = t; });
  }

  if (filters.neighborhood) {
    conditions.push(`LOWER(neighborhood) LIKE @neighborhood`);
    params.neighborhood = `%${filters.neighborhood.toLowerCase()}%`;
  }

  // Time range filter: today, 3days, week, month
  if (filters.timeRange) {
    const rangeMap = {
      today: "date(created_at) = date('now')",
      '3days': "created_at >= datetime('now', '-3 days')",
      week: "created_at >= datetime('now', '-7 days')",
      month: "created_at >= datetime('now', '-30 days')"
    };
    const condition = rangeMap[filters.timeRange];
    if (condition) {
      conditions.push(condition);
    }
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
