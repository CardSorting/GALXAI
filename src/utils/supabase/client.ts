import { createBrowserClient } from "@supabase/ssr";
import { accountClientOptions } from '@/lib/auth/account-client-options';

const defaultUrl = 'https://galx.ai';
const defaultKey = 'sb_publishable_unconfigured';

const supabaseUrl = process.env.NEXT_PUBLIC_ACCOUNT_API_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl;
const supabaseKey =
  process.env.NEXT_PUBLIC_ACCOUNT_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  defaultKey;

export const createClient = () =>
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
    accountClientOptions(),
  );
