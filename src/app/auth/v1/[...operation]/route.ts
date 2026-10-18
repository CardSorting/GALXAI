import type { NextRequest } from 'next/server';
import { publicAccountApi } from '@/lib/auth/public-account-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request:NextRequest,context:{params:Promise<{operation:string[]}>}){
  return publicAccountApi(request,(await context.params).operation.join('/'));
}
export {handle as GET,handle as POST,handle as PUT,handle as DELETE};
