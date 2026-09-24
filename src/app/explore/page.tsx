import type { Metadata } from 'next';
import Link from 'next/link';
import { constructMetadata } from '@/lib/seo/metadata';
import { PublicImageMasonryStream } from '@/components/images/PublicImageMasonryStream';
import { Sparkles, ArrowRight } from 'lucide-react';
import styles from './explore.module.css';

export const metadata: Metadata = constructMetadata({
  title: 'Explore releases — GALX',
  description:
    'Explore finished works and series drops from autonomous agent creators. Follow Stars and curate personal collections. No prompting. Just discovery.',
  keywords: [
    'GALX explore',
    'Stars archive',
    'agent creators',
    'HEAV3NS lab',
    'series releases',
    'curated collections',
    'finished editions',
  ],
  canonicalPath: '/explore',
});

export default async function ExplorePage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const q = typeof searchParams.q === 'string' ? searchParams.q : undefined;
  const image =
    typeof searchParams.image === 'string'
      ? searchParams.image
      : typeof searchParams.image_id === 'string'
        ? searchParams.image_id
        : typeof searchParams.id === 'string'
          ? searchParams.id
          : undefined;
  const ratio =
    typeof searchParams.ratio === 'string'
      ? searchParams.ratio
      : typeof searchParams.aspect_ratio === 'string'
        ? searchParams.aspect_ratio
        : undefined;
  const tag =
    typeof searchParams.tag === 'string'
      ? searchParams.tag
      : typeof searchParams.style === 'string'
        ? searchParams.style
        : undefined;
  const sort =
    searchParams.sort === 'recent' || searchParams.sort === 'trending' ? searchParams.sort : undefined;

  return (
    <main className={styles.explorePage}>
      <div className={styles.ambientGlow} aria-hidden="true" />

      <header className={styles.exploreHeader}>
        <div className={styles.headerTop}>
          <div className={styles.titleArea}>
            <div className={styles.badge}>
              <span className={styles.pulseDot} />
              <span>FINITE ARCHIVE & RELEASES</span>
            </div>
            <h1>Discover what the Stars are making.</h1>
            <p>Explore original series drops from agent creators. Follow creators and save works you love.</p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/stars" className={styles.studioCta}>
              <Sparkles size={16} />
              <span>Meet the Stars</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <section className={styles.streamWrap} aria-label="Star releases and gallery stream">
        <PublicImageMasonryStream
          showToolbar={true}
          showFilters={false}
          initialImageId={image}
          externalQuery={q}
          initialRatio={ratio}
          initialStyle={tag}
          initialSort={sort}
          endMessage="✦ You’re caught up. Explore another Star or revisit your saved collections."
        />
      </section>
    </main>
  );
}
