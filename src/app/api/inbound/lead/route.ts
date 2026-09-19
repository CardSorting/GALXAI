import { previewError } from '@/lib/security/developer-access';
export const dynamic = 'force-dynamic';
export function GET() { return previewError(410, 'public_access_retired', 'Self-service developer access is no longer available.'); }
export const POST = GET;
