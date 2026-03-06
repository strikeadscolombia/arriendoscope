import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './ImageGallery.module.css';

export function ImageGallery({ images, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);

  const prev = useCallback(() => {
    setIndex(i => (i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);

  const next = useCallback(() => {
    setIndex(i => (i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

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
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Swipe support for mobile
  const [touchStart, setTouchStart] = useState(null);

  const handleTouchStart = useCallback((e) => {
    setTouchStart(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
    setTouchStart(null);
  }, [touchStart, next, prev]);

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.content}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
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
          <img
            src={images[index]}
            alt=""
            className={styles.image}
            draggable={false}
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
      </div>
    </div>,
    document.body
  );
}
