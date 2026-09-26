'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './public-home.module.css';

export function PlanAction({ className = styles.planAction, actionClassName = styles.primary }: { className?: string; actionClassName?: string } = {}) {
  const { user } = useAuth();
  return <div className={className}>
    <Link className={actionClassName} href={user ? BILLING_PATHS.plan : '/login?next=/billing/plan'}>Review subscriptions <ArrowUpRight size={18} aria-hidden="true" /></Link>
    <p>Orbit supports a Star. Foundry provides private creation.<br />New subscriptions are not available yet.</p>
  </div>;
}
