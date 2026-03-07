import styles from './TimeRangeBar.module.css';

const RANGES = [
  { value: 'today', label: 'HOY' },
  { value: '5m',    label: '5m' },
  { value: '15m',   label: '15m' },
  { value: '30m',   label: '30m' },
  { value: '1h',    label: '1H' },
  { value: '6h',    label: '6H' },
  { value: '12h',   label: '12H' },
  { value: '1day',  label: '1D' },
  { value: 'week',  label: '1S' },
  { value: 'month', label: '1M' },
];

export function TimeRangeBar({ value, onChange }) {
  return (
    <div className={styles.bar}>
      <div className={styles.buttons}>
        {RANGES.map(range => (
          <button
            key={range.value}
            className={`${styles.rangeBtn} ${value === range.value ? styles.active : ''}`}
            onClick={() => {
              // HOY is always active — clicking it when active does nothing
              // Clicking another active button deselects it (back to HOY)
              if (range.value === 'today') {
                onChange('today');
              } else {
                onChange(value === range.value ? 'today' : range.value);
              }
            }}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}
