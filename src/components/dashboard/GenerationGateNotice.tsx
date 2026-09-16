'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';
import Link from 'next/link';
import { useGenerationAllowance } from '@/contexts/GenerationAllowanceContext';
import styles from './generation-gate.module.css';

export function useGenerationGate(kind:'sites'|'images',knownFree=false,quantity=1) {
  const {value,failed,refresh,checking}=useGenerationAllowance();
  const free=value?.plan==='free';
  const remaining=free?(kind==='sites'?value.quota.siteTurns:value.quota.images):null;
  const status=(free||knownFree) && (failed||!free)?'unavailable':free && remaining!<quantity?'exhausted':free?value.availability[kind]:null;
  return {status,remaining,refresh,checking,blocked:Boolean(status && status!=='available')};
}
export function GenerationGateNotice({kind,knownFree=false,quantity=1}:{kind:'sites'|'images';knownFree?:boolean;quantity?:number}) {
  const {status,remaining,refresh,checking}=useGenerationGate(kind,knownFree,quantity);
  if(!status)return null;
  const unit=kind==='sites'?'Site turns':'images';
  const title=status==='exhausted'?(remaining===0?'You’ve used your free '+unit: 'Not enough free images for this batch')
    : status==='paused'?'Free creation is temporarily paused'
    : status==='busy'?'Free creation is busy right now'
    : status==='unavailable'?'Free usage is temporarily unavailable'
    : `${remaining} free ${unit} left`;
  return <div className={styles.notice} data-generation-gate={kind}>
    <div role="status" aria-live="polite" aria-atomic="true"><p className={styles.title}>{title}</p>
      <p className={styles.detail}>{status==='available'?'One-time allowance. Each request uses your remaining quota.'
        : status==='exhausted'?'Your saved work is still here. Explore Pro to keep creating.'
        : 'Your prompt stays here. Check availability later, or explore Pro.'}</p></div>
    <div className={styles.actions}>{!['available','exhausted'].includes(status) && <button type="button" disabled={checking} onClick={refresh}>{checking?'Checking…':'Check availability'}</button>}
      <Link href={BILLING_PATHS.plan}>Explore Pro</Link></div>
  </div>;
}
