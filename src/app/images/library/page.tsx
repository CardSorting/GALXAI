import type { Metadata } from 'next';
import { WorkspacePageGate } from '@/components/auth/WorkspacePageGate';
import { ImageStudio } from '@/components/images/ImageStudio';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Private image library — GALX',
  robots: { index: false, follow: false },
};

export default function LibraryPage() {
  return <WorkspacePageGate pathname="/images/library"><ImageStudio /></WorkspacePageGate>;
}
