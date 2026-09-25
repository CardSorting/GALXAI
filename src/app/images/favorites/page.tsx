import type { Metadata } from 'next';
import { WorkspacePageGate } from '@/components/auth/WorkspacePageGate';
import { ImageStudio } from '@/components/images/ImageStudio';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Private image favorites — GALX',
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return <WorkspacePageGate pathname="/images/favorites"><ImageStudio /></WorkspacePageGate>;
}
