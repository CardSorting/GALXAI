import { WorkspacePageGate } from '@/components/auth/WorkspacePageGate';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function SitesRedirect() {
  redirect('/images');
  return null;
}

export default async function SitesPage() {
  return (
    <WorkspacePageGate pathname="/sites">
      <SitesRedirect />
    </WorkspacePageGate>
  );
}
