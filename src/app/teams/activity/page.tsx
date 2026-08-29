'use client';

import React from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { TeamsSubNav } from '@/components/teams/TeamsSubNav';
import { TeamActivityClient } from '@/components/teams/TeamActivityClient';
import { Users2, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function TeamsActivityPage() {
  const { user } = useAuth();
  const workspaceName = user?.company || 'Acme AI Corp';
  const planName = user?.role === 'enterprise' ? 'Enterprise Fleet' : 'Small Business';

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          workspaceContext={{ name: workspaceName, plan: planName }}
          items={[
            { label: 'Workspace & Teams', href: '/teams/seats', icon: Users2 },
            { label: 'Governance & Settings' },
            { label: 'Team Activity Stream', icon: Activity, badge: 'Live Audit', badgeColor: 'bg-white/10 text-white' }
          ]}
        />

        <TeamsSubNav />

        <TeamActivityClient />
      </main>
    </div>
  );
}

