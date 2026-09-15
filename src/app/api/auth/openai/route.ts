import { connectProvider } from '@/lib/auth/provider-connection-route';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = connectProvider;
export async function OPTIONS() { return new Response(null, {status:204,headers:{'Cache-Control':'no-store'}}); }
