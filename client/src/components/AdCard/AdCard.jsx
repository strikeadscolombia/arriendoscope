import { useEffect, useRef } from 'react';
import styles from './AdCard.module.css';

export function AdCard() {
  const adRef = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      if (window.adsbygoogle && adRef.current) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      }
    } catch (e) {
      // AdSense not loaded yet or ad blocked
    }
  }, []);

  return (
    <article className={styles.card}>
      <div className={styles.label}>AD</div>
      <ins
        className="adsbygoogle"
        ref={adRef}
        style={{ display: 'block' }}
        data-ad-format="fluid"
        data-ad-layout-key="-fb+5w+4e-db+86"
        data-ad-client="ca-pub-8427843339012349"
        data-ad-slot="3597260653"
      />
    </article>
  );
}
