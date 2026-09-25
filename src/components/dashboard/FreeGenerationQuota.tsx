'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useGenerationAllowance } from '@/contexts/GenerationAllowanceContext';
import styles from './navigation.module.css';
export function FreeGenerationQuota() {
  const {user}=useAuth();
  const {value,failed}=useGenerationAllowance();
  if(!user || value?.plan==='pro')return null;
  const quota=!failed && value?.plan==='free'?value.quota:null;
  return <div className={styles.quota} role="status" aria-live="polite" aria-atomic="true">
    <span>Site workspace allowance:</span>{quota ? <span className={styles.quotaCounts}>{quota.siteTurns} Site turns</span>
      : <span className={styles.quotaCounts}>{failed?'Temporarily unavailable':'Loading…'}</span>}
  </div>;
}
