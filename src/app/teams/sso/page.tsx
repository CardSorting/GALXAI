'use client';

import React from 'react';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { TeamsSubNav } from '@/components/teams/TeamsSubNav';
import { SsoDirectoryClient } from '@/components/teams/SsoDirectoryClient';
import { AuthRequiredGate } from '@/components/auth/AuthRequiredGate';
import { Users2, Lock } from 'lucide-react';

export default function TeamsSsoPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs
          workspaceContext={{ name: 'Acme AI Corp', plan: 'Small Business' }}
          items={[
            { label: 'Workspace & Teams', href: '/teams/seats', icon: Users2 },
            { label: 'Security & Identity' },
            { label: 'Enterprise SAML SSO & SCIM', icon: Lock, badge: 'Okta / Google', badgeColor: 'bg-cyan-500/20 text-cyan-300' }
          ]}
        />

        <TeamsSubNav />

        <AuthRequiredGate
          title="Sign In to Configure SAML SSO"
          description="Enterprise identity provider metadata, domain capture, and SCIM directory sync settings are private to your workspace."
          checkoutAmount={250}
        >
          <SsoDirectoryClient />
        </AuthRequiredGate>
      </main>
    </div>
  );
}
