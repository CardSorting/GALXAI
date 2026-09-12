-- Removing this optimization preserves all Sites, conversations and versions.
DROP INDEX IF EXISTS private.galx_site_turns_recall_idx;
