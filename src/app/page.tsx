import { PublicHome } from '@/components/home/PublicHome';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata = constructMetadata({
  title: 'GALX Images — Make something worth sharing',
  description: 'Turn a prompt into an image. Explore what others create. Powered by GALX Nova.',
  keywords: ['GALX Images', 'AI image creation', 'prompt to image', 'image community', 'GALX Nova'],
  canonicalPath: '/',
});

export default function HomePage() {
  return <PublicHome />;
}
