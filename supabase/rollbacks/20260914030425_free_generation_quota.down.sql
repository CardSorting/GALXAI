-- Deploy the preceding application to stop new free admissions. Preserve all
-- grants and usage; dropping these records would allow repeated welcome claims.
REVOKE ALL ON private.galx_free_generation_grants, private.galx_free_generation_usage FROM PUBLIC, anon, authenticated, service_role;
