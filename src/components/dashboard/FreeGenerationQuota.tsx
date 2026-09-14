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
    <span>Free generation quota:</span>{quota ? <><span className={styles.quotaCounts}>Sites: {quota.sites} <span aria-hidden="true">·</span> Images: {quota.images}</span><span>Site turns: {quota.siteTurns} of 3 left</span></>
      : <span className={styles.quotaCounts}>{failed?'Temporarily unavailable':'Loading…'}</span>}
  </div>;
}
