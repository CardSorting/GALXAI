-- Provision a durable zero-balance wallet in the same transaction as signup.
-- No grants, deposit verification, or existing balances are changed.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION private.galx_provision_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.galx_wallets (user_id)
  VALUES (NEW.id::text)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.galx_provision_user_wallet() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS galx_provision_user_wallet ON auth.users;
CREATE TRIGGER galx_provision_user_wallet
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.galx_provision_user_wallet();

-- Install the trigger before backfill to close the concurrent signup gap.
INSERT INTO public.galx_wallets (user_id)
SELECT id::text FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON FUNCTION private.galx_provision_user_wallet() IS
  'Creates a zero-balance wallet atomically with Auth signup; private trigger only.';
