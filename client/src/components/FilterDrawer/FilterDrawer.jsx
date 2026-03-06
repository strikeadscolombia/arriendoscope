import { useState } from 'react';
import { SOURCES, CITIES, ROOM_OPTIONS, PROPERTY_TYPES } from '../../utils/constants';
import styles from './FilterDrawer.module.css';

export function FilterDrawer({ filters, onApply, onClose }) {
  const [local, setLocal] = useState({ ...filters });

  const set = (key, value) => {
    setLocal(prev => {
      const next = { ...prev };
      if (next[key] === value) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
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
                  className={`${styles.option} ${local.city === c.value ? styles.selected : ''}`}
                  onClick={() => set('city', c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.label}>TIPO</h3>
            <div className={styles.options}>
              {PROPERTY_TYPES.map(t => (
                <button
                  key={t.value}
                  className={`${styles.option} ${local.propertyType === t.value ? styles.selected : ''}`}
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
                  className={`${styles.option} ${local.source === key ? styles.selected : ''}`}
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
