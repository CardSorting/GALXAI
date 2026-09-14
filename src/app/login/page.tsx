import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyWorkspaceSession } from '@/lib/auth/workspace-session';
import { safeAuthRedirect, authEntryPath } from '@/lib/auth/redirects';
import { authNotice } from '@/lib/auth/signin';
import { SignInForm } from '@/components/auth/SignInForm';
import { AuthEntryShell } from '@/components/auth/AuthEntryShell';
import styles from '@/components/auth/auth-entry.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sign in | GALX', description: 'Sign in to continue to your GALX workspace.', robots: { index: false, follow: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const single = (key: string) => typeof params[key] === 'string' ? params[key] as string : undefined;
  const destination = safeAuthRedirect(single('next') || single('returnUrl') || single('redirect'));
  const cookieStore = await cookies();
  const state = await verifyWorkspaceSession(cookieStore);
  if (state === 'authenticated') redirect(destination);
  if (state === 'unavailable') return <AuthEntryShell>
    <div className={styles.intro}><h1>We couldn’t check your session</h1><p>This may be temporary. Try again to continue to your workspace.</p></div>
    <a className={`${styles.button} ${styles.primary}`} href={authEntryPath(destination)}>Try again</a>
  </AuthEntryShell>;
  return <SignInForm destination={destination} notice={authNotice(single('error') || (cookieStore.get('galx_session')?.value.startsWith('galx_sess_') ? 'session_replaced' : undefined))} />;
}
