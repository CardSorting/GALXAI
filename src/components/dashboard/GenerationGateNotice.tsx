'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';
import Link from 'next/link';
import { useGenerationAllowance } from '@/contexts/GenerationAllowanceContext';
import styles from './generation-gate.module.css';

export function useGenerationGate(knownFree=false,quantity=1) {
  const {value,failed,refresh,checking}=useGenerationAllowance();
  const free=value?.plan==='free';
  const remaining=free?value.quota.siteTurns:null;
  const status=(free||knownFree) && (failed||!free)?'unavailable':free && remaining!<quantity?'exhausted':free?value.availability.sites:null;
  return {status,remaining,refresh,checking,blocked:Boolean(status && status!=='available')};
}
export function GenerationGateNotice({knownFree=false,quantity=1}:{knownFree?:boolean;quantity?:number}) {
  const {status,remaining,refresh,checking}=useGenerationGate(knownFree,quantity);
  if(!status)return null;
  const title=status==='exhausted'?(remaining===0?'You’ve used your available Site turns': 'Not enough Site turns for this operation')
    : status==='paused'?'Free creation is temporarily paused'
    : status==='busy'?'Free creation is busy right now'
    : status==='unavailable'?'Free usage is temporarily unavailable'
    : `${remaining ?? 0} Site turns available`;
  return <div className={styles.notice} data-generation-gate="sites">
    <div role="status" aria-live="polite" aria-atomic="true"><p className={styles.title}>{title}</p>
      <p className={styles.detail}>{status==='available'?'Each operation uses your remaining Site turns.'
        : status==='exhausted'?'Your saved work is still here. Review available plan options.'
        : 'Your work stays here. Check availability later, or review plan options.'}</p></div>
    <div className={styles.actions}>{!['available','exhausted'].includes(status) && <button type="button" disabled={checking} onClick={refresh}>{checking?'Checking…':'Check availability'}</button>}
      <Link href={BILLING_PATHS.plan}>Review plans</Link></div>
  </div>;
}
