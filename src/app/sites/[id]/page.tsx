import { WorkspacePageGate } from '@/components/auth/WorkspacePageGate';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function SiteDetailRedirect() {
  redirect('/images');
  return null;
}

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <WorkspacePageGate pathname={`/sites/${encodeURIComponent(id)}`}>
      <SiteDetailRedirect />
    </WorkspacePageGate>
  );
}
