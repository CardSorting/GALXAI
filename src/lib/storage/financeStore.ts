'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PaymentMethodItem,
  WebhookEndpoint,
  PromoCredit,
  TaxInvoice,
  AuditLogEntry,
  BudgetAlertsConfig,
  AutoReloadConfig,
  SEED_PAYMENT_METHODS,
  SEED_WEBHOOKS,
  SEED_PROMOS,
  SEED_INVOICES,
  SEED_AUDIT_LOGS,
  SEED_BUDGET_ALERTS,
  SEED_AUTO_RELOAD
} from '@/lib/data/financeData';

const STORAGE_KEYS = {
  PAYMENT_METHODS: 'galxai_fin_payment_methods_v1',
  WEBHOOKS: 'galxai_fin_webhooks_v1',
  PROMOS: 'galxai_fin_promos_v1',
  INVOICES: 'galxai_fin_invoices_v1',
  AUDIT_LOGS: 'galxai_fin_audit_logs_v1',
  BUDGET_ALERTS: 'galxai_fin_budget_alerts_v1',
  AUTO_RELOAD: 'galxai_fin_auto_reload_v1'
};

const SYNC_EVENT = 'galxai_fin_state_change';

function getStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStoredJson<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

export function useFinanceStore() {
  const [paymentMethods, setPaymentMethodsState] = useState<PaymentMethodItem[]>(SEED_PAYMENT_METHODS);
  const [webhooks, setWebhooksState] = useState<WebhookEndpoint[]>(SEED_WEBHOOKS);
  const [promos, setPromosState] = useState<PromoCredit[]>(SEED_PROMOS);
  const [invoices, setInvoicesState] = useState<TaxInvoice[]>(SEED_INVOICES);
  const [auditLogs, setAuditLogsState] = useState<AuditLogEntry[]>(SEED_AUDIT_LOGS);
  const [budgetAlerts, setBudgetAlertsState] = useState<BudgetAlertsConfig>(SEED_BUDGET_ALERTS);
  const [autoReload, setAutoReloadState] = useState<AutoReloadConfig>(SEED_AUTO_RELOAD);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadFromStorage = useCallback(() => {
    setPaymentMethodsState(getStoredJson(STORAGE_KEYS.PAYMENT_METHODS, SEED_PAYMENT_METHODS));
    setWebhooksState(getStoredJson(STORAGE_KEYS.WEBHOOKS, SEED_WEBHOOKS));
    setPromosState(getStoredJson(STORAGE_KEYS.PROMOS, SEED_PROMOS));
    setInvoicesState(getStoredJson(STORAGE_KEYS.INVOICES, SEED_INVOICES));
    setAuditLogsState(getStoredJson(STORAGE_KEYS.AUDIT_LOGS, SEED_AUDIT_LOGS));
    setBudgetAlertsState(getStoredJson(STORAGE_KEYS.BUDGET_ALERTS, SEED_BUDGET_ALERTS));
    setAutoReloadState(getStoredJson(STORAGE_KEYS.AUTO_RELOAD, SEED_AUTO_RELOAD));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadFromStorage();

    const handleSync = () => {
      loadFromStorage();
    };

    window.addEventListener(SYNC_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadFromStorage]);

  // Payment Methods
  const addPaymentMethod = useCallback((brand: string, last4: string, expiry: string, isDefault = false) => {
    const newMethod: PaymentMethodItem = {
      id: `pm_${Date.now()}`,
      type: 'card',
      brand,
      last4,
      expiry,
      isDefault,
      isBackup: !isDefault
    };
    const updated = isDefault
      ? [newMethod, ...paymentMethods.map(m => ({ ...m, isDefault: false }))]
      : [...paymentMethods, newMethod];

    setPaymentMethodsState(updated);
    setStoredJson(STORAGE_KEYS.PAYMENT_METHODS, updated);
  }, [paymentMethods]);

  const removePaymentMethod = useCallback((id: string) => {
    const updated = paymentMethods.filter(m => m.id !== id);
    setPaymentMethodsState(updated);
    setStoredJson(STORAGE_KEYS.PAYMENT_METHODS, updated);
  }, [paymentMethods]);

  const setDefaultPaymentMethod = useCallback((id: string) => {
    const updated = paymentMethods.map(m => ({
      ...m,
      isDefault: m.id === id,
      isBackup: m.id !== id && m.isBackup
    }));
    setPaymentMethodsState(updated);
    setStoredJson(STORAGE_KEYS.PAYMENT_METHODS, updated);
  }, [paymentMethods]);

  // Webhooks
  const addWebhook = useCallback((name: string, url: string, events: string[]) => {
    const newWebhook: WebhookEndpoint = {
      id: `wh_${Date.now()}`,
      name,
      url,
      events,
      secret: `whsec_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`,
      status: 'active',
      lastDelivery: 'Never dispatched'
    };
    const updated = [...webhooks, newWebhook];
    setWebhooksState(updated);
    setStoredJson(STORAGE_KEYS.WEBHOOKS, updated);
  }, [webhooks]);

  const deleteWebhook = useCallback((id: string) => {
    const updated = webhooks.filter(w => w.id !== id);
    setWebhooksState(updated);
    setStoredJson(STORAGE_KEYS.WEBHOOKS, updated);
  }, [webhooks]);

  // Promos
  const redeemPromoCode = useCallback((code: string): { success: boolean; message: string; amount?: number } => {
    const codeUpper = code.trim().toUpperCase();
    const existing = promos.find(p => p.code === codeUpper);
    if (existing) {
      if (existing.status === 'exhausted' || existing.status === 'expired') {
        return { success: false, message: 'This promotion code has already been redeemed or expired.' };
      }
      return { success: true, message: `Redeemed ${existing.name}!`, amount: existing.amount };
    }

    const newPromo: PromoCredit = {
      id: `promo_${Date.now()}`,
      name: `Voucher Credit (${codeUpper})`,
      code: codeUpper,
      amount: 25.00,
      remaining: 25.00,
      expiresAt: 'Dec 31, 2026',
      status: 'active'
    };
    const updated = [newPromo, ...promos];
    setPromosState(updated);
    setStoredJson(STORAGE_KEYS.PROMOS, updated);
    return { success: true, message: `Successfully redeemed $25.00 voucher credit!`, amount: 25.00 };
  }, [promos]);

  // Audit Logs
  const recordAuditLog = useCallback((action: string, actor: string, details: string, ip: string = '127.0.0.1') => {
    const newLog: AuditLogEntry = {
      id: `log_${Date.now()}`,
      action,
      actor,
      ip,
      details,
      hash: Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      status: 'verified'
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogsState(updated);
    setStoredJson(STORAGE_KEYS.AUDIT_LOGS, updated);
  }, [auditLogs]);

  // Budget Alerts
  const updateBudgetAlerts = useCallback((newConfig: Partial<BudgetAlertsConfig>) => {
    const updated = { ...budgetAlerts, ...newConfig };
    setBudgetAlertsState(updated);
    setStoredJson(STORAGE_KEYS.BUDGET_ALERTS, updated);
  }, [budgetAlerts]);

  // Auto Reload
  const updateAutoReload = useCallback((newConfig: Partial<AutoReloadConfig>) => {
    const updated = { ...autoReload, ...newConfig };
    setAutoReloadState(updated);
    setStoredJson(STORAGE_KEYS.AUTO_RELOAD, updated);
  }, [autoReload]);

  return {
    isLoaded,
    paymentMethods,
    webhooks,
    promos,
    invoices,
    auditLogs,
    budgetAlerts,
    autoReload,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    addWebhook,
    deleteWebhook,
    redeemPromoCode,
    recordAuditLog,
    updateBudgetAlerts,
    updateAutoReload
  };
}
