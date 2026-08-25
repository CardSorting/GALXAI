'use client';

import React from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { TeamsSubNav } from '@/components/teams/TeamsSubNav';
import { RolesMatrixClient } from '@/components/teams/RolesMatrixClient';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { Users2, ShieldCheck } from 'lucide-react';

export default function TeamsRolesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          workspaceContext={{ name: 'Acme AI Corp', plan: 'Small Business' }}
          items={[
            { label: 'Workspace & Teams', href: '/teams/seats', icon: Users2 },
            { label: 'Security & Identity' },
            { label: 'RBAC Roles & Permissions', icon: ShieldCheck, badge: '5 Roles', badgeColor: 'bg-emerald-500/20 text-emerald-400' }
          ]}
        />

        <TeamsSubNav />

        <AuthRequiredGate
          title="Sign In to Inspect RBAC Permissions"
          description="Deterministic role-based capabilities and seat access policies are private to your workspace."
          checkoutAmount={100}
        >
          <RolesMatrixClient />
        </AuthRequiredGate>
      </main>
    </div>
  );
}
