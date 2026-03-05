function timestamp() {
  return new Date().toISOString().slice(11, 19);
}

export const logger = {
  info: (msg) => console.log(`[${timestamp()}] ${msg}`),
  error: (msg) => console.error(`[${timestamp()}] ERROR: ${msg}`),
  warn: (msg) => console.warn(`[${timestamp()}] WARN: ${msg}`)
};
