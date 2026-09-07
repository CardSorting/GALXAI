SET LOCAL lock_timeout = '5s';
DROP TRIGGER IF EXISTS galx_provision_user_wallet ON auth.users;
DROP FUNCTION IF EXISTS private.galx_provision_user_wallet();
-- Retain provisioned wallets: they may have acquired financial history.
