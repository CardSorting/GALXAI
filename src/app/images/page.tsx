import type { Metadata } from 'next';
import { ImageStudio } from '@/components/images/ImageStudio';

export const metadata: Metadata = {
  title: 'Image Studio | GALXAI',
  description: 'Turn your ideas into images. Create, explore, and revisit your work in the GALXAI image studio.',
  alternates: { canonical: '/images' },
  openGraph: { title: 'Image Studio | GALXAI', description: 'Create images from a prompt and make them your own.' },
};

export default function ImagesPage() {
  return <div className="image-studio-page"><ImageStudio /></div>;
}
