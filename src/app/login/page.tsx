import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyWorkspaceSession } from '@/lib/auth/workspace-session';
import { safeAuthRedirect } from '@/lib/auth/redirects';
import { authNotice } from '@/lib/auth/signin';
import { SignInForm } from '@/components/auth/SignInForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign in | GALX', description: 'Sign in to continue to your GALX workspace.', robots: { index: false, follow: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const single = (key: string) => typeof params[key] === 'string' ? params[key] as string : undefined;
  const destination = safeAuthRedirect(single('next') || single('returnUrl') || single('redirect'));
  const cookieStore = await cookies();
  const reauthenticate = single('reauth') === '1';
  if (!reauthenticate && await verifyWorkspaceSession(cookieStore) === 'authenticated') redirect(destination);
  // Existing-session recovery must never remove the ordinary sign-in methods.
  return <SignInForm destination={destination} reauthenticate={reauthenticate} notice={authNotice(single('error') || (cookieStore.get('galx_session')?.value.startsWith('galx_sess_') ? 'session_replaced' : undefined))} />;
}
