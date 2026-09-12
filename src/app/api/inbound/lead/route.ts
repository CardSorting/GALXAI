import { previewError } from '@/lib/security/developer-access';
export const dynamic = 'force-dynamic';
export function GET() { return previewError(410, 'request_access', 'Request developer preview access at /developers.'); }
export const POST = GET;
