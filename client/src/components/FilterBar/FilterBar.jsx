import { useState } from 'react';
import { FilterDrawer } from '../FilterDrawer/FilterDrawer';
import { SOURCES, CITIES } from '../../utils/constants';
import styles from './FilterBar.module.css';

function getActiveLabel(filters) {
  const parts = [];
  if (filters.city) {
    const c = CITIES.find(c => c.value === filters.city);
    parts.push(c?.label || filters.city.toUpperCase());
  }
  if (filters.source) {
    const s = SOURCES[filters.source];
    parts.push(s?.short || filters.source.toUpperCase());
  }
  if (filters.rooms) parts.push(`${filters.rooms} HAB`);
  if (filters.priceMax) parts.push(`MAX $${(Number(filters.priceMax) / 1000000).toFixed(1)}M`);
  return parts;
}

export function FilterBar({ filters, onApply }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeParts = getActiveLabel(filters);
  const hasFilters = activeParts.length > 0;

  return (
    <>
      <div className={styles.bar}>
        <button
          className={`${styles.filterBtn} ${hasFilters ? styles.active : ''}`}
          onClick={() => setDrawerOpen(true)}
        >
          FILTROS{hasFilters ? ` (${activeParts.length})` : ''}
        </button>
        {activeParts.map((label, i) => (
          <span key={i} className={styles.chip}>{label}</span>
        ))}
        {hasFilters && (
          <button className={styles.clearBtn} onClick={() => onApply({})}>
            ✕
          </button>
        )}
      </div>
      {drawerOpen && (
        <FilterDrawer
          filters={filters}
          onApply={(f) => { onApply(f); setDrawerOpen(false); }}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
