'use client';

import React from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { TeamsSubNav } from '@/components/teams/TeamsSubNav';
import { SeatsManagementClient } from '@/components/billing/SeatsManagementClient';
import { Users2 } from 'lucide-react';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';

export default function TeamsSeatsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          workspaceContext={{ name: 'Acme AI Corp', plan: 'Small Business' }}
          items={[
            { label: 'Workspace & Teams', href: '/teams/seats', icon: Users2 },
            { label: 'Members & Access' },
            { label: 'Seats & Roster', badge: '10 Seats', badgeColor: 'bg-amber-400 text-black' }
          ]}
        />

        <TeamsSubNav />

        <AuthRequiredGate
          title="Sign In to Manage Workspace Seats"
          description="Seat allocation meters, member invitations, RBAC roles, and individual spend limits are private to your workspace."
          checkoutAmount={100}
        >
          <SeatsManagementClient />
        </AuthRequiredGate>
      </main>
    </div>
  );
}
