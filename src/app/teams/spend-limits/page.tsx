'use client';

import React from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { TeamsSubNav } from '@/components/teams/TeamsSubNav';
import { SpendLimitsClient } from '@/components/teams/SpendLimitsClient';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { Users2, Sliders } from 'lucide-react';

export default function TeamsSpendLimitsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          workspaceContext={{ name: 'Acme AI Corp', plan: 'Small Business' }}
          items={[
            { label: 'Workspace & Teams', href: '/teams/seats', icon: Users2 },
            { label: 'Members & Access' },
            { label: 'Spend Caps & Auto-Throttling', icon: Sliders, badge: 'Active', badgeColor: 'bg-emerald-500/20 text-emerald-400' }
          ]}
        />

        <TeamsSubNav />

        <AuthRequiredGate
          title="Sign In to Manage Spend Caps"
          description="Per-member spend caps, hard freeze thresholds, and safety policies are private to your workspace."
          checkoutAmount={100}
        >
          <SpendLimitsClient />
        </AuthRequiredGate>
      </main>
    </div>
  );
}
