'use client';
import type { ReactNode } from 'react';
import { AuthRequiredGate } from './AuthRequiredGate';

export function TeamsAuthGuard({ children }: { children: ReactNode }) {
  return <AuthRequiredGate title="Sign in to your team" description="Manage your team with your GALX account.">{children}</AuthRequiredGate>;
}
