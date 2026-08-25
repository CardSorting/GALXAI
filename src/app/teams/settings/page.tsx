'use client';

import React from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { TeamsSubNav } from '@/components/teams/TeamsSubNav';
import { TeamSettingsClient } from '@/components/teams/TeamSettingsClient';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { Users2, Settings } from 'lucide-react';

export default function TeamsSettingsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          workspaceContext={{ name: 'Acme AI Corp', plan: 'Small Business' }}
          items={[
            { label: 'Workspace & Teams', href: '/teams/seats', icon: Users2 },
            { label: 'Governance & Settings' },
            { label: 'Organization Settings', icon: Settings }
          ]}
        />

        <TeamsSubNav />

        <AuthRequiredGate
          title="Sign In to Manage Organization Settings"
          description="Organization display names, URL slugs, and sovereign routing configurations are private to your workspace."
          checkoutAmount={100}
        >
          <TeamSettingsClient />
        </AuthRequiredGate>
      </main>
    </div>
  );
}
