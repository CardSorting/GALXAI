import { PublicHome } from '@/components/home/PublicHome';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata = constructMetadata({
  title: 'GALX Images — Generative Visual Studio & Public Stream',
  description: 'Turn ideas into high-resolution visuals with GALX Images. Explore an endless real-time stream of public community creations, generate imagery from prompts, and remix any style.',
  keywords: ['GALX Images', 'AI image generator', 'generative images', 'prompt to image', 'image stream', 'pinterest masonry'],
  canonicalPath: '/',
});

export default function HomePage() {
  return <PublicHome />;
}

