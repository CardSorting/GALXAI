/** Validate the destination before the provisioner makes any provider writes. */
export function stripeWebhookProvisioningOrigin(appUrl: string, mode: 'live' | 'test'): string {
  let url: URL;
  try { url = new URL(appUrl); }
  catch { throw new Error('Set an explicit HTTPS NEXT_PUBLIC_APP_URL before Stripe provisioning.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Stripe provisioning requires an HTTPS application origin without credentials, port, path, query or fragment.');
  }
  const host = url.hostname.replace(/\.$/, '');
  if (host === 'api.galx.ai' || host === 'www.galx.ai') {
    throw new Error('Use the application receiver origin; the API host and redirect host cannot receive billing webhooks.');
  }
  if (mode === 'test' && host === 'galx.ai') {
    throw new Error('Test-mode webhooks require an isolated test application and database. For local testing, use stripe listen.');
  }
  return url.origin;
}
