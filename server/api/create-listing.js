import { Router } from 'express';
import { getDb } from '../db/init.js';
import { insertListing } from '../db/queries.js';
import { normalizeListing, generateFingerprint } from '../utils/normalize.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.post('/listings', (req, res) => {
  try {
    const {
      property_type, city, neighborhood, address,
      rooms, bathrooms, area_m2, stratum,
      price, admin_fee, images,
      contact_name, contact_phone, title
    } = req.body;

    // Validate required fields
    if (!city || !price || price <= 0) {
      return res.status(400).json({ error: 'City and price are required' });
    }

    if (!property_type || !['apartamento', 'casa', 'habitacion'].includes(property_type)) {
      return res.status(400).json({ error: 'Invalid property type' });
    }

    // Generate a unique external ID for user-created listings
    const externalId = `as-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const autoTitle = title || [
      property_type === 'apartamento' ? 'APARTAMENTO' :
      property_type === 'casa' ? 'CASA' : 'HABITACION',
      'EN ARRIENDO',
      neighborhood ? `EN ${neighborhood.toUpperCase()}` : '',
      city ? `- ${city.toUpperCase()}` : ''
    ].filter(Boolean).join(' ');

    const listing = normalizeListing({
      external_id: externalId,
      source: 'arriendoscope',
      title: autoTitle,
      address: address || null,
      neighborhood: neighborhood || null,
      city,
      building_name: null,
      price: parseInt(price),
      admin_fee: parseInt(admin_fee) || 0,
      rooms: rooms ? parseInt(rooms) : null,
      bathrooms: bathrooms ? parseInt(bathrooms) : null,
      area_m2: area_m2 ? parseFloat(area_m2) : null,
      stratum: stratum ? parseInt(stratum) : null,
      contact_phone: contact_phone || null,
      contact_name: contact_name || null,
      source_url: `arriendoscope://listing/${externalId}`,
      image_url: images?.[0] || null,
      images: images || null,
      posted_at: new Date().toISOString(),
      property_type
    });

    const wasInserted = insertListing(listing);

    if (!wasInserted) {
      return res.status(409).json({ error: 'Listing already exists' });
    }

    logger.info(`[create-listing] New listing created: ${autoTitle} ($${price})`);

    // Broadcast to WebSocket clients if broadcast function is available
    if (req.app.locals.broadcast) {
      const db = getDb();
      const row = db.prepare('SELECT * FROM listings WHERE fingerprint = ?').get(listing.fingerprint);
      if (row) {
        req.app.locals.broadcast({
          type: 'new_listings',
          listings: [row]
        });
      }
    }

    res.json({ ok: true, fingerprint: listing.fingerprint });
  } catch (err) {
    logger.error(`[create-listing] Error: ${err.message}`);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
