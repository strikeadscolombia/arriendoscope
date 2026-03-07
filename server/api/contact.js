import { Router } from 'express';
import { getDb } from '../db/init.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.post('/contact', (req, res) => {
  try {
    const { nombre, whatsapp, motivo } = req.body;

    if (!nombre || !whatsapp || !motivo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (nombre.length > 200 || whatsapp.length > 30 || motivo.length > 5000) {
      return res.status(400).json({ error: 'Field too long' });
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO contacts (nombre, whatsapp, motivo)
      VALUES (@nombre, @whatsapp, @motivo)
    `).run({ nombre, whatsapp, motivo });

    logger.info(`[contact] New message from ${nombre} (${whatsapp})`);
    res.json({ ok: true });
  } catch (err) {
    logger.error(`[contact] Error: ${err.message}`);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
