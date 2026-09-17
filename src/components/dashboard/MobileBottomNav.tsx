'use client';

import { IntentLink as Link } from '@/components/common/IntentLink';
import { usePathname } from 'next/navigation';
import { isPublicReadingPath } from '@/lib/public-content/routes';
import { Compass, Sparkles, Code2, CreditCard, Search } from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();

  // Hide on root marketing page, public reading docs, auth, and admin surfaces
  if (
    pathname === '/' ||
    isPublicReadingPath(pathname) ||
    pathname.startsWith('/auth/') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    /^\/admin(?:\/|$)/.test(pathname)
  ) {
    return null;
  }

  const navItems = [
    { label: 'Explore', href: '/explore', icon: Compass },
    { label: 'Studio', href: '/images', icon: Sparkles },
    { label: 'Developers', href: '/developers', icon: Code2 },
    { label: 'Pricing', href: '/pricing', icon: CreditCard },
  ];

  const handleOpenSearch = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-command-menu'));
    }
  };

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/[0.08] bg-[#07090e]/95 backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom,8px)] pt-1.5 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 text-center transition-colors ${
              isActive ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${isActive ? 'bg-indigo-500/15 text-indigo-400' : ''}`}>
              <Icon size={18} />
            </div>
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}

      {/* Quick Search Button in Bottom Nav */}
      <button
        type="button"
        onClick={handleOpenSearch}
        aria-label="Open search palette"
        className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-center text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5">
          <Search size={18} />
        </div>
        <span className="text-[10px] tracking-tight">Search</span>
      </button>
    </nav>
  );
}
