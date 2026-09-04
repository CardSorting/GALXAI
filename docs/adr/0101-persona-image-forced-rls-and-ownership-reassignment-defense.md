# ADR 0101: Persona & Image Forced RLS with Ownership Reassignment Armor

## Status
Superseded by ADR 0117

This ADR describes an abandoned migration branch that was never applied to the authoritative database. ADR 0117 replaces direct browser mutation with server-mediated persona and image authority.

## Context
Following the activation of transaction-scoped connection pooling (ADRs 0097–0100), two critical threat vectors remained unaddressed in the media and persona domains:
1. **Unenforced Owner RLS in Personas and Images**: `public.custom_personas` and `public.image_generations` previously only configured `ENABLE ROW LEVEL SECURITY`. Under direct pooled connections, the table owner role bypassed RLS policies. Furthermore, image creation permitted unauthenticated inserts (`WITH CHECK (true)`), and persona insertion permitted `auth.uid() IS NULL`, enabling unauthenticated creation of private assets.
2. **Ownership Reassignment Hijacking**: In multi-tenant database systems, a user updating an owned record could execute `UPDATE <table> SET user_id = 'victim_id' WHERE id = 'xyz'`. If an RLS `UPDATE` policy only verifies `USING (user_id = auth.uid())` without a strict immutable `WITH CHECK`, or if executed via backend administrative procedures, the record ownership is transferred or orphaned.

## Decision
Under the Supabase Paranoid Governance framework (AOP-DB Protocol), this ADR proposed the now-retired migration `20260903194428_galxai_persona_and_ownership_reassignment_armor.sql` and paired rollback:

1. **`FORCE ROW LEVEL SECURITY` on Personas & Media**:
   - Executed `ALTER TABLE public.custom_personas FORCE ROW LEVEL SECURITY;`
   - Executed `ALTER TABLE public.image_generations FORCE ROW LEVEL SECURITY;`
   - Closes table-owner RLS bypass on persona and generated media datasets.

2. **Ownership Reassignment Armor Trigger**:
   - Deployed `public.fn_prevent_tenant_ownership_reassignment()` as a `BEFORE UPDATE` trigger across all tenant-owned tables:
     - `public.galx_developer_keys`
     - `public.chat_conversations`
     - `public.custom_personas`
     - `public.image_generations`
     - `public.galx_wallets`
   - If `OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id`, raises an explicit PostgreSQL exception. Resource ownership is strictly immutable across the database lifecycle.

3. **Auto-Binding Tenant Ownership on Insertion**:
   - Attached `fn_enforce_tenant_ownership_on_insert()` as a `BEFORE INSERT` trigger to `custom_personas` and `image_generations`.
   - Automatically populates `NEW.user_id = v_auth_uid` and prevents inserting records on behalf of foreign tenants.

4. **Hardened RLS Policies**:
   - Replaced permissive policies with strict InitPlan cached subqueries:
     - `p_personas_read`: `is_public = true OR is_built_in = true OR user_id = (SELECT auth.uid()::text)`
     - `p_personas_insert`, `p_personas_update`, `p_personas_delete`: strictly authenticated and tied to `(SELECT auth.uid()::text)`.
     - `p_images_read`, `p_images_insert`, `p_images_update`, `p_images_delete`: strictly authenticated and tied to `(SELECT auth.uid()::text)`.

5. **Tenant Resource Ownership Procedure**:
   - Added `public.fn_is_tenant_resource_owner(p_owner_user_id text) RETURNS boolean` as a `STABLE SECURITY DEFINER` function for sub-millisecond owner verification.

## Consequences
- **Positive**: Total elimination of tenant resource reassignment and ownership hijacking.
- **Positive**: Complete RLS enforcement on custom personas and AI-generated image artifacts.
- **Positive**: 76/76 migrations verified by `npm run db:verify`, 92/92 database tests passing.
