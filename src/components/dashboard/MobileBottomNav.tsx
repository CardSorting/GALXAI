'use client';
import { IntentLink as Link } from '@/components/common/IntentLink';
import { usePathname } from 'next/navigation';
import { isPublicReadingPath } from '@/lib/public-content/routes';
export function MobileBottomNav() {
  const pathname = usePathname();
  if (pathname === '/' || isPublicReadingPath(pathname) || pathname.startsWith('/auth/') || pathname === '/login' || pathname === '/signup' || /^\/admin(?:\/|$)/.test(pathname)) return null;
  return <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 flex border-t border-white/15 bg-[#07090e] pb-[env(safe-area-inset-bottom)] lg:hidden">{[['Images','/images'],['Sites','/sites'],['Developer preview','/developers']].map(([label, href]) => <Link key={href} href={href} aria-current={(pathname === href || pathname.startsWith(`${href}/`)) ? 'page' : undefined} className={`flex min-h-14 flex-1 items-center justify-center px-2 text-center text-xs font-medium ${(pathname === href || pathname.startsWith(`${href}/`)) ? 'text-white underline underline-offset-4' : 'text-zinc-300'}`}>{label}</Link>)}</nav>;
}
