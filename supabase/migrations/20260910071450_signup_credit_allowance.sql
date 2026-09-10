-- New, non-anonymous accounts only. Eligibility is captured at creation and
-- awarded on verified email; auth metadata and browser input never set amounts.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Hosted pgcrypto lives in extensions. Preserve function bodies and execution
-- grants while allowing the existing ledger writer/verifier to resolve digest.
ALTER FUNCTION public.fn_record_tamper_proof_transaction(uuid,character varying,public.galx_wallet_transaction_type,numeric,numeric,text,character varying,character varying,character varying,bigint,bigint,bigint,jsonb)
  SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.fn_verify_wallet_ledger_integrity(character varying)
  SET search_path = pg_catalog, public, extensions, pg_temp;

CREATE TABLE IF NOT EXISTS private.galx_signup_credit_policy (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT true,
  amount_usd numeric(14,6) NOT NULL DEFAULT 5
    CHECK (amount_usd > 0 AND amount_usd <= 1000 AND amount_usd = trunc(amount_usd, 2)),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO private.galx_signup_credit_policy(singleton) VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

-- Deliberately independent of auth.users deletion: recreating an account must
-- not reset its allowance. Only verified email digests are retained here.
CREATE TABLE IF NOT EXISTS private.galx_signup_credit_grants (
  user_id uuid PRIMARY KEY,
  amount_usd numeric(14,6) NOT NULL CHECK (amount_usd > 0 AND amount_usd <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'duplicate')),
  identity_hash text UNIQUE CHECK (identity_hash ~ '^[a-f0-9]{64}$'),
  transaction_id uuid UNIQUE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  granted_at timestamptz,
  CHECK ((status = 'granted' AND identity_hash IS NOT NULL AND transaction_id IS NOT NULL AND granted_at IS NOT NULL)
    OR (status <> 'granted' AND identity_hash IS NULL AND transaction_id IS NULL AND granted_at IS NULL))
);

ALTER TABLE private.galx_signup_credit_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_signup_credit_policy FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_signup_credit_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_signup_credit_grants FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_signup_credit_policy, private.galx_signup_credit_grants FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.galx_preserve_signup_credit_grant()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD.status <> 'pending'
    OR NEW.user_id <> OLD.user_id OR NEW.amount_usd <> OLD.amount_usd
    OR NEW.enrolled_at <> OLD.enrolled_at THEN
    RAISE EXCEPTION 'Signup credit records are immutable' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.galx_preserve_signup_credit_grant() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_preserve_signup_credit_grant ON private.galx_signup_credit_grants;
CREATE TRIGGER galx_preserve_signup_credit_grant
BEFORE UPDATE OR DELETE ON private.galx_signup_credit_grants
FOR EACH ROW EXECUTE FUNCTION private.galx_preserve_signup_credit_grant();

CREATE OR REPLACE FUNCTION private.galx_award_signup_credit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '3s' AS $$
DECLARE
  v_grant private.galx_signup_credit_grants%ROWTYPE;
  v_wallet public.galx_wallets%ROWTYPE;
  v_hash text;
  v_ledger jsonb;
BEGIN
  IF COALESCE(NEW.is_anonymous, false) OR NULLIF(btrim(NEW.email), '') IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO private.galx_signup_credit_grants(user_id, amount_usd)
    SELECT NEW.id, amount_usd FROM private.galx_signup_credit_policy
    WHERE singleton AND enabled
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  IF NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_grant FROM private.galx_signup_credit_grants
  WHERE user_id = NEW.id FOR UPDATE;
  IF NOT FOUND OR v_grant.status <> 'pending' THEN RETURN NEW; END IF;

  v_hash := encode(sha256(convert_to(lower(btrim(NEW.email)), 'UTF8')), 'hex');
  -- Serialize claims for the same verified address, including concurrent new
  -- accounts. The unique digest constraint is a second line of protection.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('signup-credit:' || v_hash, 0));
  IF EXISTS (SELECT 1 FROM private.galx_signup_credit_grants WHERE identity_hash = v_hash) THEN
    UPDATE private.galx_signup_credit_grants SET status = 'duplicate' WHERE user_id = NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.galx_wallets(user_id) VALUES (NEW.id::text) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO STRICT v_wallet FROM public.galx_wallets WHERE user_id = NEW.id::text FOR UPDATE;
  -- Respect any pre-existing debt; preserve deposits and paid-account status.
  UPDATE public.galx_wallets
  SET balance_usd = greatest(0, balance_usd - payment_debt_usd + v_grant.amount_usd),
      payment_debt_usd = greatest(0, payment_debt_usd - balance_usd - v_grant.amount_usd),
      promotional_match_usd = promotional_match_usd + v_grant.amount_usd,
      updated_at = now()
  WHERE id = v_wallet.id RETURNING * INTO v_wallet;

  v_ledger := public.fn_record_tamper_proof_transaction(
    p_wallet_id => v_wallet.id, p_user_id => NEW.id::varchar,
    p_transaction_type => 'match_grant'::public.galx_wallet_transaction_type,
    p_amount_usd => v_grant.amount_usd, p_balance_after_usd => v_wallet.balance_usd,
    p_description => 'Welcome credit', p_metadata => '{"category":"signup_credit"}'::jsonb
  );
  IF v_ledger->>'success' IS DISTINCT FROM 'true' OR v_ledger->>'transaction_id' IS NULL THEN
    RAISE EXCEPTION 'Signup credit could not be recorded';
  END IF;
  UPDATE private.galx_signup_credit_grants
  SET status = 'granted', identity_hash = v_hash,
      transaction_id = (v_ledger->>'transaction_id')::uuid, granted_at = now()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.galx_award_signup_credit() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_award_signup_credit ON auth.users;
CREATE TRIGGER galx_award_signup_credit
AFTER INSERT OR UPDATE OF email_confirmed_at, email, is_anonymous ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.galx_award_signup_credit();

COMMENT ON TABLE private.galx_signup_credit_policy IS 'Server-managed offer for future signups. Pausing or changing the amount preserves existing enrollment promises.';
COMMENT ON TABLE private.galx_signup_credit_grants IS 'Private, durable one-time allowance receipts. No backfill; no cascading deletion; no client write access.';
