import { useEffect, useRef } from 'react';
import { ListingCard } from '../ListingCard/ListingCard';
import { SkeletonCard } from '../Skeleton/SkeletonCard';
import styles from './Feed.module.css';

export function Feed({ listings, loading, hasMore, loadMore, onScrollPositionChange }) {
  const sentinelRef = useRef(null);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  // Scroll position detection for auto-insert
  useEffect(() => {
    if (!onScrollPositionChange) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          onScrollPositionChange(window.scrollY < 200);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onScrollPositionChange]);

  return (
    <div className={styles.feed}>
      {listings.map((listing) => (
        <ListingCard key={listing.id || listing.fingerprint} listing={listing} />
      ))}

      {loading && (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      )}

      {!loading && listings.length === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>∅</span>
          <p className={styles.emptyText}>NO HAY ARRIENDOS</p>
          <p className={styles.emptyHint}>AJUSTA LOS FILTROS O ESPERA NUEVOS LISTINGS</p>
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className={styles.sentinel} />}
    </div>
  );
}
