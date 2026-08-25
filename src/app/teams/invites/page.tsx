'use client';

import React from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { TeamsSubNav } from '@/components/teams/TeamsSubNav';
import { PendingInvitesClient } from '@/components/teams/PendingInvitesClient';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { Users2, UserPlus } from 'lucide-react';

export default function TeamsInvitesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          workspaceContext={{ name: 'Acme AI Corp', plan: 'Small Business' }}
          items={[
            { label: 'Workspace & Teams', href: '/teams/seats', icon: Users2 },
            { label: 'Members & Access' },
            { label: 'Pending Invites', icon: UserPlus, badge: '2 Pending', badgeColor: 'bg-amber-400 text-black' }
          ]}
        />

        <TeamsSubNav />

        <AuthRequiredGate
          title="Sign In to Manage Invitations"
          description="Pending team invite tokens, role assignments, and domain join settings are private to your workspace."
          checkoutAmount={100}
        >
          <PendingInvitesClient />
        </AuthRequiredGate>
      </main>
    </div>
  );
}
