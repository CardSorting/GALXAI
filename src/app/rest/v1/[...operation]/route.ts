import type { NextRequest } from 'next/server';
import { publicAccountApi } from '@/lib/auth/public-account-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest,context:{params:Promise<{operation:string[]}>}){
  const operation=(await context.params).operation.join('/');
  if(operation!=='rpc/fn_account_session_active')return Response.json({error:'Not found.'},{status:404,headers:{'Cache-Control':'private, no-store'}});
  return publicAccountApi(request,operation);
}
