import type { Metadata } from 'next';
import { WorkspacePageGate } from '@/components/auth/WorkspacePageGate';
import { ImageStudio } from '@/components/images/ImageStudio';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Private creation — GALX',
  description: 'Create privately in your GALX workspace.',
  robots: { index: false, follow: false },
};

export default function PrivateCreationPage() {
  return <WorkspacePageGate pathname="/images/create"><ImageStudio /></WorkspacePageGate>;
}
