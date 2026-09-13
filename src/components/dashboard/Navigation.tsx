'use client';
import { IntentLink as Link } from '@/components/common/IntentLink';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GalxGalaxyLogo } from '@/components/brand/GalxGalaxyLogo';
const links = [{ label: 'Images', href: '/images' }, { label: 'Sites', href: '/sites' }, { label: 'Developer preview', href: '/developers' }];
export function Navigation({ variant = 'default' }: { variant?: 'default' | 'sites' }) {
  const { user, logout } = useAuth(); const pathname = usePathname();
  const items = variant === 'sites' ? [{label:'Sites',href:'/sites'},{label:'Pricing',href:'/#pricing'},{label:'FAQ',href:'/#faq'},{label:'Images',href:'/images'}] : links;
  return <header className="border-b border-white/10 bg-[#07090e]"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4">
    <Link href="/" aria-label="GALX home" className="py-2"><GalxGalaxyLogo size={30} textClassName="text-xl" /></Link>
    <nav aria-label="Main navigation" className="order-3 flex w-full flex-wrap items-center gap-6 sm:order-none sm:w-auto">{items.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined} className={`inline-flex min-h-11 items-center text-sm font-medium hover:text-white ${pathname === link.href ? 'text-white underline underline-offset-8' : 'text-zinc-300'}`}>{link.label}</Link>)}</nav>
    <div className="flex items-center gap-4 text-sm">{user ? <><Link href="/billing" className="inline-flex min-h-11 items-center">Account</Link><button onClick={() => void logout()} className="min-h-11 text-zinc-300 hover:text-white">Sign out</button></> : <Link href={variant === 'sites' ? '/auth/signin?next=%2Fsites' : '/auth/signin'} className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-4 hover:bg-white/10">Sign in</Link>}</div>
  </div></header>;
}
