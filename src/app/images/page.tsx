import type { Metadata } from 'next';
import { ImageStudio } from '@/components/images/ImageStudio';
import { WorkspacePageGate } from '@/components/auth/WorkspacePageGate';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'GALX Images — Image Studio',
  robots: { index: false, follow: false },
  description: 'Describe an image, create it, and explore what others are making. Powered by GALX Nova.',
  alternates: { canonical: '/images' },
  openGraph: { title: 'GALX Images — Image Studio', description: 'Describe an image, create it, and explore what others are making. Powered by GALX Nova.' },
};

export default async function ImagesPage() {
  return <WorkspacePageGate pathname="/images"><div className="image-studio-page"><ImageStudio /></div></WorkspacePageGate>;
}
