import type { Metadata } from 'next';
import { ImageStudio } from '@/components/images/ImageStudio';
import { requireWorkspaceSession } from '@/lib/auth/require-workspace-session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Image Studio | GALXAI',
  robots: { index: false, follow: false },
  description: 'Turn your ideas into images. Create, explore, and revisit your work in the GALXAI image studio.',
  alternates: { canonical: '/images' },
  openGraph: { title: 'Image Studio | GALXAI', description: 'Create images from a prompt and make them your own.' },
};

export default async function ImagesPage() {
  await requireWorkspaceSession('/images');
  return <div className="image-studio-page"><ImageStudio /></div>;
}
