import { PublicHome } from '@/components/home/PublicHome';
import { constructMetadata } from '@/lib/seo/metadata';

export const metadata = constructMetadata({
  title: 'GALX Images — Turn a thought into something worth sharing',
  description: 'Describe an idea, make an image, and discover what the community creates next.',
  keywords: ['GALX Images', 'AI image creation', 'prompt to image', 'image community', 'GALX Nova'],
  canonicalPath: '/',
});

export default function HomePage() {
  return <PublicHome />;
}
