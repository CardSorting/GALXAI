-- Stop awards without destroying receipts, eligibility, or financial history.
-- Reapplying the up migration restores the trigger without resetting policy.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DROP TRIGGER IF EXISTS galx_award_signup_credit ON auth.users;
DROP FUNCTION IF EXISTS private.galx_award_signup_credit();
ALTER FUNCTION public.fn_record_tamper_proof_transaction(uuid,character varying,public.galx_wallet_transaction_type,numeric,numeric,text,character varying,character varying,character varying,bigint,bigint,bigint,jsonb)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_verify_wallet_ledger_integrity(character varying)
  SET search_path = public, pg_temp;
