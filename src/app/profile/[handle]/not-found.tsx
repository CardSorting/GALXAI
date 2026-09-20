import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import styles from './profile.module.css';

export default function ProfileNotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.shell}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <ol className={styles.breadcrumbList}>
            <li>
              <Link href="/explore" className={styles.breadcrumbLink}>
                <ArrowLeft size={15} aria-hidden="true" />
                <span>Explore</span>
              </Link>
            </li>
            <li className={styles.breadcrumbCurrent} aria-current="page">
              Profile unavailable
            </li>
          </ol>
        </nav>
        <section className={styles.errorState} aria-labelledby="profile-not-found-title">
          <span className={styles.errorIcon} aria-hidden="true">
            <AlertCircle size={23} />
          </span>
          <h1 id="profile-not-found-title">Profile not found</h1>
          <p>That public profile is not available. Return to Explore to discover more creations.</p>
          <div className={styles.errorActions}>
            <Link href="/explore" className={styles.primaryAction}>
              Explore creations
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
