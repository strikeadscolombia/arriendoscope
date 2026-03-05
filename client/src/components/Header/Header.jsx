import { useTheme } from '../../context/ThemeContext';
import styles from './Header.module.css';

export function Header({ connected, total }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.logo}>MEMESCOPE</h1>
        <span className={styles.subtitle}>ARRIENDOS</span>
      </div>
      <div className={styles.right}>
        <div className={styles.stats}>
          <span className={`${styles.dot} ${connected ? styles.dotLive : styles.dotOff}`} />
          <span className={styles.count}>{total.toLocaleString('es-CO')}</span>
        </div>
        <button className={styles.themeBtn} onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? '◐' : '◑'}
        </button>
      </div>
    </header>
  );
}
