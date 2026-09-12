import { createDeveloperAccessHandlers } from '@/lib/auth/developer-access-route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const { GET, POST } = createDeveloperAccessHandlers();
