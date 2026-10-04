'use strict';
const fs = require('node:fs');

// Explicit application configuration boundary. Host/cloud/provider management
// tokens and process-injection variables are deliberately not accepted.
const allowed = new Set([
  'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION', 'NEXT_PUBLIC_BING_SITE_VERIFICATION',
  'NEXT_PUBLIC_YANDEX_SITE_VERIFICATION', 'NEXT_PUBLIC_BAIDU_SITE_VERIFICATION',
  'DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY',
  'SUPABASE_DB_SSL_MODE', 'SUPABASE_DB_CA_CERT', 'SUPABASE_POOL_SIZE', 'SUPABASE_POOL_MAX_USES', 'SUPABASE_TIMEOUT_MS',
  'GALX_VAULT_KEY_V1', 'GALX_VAULT_ACTIVE_KEY_VERSION', 'GALX_AUDIT_SIGNING_SECRET', 'SESSION_SECRET',
  'GALX_CONNECT_ENABLED', 'GALX_CONNECT_ORIGIN', 'GALX_NOVA_RESOURCE', 'GALX_CONNECT_CLIENTS',
  'GALX_ISOLATED_RELAYS_ENABLED', 'GALX_PREMIUM_IMAGES_ENABLED', 'GALX_PREMIUM_RELAY_URL',
  'GALX_PREMIUM_RELAY_KEY', 'GALX_INTERNAL_ADMIN_KEY',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ASSETS_BUCKET_NAME',
  'R2_PRIVATE_IMAGES_BUCKET_NAME', 'R2_PUBLIC_DOMAIN', 'R2_BUCKET_NAME', 'R2_IMAGES_BUCKET_NAME',
  'R2_TRAINING_BUCKET_NAME', 'R2_WEBAPPS_BUCKET_NAME', 'R2_DREAMBEES_BUCKET_NAME', 'R2_STICKER_BUCKET_NAME',
  'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_CREDITS_WEBHOOK_SECRET',
  'STRIPE_WEBHOOK_SECRET_LIVE', 'STRIPE_WEBHOOK_SECRET_PRODUCTION',
]);
function validateConfig(input, { preparation = false } = {}) {
  if (!input || Object.getPrototypeOf(input) !== Object.prototype) throw Error('Runtime configuration must be a JSON object.');
  for (const [name, value] of Object.entries(input)) {
    if (!allowed.has(name)) throw Error('Runtime configuration contains an unapproved name.');
    if (typeof value !== 'string' || !value || value.length > 65536 || /[\u0000\r\n]/.test(value)) throw Error('Runtime configuration contains an invalid value.');
  }
  for (const name of ['GALX_VAULT_KEY_V1', 'GALX_AUDIT_SIGNING_SECRET', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'GALX_CONNECT_ENABLED', 'GALX_CONNECT_ORIGIN', 'GALX_NOVA_RESOURCE', 'GALX_CONNECT_CLIENTS']) {
    if (!input[name]) throw Error(`Runtime configuration is missing ${name}.`);
  }
  if (!['0', '1'].includes(input.GALX_CONNECT_ENABLED)) throw Error('Connect activation must be explicit.');
  if (preparation && input.GALX_CONNECT_ENABLED !== '0') throw Error('Preparation requires Connect disabled.');
  for (const name of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'GALX_CONNECT_ORIGIN', 'GALX_NOVA_RESOURCE']) {
    let url; try { url = new URL(input[name]); } catch { throw Error(`Invalid ${name}.`); }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search || url.pathname !== '/') throw Error(`Invalid ${name}.`);
  }
  let clients; try { clients = JSON.parse(input.GALX_CONNECT_CLIENTS); } catch { throw Error('Invalid client registry.'); }
  if (!Array.isArray(clients)) throw Error('Invalid client registry.');
  if (input.GALX_CONNECT_ENABLED === '1' && (!input.DATABASE_URL || clients.length === 0)) throw Error('Enabled Connect requires its existing database and registered clients.');
  for (const [name, value] of Object.entries(input)) {
    if (name.startsWith('NEXT_PUBLIC_') && /(?:PRIVATE KEY|sk_live_|sk_test_|sb_secret_|postgres(?:ql)?:\/\/)/i.test(value)) throw Error('Private material in public configuration.');
    if (name.startsWith('NEXT_PUBLIC_')) {
      let role;
      try { role = JSON.parse(Buffer.from(value.split('.')[1] || '', 'base64url').toString()).role; } catch {}
      if (role === 'service_role') throw Error('Private material in public configuration.');
    }
  }
  return Object.freeze({ ...input });
}
function readConfig(filename, options) {
  const stat = fs.lstatSync(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 262144 || (stat.mode & 0o077)) throw Error('Use a regular, owner-only runtime configuration file (chmod 600).');
  let input; try { input = JSON.parse(fs.readFileSync(filename, 'utf8')); } catch { throw Error('Invalid runtime configuration JSON.'); }
  return validateConfig(input, options);
}
module.exports = { allowed, readConfig, validateConfig };
