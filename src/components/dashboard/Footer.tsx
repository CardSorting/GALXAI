'use client';
import { IntentLink as Link } from '@/components/common/IntentLink';
import { usePathname } from 'next/navigation';
export function Footer() {
  const pathname = usePathname();
  if (/^\/admin(?:\/|$)/.test(pathname) || pathname === '/auth/signin') return null;
  const productLinks = pathname === '/' ? [['Sites','/sites'],['Images','/images']] : [['Images','/images'],['Sites','/sites']];
  return <footer className="mt-auto border-t border-white/10 px-5 py-8 text-sm text-zinc-400"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-6"><div><p className="font-semibold text-white">GALX</p><p className="mt-2">{pathname === '/' ? 'A place for your next idea. Sites is in a very early public beta.' : 'Images and Sites are open. Developer tools are in private preview.'}</p></div><nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">{[...productLinks,['Developer preview','/developers'],['Privacy','/privacy'],['Terms','/terms']].map(([label,href]) => <Link key={href} href={href} className="inline-flex min-h-11 items-center hover:text-white">{label}</Link>)}</nav></div></footer>;
}
