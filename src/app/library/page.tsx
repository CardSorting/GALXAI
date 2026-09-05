import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Navigation } from '@/components/dashboard/Navigation';
import { VisualLibraryDashboard } from '@/components/library/VisualLibraryDashboard';
import { getGalxSession } from '@/lib/auth/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Image Library | GALXAI',
  description:
    'Search, inspect, download, favorite, and organize images generated through your GALXAI account.',
  keywords: [
    'AI image library',
    'visual synthesis',
    'DALL-E 3',
    'FLUX',
    'Cloudflare R2',
    'BroccoliDB',
    'GALXAI'
  ],
  openGraph: {
    title: 'Image Library | GALXAI',
    description:
      'A private, searchable library for images generated through GALXAI.',
    type: 'website'
  },
  robots: { index: false, follow: false }
};

async function hasVerifiedLibrarySession(): Promise<boolean> {
  const cookieStore = await cookies();
  const hasSupabaseSession = cookieStore
    .getAll()
    .some(({ name, value }) => name.startsWith('sb-') && name.includes('-auth-token') && Boolean(value));

  if (hasSupabaseSession) {
    try {
      const supabase = createClient(cookieStore);
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) return true;
    } catch {
      // A valid GALX session may still authorize the route when Supabase is unavailable.
    }
  }

  const galxSession = await getGalxSession();
  return Boolean(galxSession.authenticated && galxSession.userId);
}

export default async function VisualLibraryPage() {
  if (!(await hasVerifiedLibrarySession())) {
    redirect('/auth/signin?next=%2Flibrary');
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col selection:bg-indigo-500/40 selection:text-white">
      <Navigation />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <VisualLibraryDashboard />
      </main>
    </div>
  );
}
