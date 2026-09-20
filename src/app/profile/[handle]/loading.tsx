import styles from './profile.module.css';

export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true" aria-label="Loading profile">
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.shell}>
        <nav className={styles.loadingBreadcrumbs} aria-hidden="true">
          <div className={`${styles.skeleton} ${styles.loadingBreadcrumbLink}`} />
          <div className={`${styles.skeleton} ${styles.loadingBreadcrumbCurrent}`} />
        </nav>
        <section className={styles.loadingHero} aria-hidden="true">
          <div className={styles.loadingIdentity}>
            <div className={`${styles.skeleton} ${styles.loadingAvatar}`} />
            <div className={styles.loadingCopy}>
              <div className={`${styles.skeleton} ${styles.loadingTitle}`} />
              <div className={`${styles.skeleton} ${styles.loadingHandle}`} />
            </div>
          </div>
          <div className={`${styles.skeleton} ${styles.loadingBio}`} />
        </section>
        <section className={styles.loadingGallery} aria-hidden="true">
          <div className={styles.loadingSectionHeader}>
            <div className={`${styles.skeleton} ${styles.loadingSectionTitle}`} />
            <div className={`${styles.skeleton} ${styles.loadingSectionLink}`} />
          </div>
          <div className={styles.loadingGrid}>
            {['one', 'two', 'three', 'four', 'five', 'six'].map((id) => (
              <div key={id} className={`${styles.skeleton} ${styles.loadingCard}`} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
