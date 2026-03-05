import { WebSocketServer } from 'ws';
import { logger } from '../utils/logger.js';

let wss;
const clients = new Set();

export function setupWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    clients.add(ws);
    logger.info(`[ws] Client connected (${clients.size} total)`);

    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));

    ws.on('close', () => {
      clients.delete(ws);
      logger.info(`[ws] Client disconnected (${clients.size} total)`);
    });

    ws.on('error', (err) => {
      logger.error(`[ws] Error: ${err.message}`);
      clients.delete(ws);
    });
  });

  // Heartbeat every 30s
  setInterval(() => {
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }
  }, 30000);

  return wss;
}

export function broadcast(data) {
  const msg = JSON.stringify(data);
  let sent = 0;
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(msg);
      sent++;
    }
  }
  if (sent > 0) {
    logger.info(`[ws] Broadcast to ${sent} clients: ${data.type}`);
  }
}
