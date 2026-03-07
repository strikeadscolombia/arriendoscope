export const SOURCES = {
  metrocuadrado: { label: 'METROCUADRADO', short: 'MC' },
  ciencuadras: { label: 'CIENCUADRAS', short: 'CC' },
  mitula: { label: 'MITULA', short: 'MT' },
  fincaraiz: { label: 'FINCARAIZ', short: 'FR' },
  craigslist: { label: 'CRAIGSLIST', short: 'CL' },
  bayut: { label: 'BAYUT', short: 'BY' },
  arriendoscope: { label: 'ARRIENDOSCOPE', short: 'AS' }
};

export const CITIES = [
  { value: 'bogota', label: 'BOGOTA' },
  { value: 'medellin', label: 'MEDELLIN' },
  { value: 'cali', label: 'CALI' },
  { value: 'barranquilla', label: 'BARRANQUILLA' },
  { value: 'bucaramanga', label: 'BUCARAMANGA' },
  { value: 'cartagena', label: 'CARTAGENA' },
  { value: 'pereira', label: 'PEREIRA' },
  { value: 'manizales', label: 'MANIZALES' },
  { value: 'miami', label: 'MIAMI' },
  { value: 'dubai', label: 'DUBAI' }
];

export const PROPERTY_TYPES = [
  { value: 'apartamento', label: 'APTO' },
  { value: 'casa', label: 'CASA' },
  { value: 'habitacion', label: 'HAB' }
];

export const ROOM_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4+' }
];

export const API_BASE = import.meta.env.VITE_API_URL || '';

// WebSocket: auto-detect protocol and host for production
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsDefault = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws')
  : `${wsProtocol}//${window.location.hostname}:3001`;
export const WS_URL = import.meta.env.VITE_WS_URL || wsDefault;
