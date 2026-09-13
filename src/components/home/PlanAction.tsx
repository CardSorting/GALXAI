'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './public-home.module.css';

export function PlanAction() {
  const { user } = useAuth();
  return <div className={styles.planAction}>
    <Link className={styles.primary} href={user ? '/billing#plan' : '/auth/signin?next=%2Fbilling%23plan'}>Continue with GALX Pro <ArrowUpRight size={18} aria-hidden="true" /></Link>
    <p>{user ? 'Review your plan in your account.' : 'Sign in to review your plan before subscribing.'}<br />Renews monthly. Cancel anytime.</p>
  </div>;
}
