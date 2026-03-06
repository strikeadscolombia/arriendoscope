export function formatPrice(price, source) {
  if (!price && price !== 0) return '';
  if (source === 'craigslist') {
    return 'US$' + price.toLocaleString('en-US');
  }
  return '$' + price.toLocaleString('es-CO');
}
