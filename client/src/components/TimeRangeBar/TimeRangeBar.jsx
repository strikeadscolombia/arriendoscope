import styles from './TimeRangeBar.module.css';

const RANGES = [
  { value: 'today', label: 'HOY' },
  { value: '3days', label: '3 DÍAS' },
  { value: 'week', label: 'SEMANA' },
  { value: 'month', label: 'MES' }
];

export function TimeRangeBar({ value, onChange }) {
  return (
    <div className={styles.bar}>
      {RANGES.map(range => (
        <button
          key={range.value}
          className={`${styles.rangeBtn} ${value === range.value ? styles.active : ''}`}
          onClick={() => onChange(value === range.value ? null : range.value)}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
