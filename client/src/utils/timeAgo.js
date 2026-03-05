const UNITS = [
  { max: 60, unit: 's' },
  { max: 3600, unit: 'min', divisor: 60 },
  { max: 86400, unit: 'h', divisor: 3600 },
  { max: 604800, unit: 'd', divisor: 86400 },
  { max: Infinity, unit: 'sem', divisor: 604800 }
];

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 10) return 'ahora';

  for (const { max, unit, divisor } of UNITS) {
    if (seconds < max) {
      const val = divisor ? Math.floor(seconds / divisor) : seconds;
      return `hace ${val}${unit}`;
    }
  }
  return '';
}
