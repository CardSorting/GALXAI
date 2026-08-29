'use client';

import React from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { TeamsSubNav } from '@/components/teams/TeamsSubNav';
import { TeamSettingsClient } from '@/components/teams/TeamSettingsClient';
import { Users2, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function TeamsSettingsPage() {
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
            { label: 'Organization Settings', icon: Settings }
          ]}
        />

        <TeamsSubNav />

        <TeamSettingsClient />
      </main>
    </div>
  );
}

