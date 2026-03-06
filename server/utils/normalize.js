import { createHash } from 'crypto';

export function generateFingerprint(source, externalId, price) {
  const raw = `${source}:${externalId}:${price}`;
  return createHash('sha256').update(raw).digest('hex');
}

const CITY_NORMALIZE = {
  'bogotá d.c.': 'bogota', 'bogotá': 'bogota', 'bogota d.c.': 'bogota', 'bogota': 'bogota',
  'medellín': 'medellin', 'medellin': 'medellin',
  'cali': 'cali', 'santiago de cali': 'cali',
  'barranquilla': 'barranquilla',
  'cartagena de indias': 'cartagena', 'cartagena': 'cartagena',
  'bucaramanga': 'bucaramanga',
  'pereira': 'pereira', 'manizales': 'manizales',
  'envigado': 'envigado', 'sabaneta': 'sabaneta', 'itagui': 'itagui', 'itagüí': 'itagui',
  'rionegro': 'rionegro', 'cajicá': 'cajica', 'cajica': 'cajica',
  'chia': 'chia', 'chía': 'chia',
  'miami': 'miami', 'miami beach': 'miami', 'miami-dade': 'miami'
};

function normalizeCity(city) {
  if (!city) return 'desconocida';
  const key = city.toLowerCase().trim();
  return CITY_NORMALIZE[key] || key;
}

export function normalizeListing(raw) {
  return {
    external_id: raw.external_id || null,
    source: raw.source,
    title: raw.title || null,
    address: raw.address || null,
    neighborhood: raw.neighborhood || null,
    city: normalizeCity(raw.city),
    building_name: raw.building_name || null,
    price: parseInt(raw.price) || 0,
    admin_fee: parseInt(raw.admin_fee) || 0,
    rooms: raw.rooms != null ? parseInt(raw.rooms) : null,
    bathrooms: raw.bathrooms != null ? parseInt(raw.bathrooms) : null,
    area_m2: raw.area_m2 != null ? parseFloat(raw.area_m2) : null,
    stratum: raw.stratum != null ? parseInt(raw.stratum) : null,
    contact_phone: raw.contact_phone || null,
    contact_name: raw.contact_name || null,
    source_url: raw.source_url,
    image_url: raw.image_url || null,
    images: raw.images
      ? JSON.stringify(Array.isArray(raw.images) ? raw.images.filter(Boolean) : [raw.images])
      : null,
    posted_at: raw.posted_at || null,
    property_type: raw.property_type || 'apartamento',
    fingerprint: generateFingerprint(raw.source, raw.external_id || raw.source_url, raw.price)
  };
}
