import type { ReactNode } from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { BillingWorkspace } from '@/components/billing/BillingWorkspace';

export default function BillingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#090b10] text-zinc-100"><Navigation /><BillingWorkspace>{children}</BillingWorkspace></div>;
}
