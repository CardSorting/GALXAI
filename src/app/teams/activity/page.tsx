'use client';

import React from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { TeamsSubNav } from '@/components/teams/TeamsSubNav';
import { TeamActivityClient } from '@/components/teams/TeamActivityClient';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { Users2, Activity } from 'lucide-react';

export default function TeamsActivityPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          workspaceContext={{ name: 'Acme AI Corp', plan: 'Small Business' }}
          items={[
            { label: 'Workspace & Teams', href: '/teams/seats', icon: Users2 },
            { label: 'Governance & Settings' },
            { label: 'Team Activity Stream', icon: Activity, badge: 'Live Audit', badgeColor: 'bg-white/10 text-white' }
          ]}
        />

        <TeamsSubNav />

        <AuthRequiredGate
          title="Sign In to View Organization Activity"
          description="Governance audit logs, invitation history, and role modification records are private to your workspace."
          checkoutAmount={100}
        >
          <TeamActivityClient />
        </AuthRequiredGate>
      </main>
    </div>
  );
}
