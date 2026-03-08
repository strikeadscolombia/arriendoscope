import { useState, useEffect, useRef, useCallback } from 'react';
import { startSplashAudio, stopSplashAudio, cleanupSplashAudio, resumeAudio } from '../../utils/splashSound';
import styles from './SplashPage.module.css';

const TITLE_TEXT = 'ARRIENDOSCOPE';
const SUBTITLE_TEXT = 'RADAR DE ARRIENDOS EN TIEMPO REAL';

/**
 * Immersive splash/landing page.
 *
 * Phases:
 *   radar  → Only radar animation visible (0–1.5s)
 *   title  → Title letters stagger in (1.5s)
 *   ready  → Subtitle + CTA visible (3s)
 *   exit   → Fade out + zoom radar (on click)
 */
export function SplashPage({ onEnter }) {
  const [phase, setPhase] = useState('radar');
  const audioStarted = useRef(false);

  useEffect(() => {
    // Attempt to start audio (may be blocked by autoplay policy until gesture)
    if (!audioStarted.current) {
      audioStarted.current = true;
      startSplashAudio();
    }

    // Phase progression timers
    const t1 = setTimeout(() => setPhase('title'), 1500);
    const t2 = setTimeout(() => setPhase('ready'), 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      cleanupSplashAudio();
    };
  }, []);

  // Resume audio on any user interaction (autoplay policy workaround)
  const handleInteraction = useCallback(() => {
    resumeAudio();
  }, []);

  const handleEnter = useCallback(() => {
    setPhase('exit');
    stopSplashAudio();
    // Wait for exit animation to complete
    setTimeout(() => {
      onEnter();
    }, 800);
  }, [onEnter]);

  const showTitle = phase !== 'radar';
  const showSubtitle = phase === 'ready' || phase === 'exit';
  const showCta = phase === 'ready' || phase === 'exit';
  const isExiting = phase === 'exit';

  return (
    <div
      className={`${styles.splash} ${isExiting ? styles.splashExit : ''}`}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Radar animation — 5 rings */}
      <div className={`${styles.radar} ${isExiting ? styles.radarExit : ''}`}>
        <div className={styles.radarDot} />
        <div className={`${styles.ring} ${styles.ring1}`} />
        <div className={`${styles.ring} ${styles.ring2}`} />
        <div className={`${styles.ring} ${styles.ring3}`} />
        <div className={`${styles.ring} ${styles.ring4}`} />
        <div className={`${styles.ring} ${styles.ring5}`} />
      </div>

      {/* Title with letter-by-letter stagger */}
      <h1 className={`${styles.title} ${!showTitle ? styles.titleHidden : ''}`}>
        {showTitle && TITLE_TEXT.split('').map((char, i) => (
          <span
            key={i}
            className={styles.letter}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            {char}
          </span>
        ))}
      </h1>

      {/* Subtitle */}
      <p className={`${styles.subtitle} ${showSubtitle ? styles.subtitleVisible : ''}`}>
        {SUBTITLE_TEXT}
      </p>

      {/* CTA */}
      {showCta && (
        <button
          className={`${styles.cta} ${styles.ctaVisible}`}
          onClick={(e) => {
            e.stopPropagation();
            handleEnter();
          }}
        >
          COMENZAR
        </button>
      )}
    </div>
  );
}
