import { connectRoutes } from '@/lib/connect/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = connectRoutes.revoke;
export const OPTIONS = connectRoutes.options;
