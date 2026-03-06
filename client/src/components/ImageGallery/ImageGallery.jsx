import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './ImageGallery.module.css';

export function ImageGallery({ images, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const lastDistance = useRef(null);
  const lastCenter = useRef(null);
  const lastTap = useRef(0);
  const touchStartX = useRef(null);
  const stripRef = useRef(null);

  const prev = useCallback(() => {
    setIndex(i => (i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);

  const next = useCallback(() => {
    setIndex(i => (i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

  // Reset loading + zoom on image change
  useEffect(() => {
    setLoading(true);
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [index]);

  // Preload adjacent images
  useEffect(() => {
    const toPreload = [
      images[(index + 1) % images.length],
      images[(index - 1 + images.length) % images.length]
    ];
    toPreload.forEach(src => {
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [index, images]);

  // Auto-scroll thumb strip to show active thumb
  useEffect(() => {
    if (stripRef.current) {
      const activeThumb = stripRef.current.children[index];
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [index]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, prev, next]);

  // Lock body scroll
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  // Touch handlers — swipe when not zoomed, pinch-to-zoom, pan when zoomed
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      // Pinch start
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDistance.current = Math.sqrt(dx * dx + dy * dy);
      lastCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2
      };
    } else if (e.touches.length === 1) {
      if (scale > 1) {
        // Pan start when zoomed
        lastCenter.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      touchStartX.current = e.touches[0].clientX;

      // Double-tap detection
      const now = Date.now();
      if (now - lastTap.current < 300) {
        e.preventDefault();
        if (scale > 1) {
          setScale(1);
          setTranslate({ x: 0, y: 0 });
        } else {
          setScale(2);
        }
        touchStartX.current = null;
      }
      lastTap.current = now;
    }
  }, [scale]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && lastDistance.current) {
      // Pinch zoom
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.min(Math.max(scale * (distance / lastDistance.current), 1), 4);
      setScale(newScale);
      lastDistance.current = distance;
    } else if (e.touches.length === 1 && scale > 1 && lastCenter.current) {
      // Pan when zoomed
      e.preventDefault();
      const dx = e.touches[0].clientX - lastCenter.current.x;
      const dy = e.touches[0].clientY - lastCenter.current.y;
      setTranslate(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastCenter.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [scale]);

  const handleTouchEnd = useCallback((e) => {
    lastDistance.current = null;

    // Swipe to navigate (only when not zoomed)
    if (scale <= 1 && touchStartX.current !== null) {
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) next();
        else prev();
      }
    }
    touchStartX.current = null;
    lastCenter.current = null;
  }, [scale, next, prev]);

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.content}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button className={styles.close} onClick={onClose} aria-label="Cerrar">
          X
        </button>

        <div className={styles.imageWrap}>
          {images.length > 1 && (
            <button className={styles.navBtn} data-dir="prev" onClick={prev} aria-label="Anterior">
              ‹
            </button>
          )}

          {loading && <span className={styles.spinner}>LOADING</span>}

          <img
            src={images[index]}
            alt=""
            className={styles.image}
            draggable={false}
            style={{
              opacity: loading ? 0 : 1,
              transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
              transition: scale === 1 ? 'transform 0.2s ease, opacity 0.15s ease' : 'opacity 0.15s ease'
            }}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />

          {images.length > 1 && (
            <button className={styles.navBtn} data-dir="next" onClick={next} aria-label="Siguiente">
              ›
            </button>
          )}
        </div>

        <div className={styles.counter}>
          {index + 1} / {images.length}
        </div>

        {images.length > 1 && (
          <div className={styles.thumbStrip} ref={stripRef}>
            {images.map((url, i) => (
              <button
                key={i}
                className={`${styles.stripThumb} ${i === index ? styles.stripThumbActive : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Foto ${i + 1}`}
              >
                <img src={url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
