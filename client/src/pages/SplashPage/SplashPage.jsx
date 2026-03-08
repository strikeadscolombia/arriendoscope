import { useState, useEffect, useRef, useCallback } from 'react';
import { startSplashAudio, stopSplashAudio, cleanupSplashAudio, resumeAudio } from '../../utils/splashSound';
import styles from './SplashPage.module.css';

const TITLE_TEXT = 'ARRIENDOSCOPE';
const SUBTITLE_TEXT = 'RADAR DE ARRIENDOS EN TIEMPO REAL';

/**
 * Immersive splash/landing page.
 *
 * Phases:
 *   waiting → Radar animates, "TOCA PARA INICIAR" visible (waits for gesture)
 *   title   → Audio starts, title letters stagger in
 *   ready   → Subtitle + CTA visible
 *   exit    → Fade out + zoom radar (on CTA click)
 */
export function SplashPage({ onEnter }) {
  const [phase, setPhase] = useState('waiting');
  const audioStarted = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSplashAudio();
    };
  }, []);

  // Phase progression: once user taps and we move to 'title', auto-advance to 'ready'
  useEffect(() => {
    if (phase === 'title') {
      const t = setTimeout(() => setPhase('ready'), 1800);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Handle first tap — start audio + begin title animation
  const handleTap = useCallback(() => {
    if (phase !== 'waiting') {
      // If already past waiting, just ensure audio is resumed
      resumeAudio();
      return;
    }

    // Start audio on user gesture — this satisfies autoplay policy
    if (!audioStarted.current) {
      audioStarted.current = true;
      startSplashAudio();
    }

    setPhase('title');
  }, [phase]);

  const handleEnter = useCallback(() => {
    setPhase('exit');
    stopSplashAudio();
    // Wait for exit animation to complete
    setTimeout(() => {
      onEnter();
    }, 800);
  }, [onEnter]);

  const showTapPrompt = phase === 'waiting';
  const showTitle = phase === 'title' || phase === 'ready' || phase === 'exit';
  const showSubtitle = phase === 'ready' || phase === 'exit';
  const showCta = phase === 'ready' || phase === 'exit';
  const isExiting = phase === 'exit';

  return (
    <div
      className={`${styles.splash} ${isExiting ? styles.splashExit : ''}`}
      onClick={handleTap}
      onTouchStart={handleTap}
    >
      {/* Radar animation — 5 rings (always visible) */}
      <div className={`${styles.radar} ${isExiting ? styles.radarExit : ''}`}>
        <div className={styles.radarDot} />
        <div className={`${styles.ring} ${styles.ring1}`} />
        <div className={`${styles.ring} ${styles.ring2}`} />
        <div className={`${styles.ring} ${styles.ring3}`} />
        <div className={`${styles.ring} ${styles.ring4}`} />
        <div className={`${styles.ring} ${styles.ring5}`} />
      </div>

      {/* Tap prompt — visible only in waiting phase */}
      {showTapPrompt && (
        <p className={styles.tapPrompt}>TOCA PARA INICIAR</p>
      )}

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
