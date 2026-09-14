import type { Metadata } from 'next';
import { ImageStudio } from '@/components/images/ImageStudio';
import { WorkspacePageGate } from '@/components/auth/WorkspacePageGate';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My images | GALX', robots: { index: false, follow: false }, alternates: { canonical: '/images/library' } };

export default async function ImagesPage() {
  return <WorkspacePageGate pathname="/images/library"><div className="image-studio-page"><ImageStudio /></div></WorkspacePageGate>;
}
