import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useStats } from '../../context/StatsContext';
import styles from './Header.module.css';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { connected, total } = useStats();
  const { pathname } = useLocation();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link to="/" className={styles.logo}>ARRIENDOSCOPE</Link>
      </div>
      <div className={styles.right}>
        <div className={styles.stats}>
          <span className={`${styles.dot} ${connected ? styles.dotLive : styles.dotOff}`} />
          <span className={styles.count}>{total.toLocaleString('es-CO')}</span>
        </div>
        <nav className={styles.nav}>
          <Link
            to="/quienes-somos"
            className={`${styles.navBtn} ${pathname === '/quienes-somos' ? styles.navActive : ''}`}
            aria-label="Quienes Somos"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="7" />
              <circle cx="8" cy="8" r="3" />
              <circle cx="8" cy="8" r="0.75" fill="currentColor" stroke="none" />
            </svg>
          </Link>
          <Link
            to="/contacto"
            className={`${styles.navBtn} ${pathname === '/contacto' ? styles.navActive : ''}`}
            aria-label="Contacto"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1.5" y="3" width="13" height="10" rx="0" />
              <path d="M1.5 3L8 9L14.5 3" />
            </svg>
          </Link>
          <Link
            to="/crear"
            className={`${styles.navBtn} ${pathname === '/crear' ? styles.navActive : ''}`}
            aria-label="Crear Propiedad"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="8" y1="2" x2="8" y2="14" />
              <line x1="2" y1="8" x2="14" y2="8" />
            </svg>
          </Link>
        </nav>
        <button className={styles.themeBtn} onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? '◐' : '◑'}
        </button>
      </div>
    </header>
  );
}
