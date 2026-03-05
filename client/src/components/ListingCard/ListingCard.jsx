import { memo } from 'react';
import { formatPrice } from '../../utils/formatPrice';
import { timeAgo } from '../../utils/timeAgo';
import { SOURCES } from '../../utils/constants';
import styles from './ListingCard.module.css';

export const ListingCard = memo(function ListingCard({ listing }) {
  const source = SOURCES[listing.source] || { label: listing.source?.toUpperCase(), short: '?' };
  const hasPhone = listing.contact_phone && listing.contact_phone.length > 5;

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <span className={styles.badge} data-source={listing.source}>
          {source.short}
        </span>
        <span className={styles.time}>{timeAgo(listing.created_at)}</span>
      </div>

      <div className={styles.price}>
        {formatPrice(listing.price)}
        <span className={styles.period}>/MES</span>
      </div>

      {listing.admin_fee > 0 && (
        <div className={styles.admin}>+ {formatPrice(listing.admin_fee)} ADMIN</div>
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
              href={`https://wa.me/57${listing.contact_phone.replace(/\D/g, '')}`}
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
    </article>
  );
});
