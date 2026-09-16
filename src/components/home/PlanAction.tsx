'use client';
import { BILLING_PATHS } from '@/lib/billing/navigation';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './public-home.module.css';

export function PlanAction({ className = styles.planAction, actionClassName = styles.primary }: { className?: string; actionClassName?: string } = {}) {
  const { user } = useAuth();
  return <div className={className}>
    <Link className={actionClassName} href={user ? BILLING_PATHS.plan : '/login?next=/billing/plan'}>Continue with GALX Pro <ArrowUpRight size={18} aria-hidden="true" /></Link>
    <p>{user ? 'Review your plan in your account.' : 'Sign in to review your plan before subscribing.'}<br />Renews monthly. Cancel anytime.</p>
  </div>;
}
