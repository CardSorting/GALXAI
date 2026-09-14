import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { requireAccountIdentity, AccountIdentityError } from '@/lib/auth/accountIdentity';
import { PreviewAdminRepository } from '@/lib/supabase/repositories/PreviewAdminRepository';
import { AdminError } from '@/lib/admin/errors';
import { PreviewAdminWorkspace } from '@/components/admin/PreviewAdminWorkspace';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Preview administration | GALX', robots: { index: false, follow: false } };
export default async function AdminPage() {
  let actor;
  try {
    const req = new NextRequest('https://galx.ai/admin', { headers: await headers() });
    actor = await new PreviewAdminRepository().session(await requireAccountIdentity(req));
  } catch (error) {
    if (error instanceof AccountIdentityError) redirect('/login?next=/admin');
    if (error instanceof AdminError && error.status === 403) notFound();
    return <main className="mx-auto max-w-xl px-6 py-24 text-white"><h1 className="text-2xl font-semibold">Admin workspace unavailable</h1><p className="mt-4 text-zinc-300">We couldn’t load your workspace. Try reloading this page shortly.</p><a href="/admin" className="mt-6 inline-block underline underline-offset-4">Reload workspace</a></main>;
  }
  return <PreviewAdminWorkspace initialActor={actor} />;
}
