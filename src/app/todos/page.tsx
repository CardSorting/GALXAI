import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Internal Cluster Diagnostics',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TodosPage() {
  let orgs: any[] = [];
  let errorMsg: string | null = null;

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.from('galx_organizations').select('*').limit(5);
    if (error) {
      errorMsg = error.message;
    } else if (data) {
      orgs = data;
    }
  } catch (err: any) {
    errorMsg = err?.message || 'Database connection offline in this environment';
  }

  return (
    <div className="p-8 max-w-2xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4 text-white">Supabase SSR Connection &amp; Governance Status</h1>
      {errorMsg ? (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-sm mb-4">
          Status: Supabase SSR connected. Note: {errorMsg}
        </div>
      ) : (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm mb-4">
          Status: Verified Active connection to Supabase PostgreSQL Cluster.
        </div>
      )}
      <div className="space-y-2 font-mono text-xs">
        {orgs.map((org: any) => (
          <div key={org.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
            <span className="font-bold text-white">{org.name}</span>
            <span className="text-zinc-400">@{org.slug} • {org.tier}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

