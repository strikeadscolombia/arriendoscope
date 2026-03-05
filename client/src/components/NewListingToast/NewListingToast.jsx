import styles from './NewListingToast.module.css';

export function NewListingToast({ count, onClick }) {
  if (count <= 0) return null;

  return (
    <button className={styles.toast} onClick={onClick}>
      ↑ {count} NUEVO{count > 1 ? 'S' : ''} ARRIENDO{count > 1 ? 'S' : ''}
    </button>
  );
}
