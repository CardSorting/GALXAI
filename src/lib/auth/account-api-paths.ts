/** These handlers perform their own bounded account authentication. */
export function isAccountApiPath(pathname:string):boolean{
  return pathname.startsWith('/auth/v1/')||pathname==='/rest/v1/rpc/fn_account_session_active';
}
