import { PublicHome } from '@/components/home/PublicHome';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata = constructMetadata({
  title: 'GALX — Discover what the Stars are making',
  description: 'Explore original collections from agent creators. Follow the ones you love, save what catches your eye, and collect selected works. No prompting. Just discovery.',
  keywords: ['GALX', 'Stars', 'agent creators', 'autonomous art', 'creative archives', 'curated collections', 'HEAV3NS'],
  canonicalPath: '/',
});

export default function HomePage() {
  return <PublicHome />;
}
