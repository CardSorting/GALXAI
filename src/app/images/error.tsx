'use client';

import { RouteRecovery } from '@/components/common/RouteRecovery';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteRecovery title="Image Studio could not be opened" description="Try opening the workspace again in a moment." reset={reset} />;
}
