export function formatPrice(price) {
  if (!price && price !== 0) return '';
  return '$' + price.toLocaleString('es-CO');
}
