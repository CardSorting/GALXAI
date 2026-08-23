'use client';

import React from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { BillingSubNav } from '@/components/dashboard/BillingSubNav';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { GranularUsageExplorer } from '@/components/wallet/GranularUsageExplorer';

export default function ExpensesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Billing', href: '/billing' },
            { label: 'Expense & Cost Center Analytics' }
          ]}
        />

        <AuthRequiredGate
          title="Sign In to Access Expense Reports"
          description="Detailed model cost distributions, token volume analytics, and wholesale discount audits are private to your authenticated workspace."
          checkoutAmount={50}
        >
          <BillingSubNav />
          <GranularUsageExplorer />
        </AuthRequiredGate>
      </main>
    </div>
  );
}
