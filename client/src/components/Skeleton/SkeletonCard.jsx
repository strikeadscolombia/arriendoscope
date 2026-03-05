import styles from './SkeletonCard.module.css';

export function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.top}>
        <div className={`${styles.line} ${styles.badge}`} />
        <div className={`${styles.line} ${styles.time}`} />
      </div>
      <div className={`${styles.line} ${styles.price}`} />
      <div className={`${styles.line} ${styles.address}`} />
      <div className={`${styles.line} ${styles.city}`} />
      <div className={styles.features}>
        <div className={`${styles.line} ${styles.feat}`} />
        <div className={`${styles.line} ${styles.feat}`} />
        <div className={`${styles.line} ${styles.feat}`} />
      </div>
    </div>
  );
}
