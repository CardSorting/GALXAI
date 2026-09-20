'use client';

import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';
import styles from './profile.module.css';

export default function ProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.shell}>
        <section className={styles.errorState} role="alert" aria-labelledby="profile-error-title">
          <span className={styles.errorIcon} aria-hidden="true">
            <AlertCircle size={23} />
          </span>
          <h1 id="profile-error-title">This profile is unavailable right now</h1>
          <p>We couldn’t load the public gallery. Try again, or keep exploring the community.</p>
          <div className={styles.errorActions}>
            <button type="button" className={styles.primaryAction} onClick={reset}>
              <RefreshCw size={15} aria-hidden="true" />
              <span>Try again</span>
            </button>
            <Link href="/explore" className={styles.secondaryAction}>
              Explore creations
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
