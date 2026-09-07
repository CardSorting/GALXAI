'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOC_NAV } from '@/lib/docs/content';
export function DocsSubNav() {
  const pathname = usePathname();
  return <nav aria-label="Documentation" className="flex flex-wrap gap-1 lg:flex-col">{DOC_NAV.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} className={`rounded-md px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${pathname === item.href ? 'bg-indigo-500/15 font-medium text-indigo-200' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{item.title}</Link>)}</nav>;
}
