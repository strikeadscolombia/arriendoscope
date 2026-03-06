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

const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

export function formatExactTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${hours}:${mins}`;
}

export function minutesOnList(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
}

export function formatPostedAt(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  if (isNaN(d.getTime())) return null;
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const now = new Date();
  if (year !== now.getFullYear()) {
    return `${day} ${month} ${year}`;
  }
  return `${day} ${month}`;
}
