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
          >?</Link>
          <Link
            to="/contacto"
            className={`${styles.navBtn} ${pathname === '/contacto' ? styles.navActive : ''}`}
            aria-label="Contacto"
          >&#9993;</Link>
          <Link
            to="/crear"
            className={`${styles.navBtn} ${pathname === '/crear' ? styles.navActive : ''}`}
            aria-label="Crear Propiedad"
          >+</Link>
        </nav>
        <button className={styles.themeBtn} onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? '◐' : '◑'}
        </button>
      </div>
    </header>
  );
}
