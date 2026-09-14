'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function AuthConnectRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const mode = searchParams.get('mode') || searchParams.get('tab') || searchParams.get('action');
    const queryString = searchParams.toString();
    const query = queryString ? `?${queryString}` : '';

    if (mode === 'signup' || mode === 'register' || mode === 'create') {
      router.replace(`/signup${query}`);
    } else {
      router.replace(`/login${query}`);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07090e] text-zinc-400 text-xs font-mono">
      Redirecting to authentication...
    </div>
  );
}

export default function AuthConnectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090e]" />}>
      <AuthConnectRedirect />
    </Suspense>
  );
}
