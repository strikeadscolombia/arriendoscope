import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../../context/FavoritesContext';
import { ListingCard } from '../../components/ListingCard/ListingCard';
import { API_BASE } from '../../utils/constants';
import styles from './FavoritosPage.module.css';

export function FavoritosPage() {
  const { favorites } = useFavorites();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (favorites.size === 0) {
      setListings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fingerprints = [...favorites].join(',');
    fetch(`${API_BASE}/api/listings?fingerprints=${encodeURIComponent(fingerprints)}&limit=200`)
      .then(r => r.json())
      .then(data => {
        const favSet = new Set(favorites);
        const filtered = (data.listings || []).filter(l => favSet.has(l.fingerprint));
        setListings(filtered);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [favorites]);

  if (loading) {
    return (
      <>
        <div className={styles.header}>
          <h1 className={styles.title}>FAVORITOS</h1>
        </div>
        <div className={styles.feed}>
          <p className={styles.empty}>CARGANDO...</p>
        </div>
      </>
    );
  }

  if (favorites.size === 0) {
    return (
      <>
        <div className={styles.header}>
          <h1 className={styles.title}>FAVORITOS</h1>
          <p className={styles.subtitle}>TUS PROPIEDADES GUARDADAS</p>
        </div>
        <div className={styles.feed}>
          <div className={styles.emptyState}>
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" className={styles.emptyIcon}>
              <path d="M8 1.5l2 4.1 4.5.6-3.25 3.2.77 4.5L8 11.7l-4.02 2.2.77-4.5L1.5 6.2l4.5-.6z" />
            </svg>
            <p className={styles.emptyText}>AUN NO HAS GUARDADO NINGUNA PROPIEDAD</p>
            <p className={styles.emptyHint}>
              TOCA LA ESTRELLA EN CUALQUIER PROPIEDAD DEL{' '}
              <Link to="/" className={styles.emptyLink}>FEED</Link>{' '}
              PARA GUARDARLA AQUI
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>FAVORITOS</h1>
        <p className={styles.subtitle}>{listings.length} PROPIEDADES GUARDADAS</p>
      </div>
      <div className={styles.feed}>
        {listings.map(listing => (
          <ListingCard key={listing.fingerprint} listing={listing} />
        ))}
      </div>
    </>
  );
}
