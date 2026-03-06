import { useState, useEffect, useRef } from 'react';
import { SOURCES, CITIES, ROOM_OPTIONS, PROPERTY_TYPES, API_BASE } from '../../utils/constants';
import styles from './FilterDrawer.module.css';

// Multi-select keys: these support comma-separated values
const MULTI_KEYS = new Set(['city', 'source', 'propertyType']);

export function FilterDrawer({ filters, onApply, onClose }) {
  const [local, setLocal] = useState({ ...filters });
  const [barrios, setBarrios] = useState([]);
  const [barrioSearch, setBarrioSearch] = useState('');
  const searchTimer = useRef(null);

  // Fetch barrios when city changes or user types
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (local.city) params.set('city', local.city);
      if (barrioSearch.length >= 2) params.set('search', barrioSearch);

      if (!local.city && barrioSearch.length < 2) {
        setBarrios([]);
        return;
      }

      fetch(`${API_BASE}/api/neighborhoods?${params}`)
        .then(r => r.json())
        .then(data => setBarrios(data))
        .catch(() => setBarrios([]));
    }, 300);

    return () => clearTimeout(searchTimer.current);
  }, [local.city, barrioSearch]);

  const selectBarrio = (name) => {
    setLocal(prev => {
      const next = { ...prev };
      if (next.neighborhood === name) {
        delete next.neighborhood;
      } else {
        next.neighborhood = name;
      }
      return next;
    });
  };

  const set = (key, value) => {
    setLocal(prev => {
      const next = { ...prev };

      if (MULTI_KEYS.has(key)) {
        // Multi-select toggle: append or remove from comma-separated list
        const current = (next[key] || '').split(',').filter(Boolean);
        const idx = current.indexOf(value);
        if (idx >= 0) {
          current.splice(idx, 1);
        } else {
          current.push(value);
        }
        if (current.length === 0) {
          delete next[key];
        } else {
          next[key] = current.join(',');
        }
      } else {
        // Single-select toggle
        if (next[key] === value) {
          delete next[key];
        } else {
          next[key] = value;
        }
      }
      return next;
    });
  };

  // Check if a value is selected (works for both single and multi-select)
  const isSelected = (key, value) => {
    if (!local[key]) return false;
    if (MULTI_KEYS.has(key)) {
      return local[key].split(',').includes(value);
    }
    return local[key] === value;
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>FILTROS</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.label}>CIUDAD</h3>
            <div className={styles.options}>
              {CITIES.map(c => (
                <button
                  key={c.value}
                  className={`${styles.option} ${isSelected('city', c.value) ? styles.selected : ''}`}
                  onClick={() => set('city', c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.label}>BARRIO</h3>
            <input
              type="text"
              className={styles.input}
              placeholder="BUSCAR BARRIO..."
              value={barrioSearch}
              onChange={e => setBarrioSearch(e.target.value)}
            />
            {local.neighborhood && (
              <div className={styles.selectedBarrio}>
                <span>{local.neighborhood.toUpperCase()}</span>
                <button onClick={() => selectBarrio(local.neighborhood)} className={styles.removeBarrio}>✕</button>
              </div>
            )}
            {barrios.length > 0 && !local.neighborhood && (
              <div className={styles.barrioList}>
                {barrios.map(b => (
                  <button
                    key={b.name}
                    className={styles.barrioOption}
                    onClick={() => selectBarrio(b.name)}
                  >
                    {b.name.toUpperCase()}
                    <span className={styles.barrioCount}>{b.count}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <h3 className={styles.label}>TIPO</h3>
            <div className={styles.options}>
              {PROPERTY_TYPES.map(t => (
                <button
                  key={t.value}
                  className={`${styles.option} ${isSelected('propertyType', t.value) ? styles.selected : ''}`}
                  onClick={() => set('propertyType', t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.label}>FUENTE</h3>
            <div className={styles.options}>
              {Object.entries(SOURCES).map(([key, val]) => (
                <button
                  key={key}
                  className={`${styles.option} ${isSelected('source', key) ? styles.selected : ''}`}
                  onClick={() => set('source', key)}
                >
                  {val.short}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.label}>PRECIO MENSUAL</h3>
            <div className={styles.rangeRow}>
              <input
                type="number"
                className={styles.input}
                placeholder="MIN"
                value={local.priceMin || ''}
                onChange={e => setLocal(p => ({ ...p, priceMin: e.target.value || undefined }))}
              />
              <span className={styles.dash}>—</span>
              <input
                type="number"
                className={styles.input}
                placeholder="MAX"
                value={local.priceMax || ''}
                onChange={e => setLocal(p => ({ ...p, priceMax: e.target.value || undefined }))}
              />
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.label}>HABITACIONES</h3>
            <div className={styles.options}>
              {ROOM_OPTIONS.map(r => (
                <button
                  key={r.value}
                  className={`${styles.option} ${local.rooms === r.value ? styles.selected : ''}`}
                  onClick={() => set('rooms', r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.label}>BANOS</h3>
            <div className={styles.options}>
              {['1', '2', '3'].map(v => (
                <button
                  key={v}
                  className={`${styles.option} ${local.bathrooms === v ? styles.selected : ''}`}
                  onClick={() => set('bathrooms', v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className={styles.footer}>
          <button className={styles.applyBtn} onClick={() => onApply(local)}>
            APLICAR FILTROS
          </button>
        </div>
      </div>
    </div>
  );
}
