import { permanentRedirect } from 'next/navigation';
import { legacyAuthPath } from '@/lib/auth/redirects';

export default async function LegacyAuthPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) search.append(key, item);
  }
  permanentRedirect(legacyAuthPath('/auth/signin', search)!);
}
