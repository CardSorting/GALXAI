DROP FUNCTION IF EXISTS public.fn_mark_nova_message_billing_failed(uuid, text);
DROP FUNCTION IF EXISTS public.fn_mark_nova_message_billing_sent(uuid, text);
DROP FUNCTION IF EXISTS public.fn_lease_nova_message_billing_events(integer);
ALTER TABLE IF EXISTS private.galx_message_billing_events DROP COLUMN IF EXISTS lease_until;
