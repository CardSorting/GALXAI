'use client';

import React from 'react';
import { TeamsAuthGuard } from '@/components/auth/TeamsAuthGuard';

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TeamsAuthGuard>{children}</TeamsAuthGuard>;
}
