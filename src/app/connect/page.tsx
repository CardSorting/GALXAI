import type { Metadata } from 'next';
import { ConnectPanel } from '@/components/connect/ConnectPanel';
export const metadata: Metadata = { title: 'Connected applications', description: 'Manage the applications using your GALX inference access.', robots: { index: false, follow: false } };
export default function ConnectionsPage() { return <ConnectPanel />; }
