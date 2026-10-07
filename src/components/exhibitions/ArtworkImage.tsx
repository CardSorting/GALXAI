'use client';

import { useState } from 'react';
import styles from './programme.module.css';

export function ArtworkImage({ src, alt, width, height, priority = false }: {
  src: string | null; alt: string; width: number; height: number; priority?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const unavailable = !src || failedSource === src;
  return (
    <div className={styles.imageFrame} style={{ aspectRatio: `${width} / ${height}` }}>
      {unavailable ? (
        <div className={styles.unavailable} role="status">
          <span>Artwork temporarily unavailable</span>
          <span>The caption and artist’s practice remain available below.</span>
        </div>
      ) : (
        // The artifact endpoint re-encodes images; preserve its direct binary contract.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} width={width} height={height} loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'} decoding="async" onError={() => setFailedSource(src)} />
      )}
    </div>
  );
}
