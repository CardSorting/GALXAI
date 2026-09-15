/** Read-only operator preflight. Never presents schema presence as serving readiness. */
import { RelayAccountInventoryRepository, ACCOUNT_AUTHORITY_PROJECT } from '../src/lib/supabase/repositories/RelayAccountInventoryRepository';
try {
  const pools = await new RelayAccountInventoryRepository().read();
  console.log(JSON.stringify({ accountAuthority: ACCOUNT_AUTHORITY_PROJECT, stage: 'central-account-inventory',
    servingReadiness: 'not-verified', pools,
    next: 'Use relay-pool-services.md for host installation, manual registration, execution gates and actual serving qualification.' }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Central relay inventory unavailable.'); process.exitCode = 1;
}
