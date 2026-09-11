-- Test-only Supabase platform prerequisites. Applied only inside the disposable fixture.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE SCHEMA private;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
ALTER DATABASE galx_integration_test SET search_path = public, extensions;
SET search_path = public, extensions;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(COALESCE(NULLIF(current_setting('request.jwt.claim.sub', true), ''), auth.jwt()->>'sub'), '')::uuid
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), auth.jwt()->>'role')
$$;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text,
  email_confirmed_at timestamptz,
  is_anonymous boolean NOT NULL DEFAULT false,
  raw_app_meta_data jsonb NOT NULL DEFAULT '{}',
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'
);
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users FORCE ROW LEVEL SECURITY;
REVOKE ALL ON auth.users FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
