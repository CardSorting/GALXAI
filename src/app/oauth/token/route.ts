import { connectRoutes } from '@/lib/connect/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = connectRoutes.token;
export const OPTIONS = connectRoutes.options;
