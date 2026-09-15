-- Disposable connectivity/data fixture, NOT a production migration.
-- psql supplies pool from the runner's fixed premium/standard list.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF current_database() <> 'galx_separation_proof'
     OR to_regclass('public.galx_shard_accounts') IS NOT NULL THEN
    RAISE EXCEPTION 'This fixture requires its own empty proof database';
  END IF;
END $$;
REVOKE ALL ON DATABASE galx_separation_proof FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE ROLE proof_owner NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE proof_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE proof_monitor LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT CONNECT ON DATABASE galx_separation_proof TO proof_runtime, proof_monitor;
CREATE SCHEMA separation_lab AUTHORIZATION proof_owner;
REVOKE ALL ON SCHEMA separation_lab FROM PUBLIC;
SET ROLE proof_owner;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE separation_lab.identity (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  pool text NOT NULL UNIQUE CHECK (pool IN ('premium', 'standard'))
);
CREATE TABLE separation_lab.records (
  id text PRIMARY KEY,
  pool text NOT NULL REFERENCES separation_lab.identity(pool),
  fixture_payload text NOT NULL
);
CREATE INDEX records_pool_idx ON separation_lab.records(pool);
INSERT INTO separation_lab.identity(pool) VALUES (:'pool');
INSERT INTO separation_lab.records VALUES ('fixture-account', :'pool', 'synthetic-' || :'pool');
ALTER TABLE separation_lab.identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE separation_lab.identity FORCE ROW LEVEL SECURITY;
ALTER TABLE separation_lab.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE separation_lab.records FORCE ROW LEVEL SECURITY;
CREATE POLICY identity_read ON separation_lab.identity FOR SELECT TO proof_runtime, proof_monitor USING (true);
CREATE POLICY records_read ON separation_lab.records FOR SELECT TO proof_runtime, proof_monitor USING (true);
CREATE POLICY records_insert ON separation_lab.records FOR INSERT TO proof_runtime WITH CHECK (true);
CREATE VIEW separation_lab.monitor_records WITH (security_invoker=true) AS
  SELECT id, pool FROM separation_lab.records;
GRANT USAGE ON SCHEMA separation_lab TO proof_runtime, proof_monitor;
GRANT SELECT ON separation_lab.identity TO proof_runtime, proof_monitor;
GRANT SELECT, INSERT ON separation_lab.records TO proof_runtime;
GRANT SELECT(id, pool) ON separation_lab.records TO proof_monitor;
GRANT SELECT ON separation_lab.monitor_records TO proof_monitor;
RESET ROLE;
