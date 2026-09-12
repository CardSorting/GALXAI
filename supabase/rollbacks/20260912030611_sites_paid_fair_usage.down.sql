-- Operational rollback is non-destructive: stop admission, retain receipts and
-- pending operation_mode for recovery. Never restart the superseded paid POST.
UPDATE private.galx_sites_fair_policy SET mode='disabled',revision=revision+1,updated_at=now();
