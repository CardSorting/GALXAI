import { withDeveloperAccess } from '@/lib/security/developer-access';
import { connectProvider } from '@/lib/auth/provider-connection-route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = withDeveloperAccess(connectProvider);
