import type { Metadata } from 'next';
import Link from 'next/link';
import { constructMetadata } from '@/lib/seo/metadata';
import { PublicImageMasonryStream } from '@/components/images/PublicImageMasonryStream';
import { Sparkles, Compass, ArrowRight } from 'lucide-react';
import styles from './explore.module.css';

export const metadata: Metadata = constructMetadata({
  title: 'Explore AI Images & Prompts — GALX Community Stream',
  description:
    'Discover thousands of AI-generated images created with GALX. Search prompts, filter by aspect ratio and visual style, copy generation recipes, and remix directly in the studio.',
  keywords: [
    'AI explore',
    'image prompts',
    'generative images',
    'community feed',
    'diffusion showcase',
    'GALX explore',
    'pinterest ai stream',
  ],
  canonicalPath: '/explore',
});

export default function ExplorePage() {
  return (
    <main className={styles.explorePage}>
      <div className={styles.ambientGlow} aria-hidden="true" />

      <header className={styles.exploreHeader}>
        <div className={styles.headerTop}>
          <div className={styles.titleArea}>
            <div className={styles.badge}>
              <span className={styles.pulseDot} />
              <span>LIVE COMMUNITY STREAM</span>
            </div>
            <h1>Explore Visual Creations</h1>
            <p>
              Every artwork generated on GALX is streamed into this collective gallery.
              Search prompts, filter by aspect ratio and artistic style, and remix anything in the Studio.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/images" className={styles.studioCta}>
              <Sparkles size={16} />
              <span>Create in Studio</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <section className={styles.streamWrap} aria-label="Community image gallery stream">
        <PublicImageMasonryStream showToolbar={true} />
      </section>
    </main>
  );
}
