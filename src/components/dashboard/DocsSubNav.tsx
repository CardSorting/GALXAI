'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DOCS_ITEMS = [
  { name: 'Overview', href: '/docs', exact: true },
  { name: 'Quickstart', href: '/docs/quickstart' },
  { name: 'Models', href: '/docs/models-guide' },
  { name: 'API', href: '/docs/api-reference' },
  { name: 'SDKs', href: '/docs/sdks' },
  { name: 'Streaming', href: '/docs/streaming' },
  { name: 'Operations', href: '/docs/error-handling' },
] as const;

export function DocsSubNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation" className="overflow-x-auto border-y border-white/10">
      <div className="flex min-w-max items-center gap-1 py-2">
        {DOCS_ITEMS.map((item) => {
          const isActive = 'exact' in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                isActive ? 'bg-white/10 font-medium text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
