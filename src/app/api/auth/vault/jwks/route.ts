import { withDeveloperAccess } from '@/lib/security/developer-access';
import { sessionResponse } from '@/lib/auth/session-http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Native credentials use server verification; no asymmetric public signing keys are published.
export const GET = withDeveloperAccess(async () => sessionResponse({ keys: [] }));
