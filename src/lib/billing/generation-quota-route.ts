import { AccountIdentityError } from '../auth/accountIdentity';
import { readGenerationAllowance, type FreeGenerationQuota } from './free-generation-contract';

export function generationQuotaRoute(deps: {
  authenticate(request: Request): Promise<{id:string}>;
  plan(owner:string): Promise<'free'|'pro'>;
  quota(owner:string): Promise<FreeGenerationQuota>;
}) {
  const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
  return async(request:Request) => {
    try {
      const actor=await deps.authenticate(request);
      if(request.method!=='GET') return Response.json({error:'Invalid quota request.'},{status:405,headers});
      if(new URL(request.url).search) return Response.json({error:'Invalid quota request.'},{status:400,headers});
      const plan=await deps.plan(actor.id);
      if(plan==='pro') return Response.json({plan:'pro',quota:null},{headers});
      const value=readGenerationAllowance({plan,quota:await deps.quota(actor.id)});
      if(!value)throw new Error();
      return Response.json(value,{headers});
    }catch(error){return Response.json({error:error instanceof AccountIdentityError?'Sign in again to view your account.':'Your free generation quota is temporarily unavailable.'},
      {status:error instanceof AccountIdentityError?error.status:503,headers});}
  };
}
