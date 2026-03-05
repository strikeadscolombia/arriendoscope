import { Router } from 'express';
import { getListings } from '../db/queries.js';

const router = Router();

router.get('/listings', (req, res) => {
  try {
    const filters = {
      source: req.query.source || null,
      city: req.query.city || null,
      priceMin: req.query.priceMin || null,
      priceMax: req.query.priceMax || null,
      rooms: req.query.rooms || null,
      bathrooms: req.query.bathrooms || null,
      before: req.query.before || null,
      limit: req.query.limit || 50
    };

    const result = getListings(filters);
    res.json(result);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
