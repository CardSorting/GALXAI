import { connectRoutes } from '@/lib/connect/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = connectRoutes.connections;
export const POST = connectRoutes.disconnect;
