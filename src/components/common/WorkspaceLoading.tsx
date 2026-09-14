'use client';

import { useEffect, useState } from 'react';
import { IntentLink } from './IntentLink';
import styles from './workspace-route.module.css';

/** Structural placeholders with one live announcement outside the busy content. */
export function WorkspaceLoading({ product }: { product: 'Images' | 'Sites' }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    const timer = window.setTimeout(() => setSlow(true), 6_000);
    return () => window.clearTimeout(timer);
  }, [product]);
  return <main className={styles.loading} data-workspace-loading={product} aria-label={`${product} workspace loading`}>
    <div className={styles.loadingHeading}>
      <p className={styles.loadingLabel} role="status" aria-atomic="true">{slow ? `Opening ${product} is taking longer than usual.` : `Opening ${product}…`}</p>
      {slow && <IntentLink href="/">Return home</IntentLink>}
    </div>
    <div className={styles.skeleton} data-product={product} aria-hidden="true" aria-busy="true">
      <div className={styles.sidebar}><span /><span /><span /><div /></div>
      <div className={styles.canvas}><span /><div /></div>
    </div>
  </main>;
}
