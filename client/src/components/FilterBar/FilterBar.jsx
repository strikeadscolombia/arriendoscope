import { useState } from 'react';
import { FilterDrawer } from '../FilterDrawer/FilterDrawer';
import { SOURCES, CITIES, PROPERTY_TYPES } from '../../utils/constants';
import styles from './FilterBar.module.css';

function getActiveLabels(filters) {
  const parts = [];

  if (filters.city) {
    const cities = filters.city.split(',');
    const labels = cities.map(v => {
      const c = CITIES.find(c => c.value === v);
      return c?.label || v.toUpperCase();
    });
    parts.push(labels.join(' + '));
  }

  if (filters.source) {
    const sources = filters.source.split(',');
    const labels = sources.map(v => {
      const s = SOURCES[v];
      return s?.short || v.toUpperCase();
    });
    parts.push(labels.join(' + '));
  }

  if (filters.propertyType) {
    const types = filters.propertyType.split(',');
    const labels = types.map(v => {
      const t = PROPERTY_TYPES.find(t => t.value === v);
      return t?.label || v.toUpperCase();
    });
    parts.push(labels.join(' + '));
  }

  if (filters.neighborhood) {
    parts.push(filters.neighborhood.toUpperCase());
  }

  if (filters.rooms) parts.push(`${filters.rooms} HAB`);
  if (filters.bathrooms) parts.push(`${filters.bathrooms} BA`);
  if (filters.priceMin) parts.push(`MIN $${Number(filters.priceMin).toLocaleString()}`);
  if (filters.priceMax) parts.push(`MAX $${Number(filters.priceMax).toLocaleString()}`);

  return parts;
}

export function FilterBar({ filters, onApply }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeParts = getActiveLabels(filters);
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
