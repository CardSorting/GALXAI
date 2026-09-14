'use client';

import { RouteRecovery } from '@/components/common/RouteRecovery';

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteRecovery reset={reset} />;
}
