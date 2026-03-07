import styles from './TimeRangeBar.module.css';

const SHORT_RANGES = [
  { value: '1m',  label: '1M' },
  { value: '5m',  label: '5M' },
  { value: '15m', label: '15M' },
  { value: '30m', label: '30M' },
  { value: '1h',  label: '1H' },
  { value: '3h',  label: '3H' },
  { value: '6h',  label: '6H' },
  { value: '12h', label: '12H' },
];

const LONG_RANGES = [
  { value: 'today', label: 'HOY' },
  { value: '3days', label: '3D' },
  { value: 'week',  label: '1S' },
  { value: 'month', label: 'MES' },
];

export function TimeRangeBar({ value, onChange }) {
  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        {SHORT_RANGES.map(range => (
          <button
            key={range.value}
            className={`${styles.rangeBtn} ${value === range.value ? styles.active : ''}`}
            onClick={() => onChange(value === range.value ? null : range.value)}
          >
            {range.label}
          </button>
        ))}
      </div>
      <div className={styles.row}>
        {LONG_RANGES.map(range => (
          <button
            key={range.value}
            className={`${styles.rangeBtn} ${styles.rangeBtnLong} ${value === range.value ? styles.active : ''}`}
            onClick={() => onChange(value === range.value ? null : range.value)}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}
