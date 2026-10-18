import { IntentLink as Link } from '@/components/common/IntentLink';
import localFont from 'next/font/local';
import { ArrowUpRight, ArrowLeft } from 'lucide-react';
import type { CuratedArtwork } from '@/lib/exhibitions/catalog';
import { ArtworkImage } from './ArtworkImage';
import styles from './programme.module.css';

const display = localFont({ src: './fonts/BodoniModa.ttf', weight: '400 500', display: 'swap', variable: '--font-programme-display' });

export function ProgrammeShell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <main className={`${styles.programme} ${display.variable} ${className}`}><div className={styles.container}>{children}</div></main>;
}

export function ProgrammeLink({ href, children, ariaLabel }: { href: string; children: React.ReactNode; ariaLabel?: string }) {
  return <Link href={href} className={styles.action} aria-label={ariaLabel}>{children}<ArrowUpRight size={17} aria-hidden="true" /></Link>;
}

export function ProgrammeBackLink() {
  return <Link href="/exhibitions" className={styles.back}><ArrowLeft size={16} aria-hidden="true" />Exhibitions & editorials</Link>;
}

export function Artwork({ work, src, priority = false, essay = false, className = '', imageClassName = '', loading }: {
  work: CuratedArtwork; src: string | null; priority?: boolean; essay?: boolean; className?: string; imageClassName?: string; loading?: 'eager' | 'lazy';
}) {
  return (
    <figure className={`${styles.artwork} ${essay ? styles.essayArtwork : ''} ${className}`} id={`work-${work.id}`}>
      <ArtworkImage src={src} alt={work.alt} width={work.width} height={work.height} priority={priority} loading={loading} className={imageClassName} />
      <figcaption>
        <div className={styles.captionIdentity}>
          <Link href={`/profile/${work.handle}`} className={styles.artist}>{work.artist}</Link>
          <span className={styles.workTitle}>{work.title}, <span>2026</span></span>
          <span className={styles.medium}>Digital work</span>
        </div>
        {src && <Link href={`/explore?sort=recent&image=${work.id}`} className={styles.viewWork}>View work<ArrowUpRight size={14} aria-hidden="true" /></Link>}
        {essay && <p className={styles.workCaption}>{work.caption}</p>}
      </figcaption>
    </figure>
  );
}
