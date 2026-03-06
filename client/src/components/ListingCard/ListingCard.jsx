import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { formatPrice } from '../../utils/formatPrice';
import { formatExactTime, minutesOnList, formatPostedAt } from '../../utils/timeAgo';
import { SOURCES } from '../../utils/constants';
import { ImageGallery } from '../ImageGallery/ImageGallery';
import styles from './ListingCard.module.css';

function TimeOnList({ dateStr }) {
  const [minutes, setMinutes] = useState(() => minutesOnList(dateStr));

  useEffect(() => {
    const id = setInterval(() => {
      setMinutes(minutesOnList(dateStr));
    }, 60000);
    return () => clearInterval(id);
  }, [dateStr]);

  if (minutes < 1) return <span className={styles.onList}>AHORA EN LISTA</span>;

  const display = minutes < 60
    ? `${minutes}MIN EN LISTA`
    : minutes < 1440
      ? `${Math.floor(minutes / 60)}H EN LISTA`
      : `${Math.floor(minutes / 1440)}D EN LISTA`;

  return <span className={styles.onList}>{display}</span>;
}

const TYPE_LABELS = {
  habitacion: 'HAB',
  casa: 'CASA'
};

export const ListingCard = memo(function ListingCard({ listing }) {
  const [isNew, setIsNew] = useState(!!listing._isNew);

  useEffect(() => {
    if (!isNew) return;
    const timer = setTimeout(() => setIsNew(false), 2000);
    return () => clearTimeout(timer);
  }, [isNew]);

  const source = SOURCES[listing.source] || { label: listing.source?.toUpperCase(), short: '?' };
  const hasPhone = listing.contact_phone && listing.contact_phone.length > 5;

  // WhatsApp prefix: +1 for US/Miami, +57 for Colombia
  const waPrefix = listing.source === 'craigslist' ? '1' : '57';

  const images = useMemo(() => {
    if (listing.images) {
      try {
        const parsed = JSON.parse(listing.images);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return listing.image_url ? [listing.image_url] : [];
  }, [listing.images, listing.image_url]);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const openGallery = useCallback((idx) => {
    setGalleryIndex(idx);
    setGalleryOpen(true);
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryOpen(false);
  }, []);

  const [brokenImages, setBrokenImages] = useState(new Set());
  const handleImgError = useCallback((url) => {
    setBrokenImages(prev => new Set(prev).add(url));
  }, []);

  const visibleImages = useMemo(
    () => images.filter(url => !brokenImages.has(url)),
    [images, brokenImages]
  );

  const postedAtStr = formatPostedAt(listing.posted_at);
  const typeLabel = TYPE_LABELS[listing.property_type];

  return (
    <article className={`${styles.card} ${isNew ? styles.cardNew : ''}`}>
      <div className={styles.top}>
        <div className={styles.badges}>
          <span className={styles.badge} data-source={listing.source}>
            {source.short}
          </span>
          {typeLabel && (
            <span className={styles.typeBadge}>{typeLabel}</span>
          )}
        </div>
        <div className={styles.timeGroup}>
          <span className={styles.exactTime}>{formatExactTime(listing.created_at)}</span>
          <TimeOnList dateStr={listing.created_at} />
          {postedAtStr && (
            <span className={styles.postedAt}>PUBLICADO {postedAtStr}</span>
          )}
        </div>
      </div>

      <div className={styles.price}>
        {formatPrice(listing.price, listing.source)}
        <span className={styles.period}>/MES</span>
      </div>

      {listing.admin_fee > 0 && (
        <div className={styles.admin}>+ {formatPrice(listing.admin_fee, listing.source)} ADMIN</div>
      )}

      {listing.building_name && (
        <div className={styles.building}>{listing.building_name.toUpperCase()}</div>
      )}

      <div className={styles.address}>
        {listing.address || listing.neighborhood || ''}
        {listing.neighborhood && listing.address && listing.address !== listing.neighborhood
          ? `, ${listing.neighborhood}`
          : ''}
      </div>

      <div className={styles.city}>{(listing.city || '').toUpperCase()}</div>

      {visibleImages.length > 0 && (
        <div className={styles.thumbnails}>
          {visibleImages.slice(0, 2).map((url, i) => (
            <button
              key={i}
              className={styles.thumb}
              onClick={() => openGallery(i)}
              aria-label={`Ver foto ${i + 1}`}
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                onError={() => handleImgError(url)}
              />
            </button>
          ))}
          {visibleImages.length > 2 && (
            <button
              className={styles.thumbMore}
              onClick={() => openGallery(0)}
              aria-label={`Ver ${visibleImages.length - 2} fotos más`}
            >
              +{visibleImages.length - 2}
            </button>
          )}
        </div>
      )}

      <div className={styles.features}>
        {listing.rooms && <span>{listing.rooms} HAB</span>}
        {listing.bathrooms && <span>{listing.bathrooms} BANO</span>}
        {listing.area_m2 && <span>{listing.area_m2}M²</span>}
        {listing.stratum && <span>E{listing.stratum}</span>}
      </div>

      <div className={styles.actions}>
        {hasPhone && (
          <>
            <a href={`tel:${listing.contact_phone}`} className={styles.actionBtn}>
              LLAMAR
            </a>
            <a
              href={`https://wa.me/${waPrefix}${listing.contact_phone.replace(/\D/g, '')}`}
              className={styles.actionBtn}
              target="_blank"
              rel="noopener noreferrer"
            >
              WHATSAPP
            </a>
          </>
        )}
        <a
          href={listing.source_url}
          className={styles.actionBtn}
          target="_blank"
          rel="noopener noreferrer"
        >
          VER FUENTE →
        </a>
      </div>

      {galleryOpen && visibleImages.length > 0 && (
        <ImageGallery
          images={visibleImages}
          initialIndex={galleryIndex}
          onClose={closeGallery}
        />
      )}
    </article>
  );
});
