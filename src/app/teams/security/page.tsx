'use client';

import React from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { TeamsSubNav } from '@/components/teams/TeamsSubNav';
import { TeamSecurityClient } from '@/components/teams/TeamSecurityClient';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { Users2, Shield } from 'lucide-react';

export default function TeamsSecurityPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          workspaceContext={{ name: 'Acme AI Corp', plan: 'Small Business' }}
          items={[
            { label: 'Workspace & Teams', href: '/teams/seats', icon: Users2 },
            { label: 'Security & Identity' },
            { label: 'Security & 2FA Policies', icon: Shield, badge: 'Enforced', badgeColor: 'bg-cyan-500/20 text-cyan-300' }
          ]}
        />

        <TeamsSubNav />

        <AuthRequiredGate
          title="Sign In to Manage Organization Security"
          description="Mandatory 2FA enforcement, IP allowlisting, and session policies are private to your workspace."
          checkoutAmount={100}
        >
          <TeamSecurityClient />
        </AuthRequiredGate>
      </main>
    </div>
  );
}
