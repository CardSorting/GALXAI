import type { ReactNode } from 'react';
import { Navigation } from '@/components/dashboard/Navigation';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07080d] text-white selection:bg-indigo-900 selection:text-white">
      <Navigation />
      <main id="docs-content" className="min-h-[70vh]">{children}</main>
    </div>
  );
}
