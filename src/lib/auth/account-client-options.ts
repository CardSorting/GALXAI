/** Keep browser and server cookie identity stable when their API transports differ. */
export function accountClientOptions() {
  return process.env.NEXT_PUBLIC_ACCOUNT_API_URL
    ? { cookieOptions: { name: 'sb-galx-auth-token' } }
    : {};
}
