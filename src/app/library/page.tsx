import { Metadata } from 'next';
import { Navigation } from '@/components/dashboard/Navigation';
import { VisualLibraryDashboard } from '@/components/library/VisualLibraryDashboard';
import { requireWorkspaceSession } from '@/lib/auth/require-workspace-session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Image Library | GALXAI',
  description:
    'Search, inspect, download, favorite, and organize images generated through your GALXAI account.',
  openGraph: {
    title: 'Image Library | GALXAI',
    description:
      'A private, searchable library for images generated through GALXAI.',
    type: 'website'
  },
  robots: { index: false, follow: false }
};

export default async function VisualLibraryPage() {
  await requireWorkspaceSession('/library');

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col selection:bg-indigo-500/40 selection:text-white">
      <Navigation />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VisualLibraryDashboard />
      </main>
    </div>
  );
}
