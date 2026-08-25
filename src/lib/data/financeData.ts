export interface PaymentMethodItem {
  id: string;
  type: 'card' | 'ach' | 'wire';
  brand: string;
  last4: string;
  expiry?: string;
  isDefault: boolean;
  isBackup?: boolean;
}

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'failing';
  lastDelivery: string;
}

export interface PromoCredit {
  id: string;
  name: string;
  code: string;
  amount: number;
  remaining: number;
  expiresAt: string;
  status: 'active' | 'exhausted' | 'expired';
}

export interface TaxInvoice {
  id: string;
  invoiceNumber: string;
  period: string;
  issuedDate: string;
  amount: number;
  wholesaleSaved: number;
  tokensCount: number;
  status: 'paid' | 'open';
  paymentMethod: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  ip: string;
  details: string;
  hash: string;
  timestamp: string;
  status: 'verified' | 'tamper_proof';
}

export interface BudgetAlertsConfig {
  budgetCapUsd: number;
  alert50: boolean;
  alert75: boolean;
  alert90: boolean;
  alert100: boolean;
  emailAlerts: boolean;
  emailAddress: string;
  slackEnabled: boolean;
  slackWebhook: string;
  haltOnOverspend: boolean;
}

export interface AutoReloadConfig {
  enabled: boolean;
  thresholdUsd: number;
  reloadAmountUsd: number;
  monthlyReloadCapUsd: number;
  emailAlerts: boolean;
}

export const SEED_PAYMENT_METHODS: PaymentMethodItem[] = [
  {
    id: 'pm_visa_4242',
    type: 'card',
    brand: 'Visa',
    last4: '4242',
    expiry: '12/2028',
    isDefault: true
  },
  {
    id: 'pm_mc_8891',
    type: 'card',
    brand: 'Mastercard',
    last4: '8891',
    expiry: '09/2027',
    isDefault: false,
    isBackup: true
  },
  {
    id: 'pm_ach_svb',
    type: 'ach',
    brand: 'ACH Direct Debit (JPMorgan Chase)',
    last4: '9012',
    isDefault: false
  }
];

export const SEED_WEBHOOKS: WebhookEndpoint[] = [
  {
    id: 'wh_slack_fin',
    name: 'Slack #finance-alerts Webhook',
    url: 'https://hooks.slack.com/services/T0123/B0456/7890abcdef',
    events: ['billing.threshold.90', 'billing.auto_reload.success', 'key.created'],
    secret: 'whsec_9a8b7c6d5e4f3a2b1c0d',
    status: 'active',
    lastDelivery: 'Today at 04:15 UTC (200 OK)'
  },
  {
    id: 'wh_datadog',
    name: 'Datadog SIEM Security Audit Pipeline',
    url: 'https://http-intake.logs.datadoghq.com/api/v2/logs',
    events: ['key.deleted', 'budget.cap.exceeded', 'auth.failure'],
    secret: 'whsec_dd8192a73c091f82b',
    status: 'active',
    lastDelivery: 'Yesterday at 22:45 UTC (200 OK)'
  }
];

export const SEED_PROMOS: PromoCredit[] = [
  {
    id: 'promo_yc_w26',
    name: 'Y Combinator AI Batch Accelerator Grant',
    code: 'YC-W26-GRANT',
    amount: 500.00,
    remaining: 320.50,
    expiresAt: 'Dec 31, 2026',
    status: 'active'
  },
  {
    id: 'promo_dev_starter',
    name: 'Verified Developer Welcome Bonus',
    code: 'DEV-ACTIVATE-10',
    amount: 10.00,
    remaining: 0.00,
    expiresAt: 'Jul 31, 2026',
    status: 'expired'
  }
];

export const SEED_INVOICES: TaxInvoice[] = [
  {
    id: 'INV-2026-0801',
    invoiceNumber: 'INV-2026-0801',
    period: 'Aug 1, 2026 – Aug 31, 2026',
    issuedDate: 'Aug 22, 2026',
    amount: 110.00,
    wholesaleSaved: 38.40,
    tokensCount: 44200000,
    status: 'paid',
    paymentMethod: 'Visa •••• 4242'
  },
  {
    id: 'INV-2026-0701',
    invoiceNumber: 'INV-2026-0701',
    period: 'Jul 1, 2026 – Jul 31, 2026',
    issuedDate: 'Jul 31, 2026',
    amount: 250.00,
    wholesaleSaved: 83.33,
    tokensCount: 96000000,
    status: 'paid',
    paymentMethod: 'Visa •••• 4242'
  },
  {
    id: 'INV-2026-0601',
    invoiceNumber: 'INV-2026-0601',
    period: 'Jun 1, 2026 – Jun 30, 2026',
    issuedDate: 'Jun 30, 2026',
    amount: 100.00,
    wholesaleSaved: 33.33,
    tokensCount: 38500000,
    status: 'paid',
    paymentMethod: 'Visa •••• 4242'
  }
];

export const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log_01',
    action: 'AUTO_RELOAD_RULE_UPDATED',
    actor: 'admin@acme.ai',
    ip: '192.168.1.42',
    details: 'Threshold set to $10.00, Reload amount set to $50.00 (+5% Bonus)',
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    timestamp: '2026-08-22 06:12:10 UTC',
    status: 'verified'
  },
  {
    id: 'log_02',
    action: 'COMPUTE_WALLET_CREDITED',
    actor: 'system_auto_topup_daemon',
    ip: '10.0.4.19 [Internal VPC]',
    details: '+$110.00 USD credited via Visa (••4242) with +10% Volume Bonus',
    hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    timestamp: '2026-08-22 04:15:33 UTC',
    status: 'verified'
  },
  {
    id: 'log_03',
    action: 'TEAM_BUDGET_CAP_MODIFIED',
    actor: 'finance-lead@acme.ai',
    ip: '192.168.1.88',
    details: 'Cost Center CC-ENG-101 monthly budget increased to $1,500.00 USD',
    hash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    timestamp: '2026-08-21 22:45:01 UTC',
    status: 'verified'
  },
  {
    id: 'log_04',
    action: 'DEVELOPER_KEY_MINTED',
    actor: 'admin@acme.ai',
    ip: '192.168.1.42',
    details: 'Key galx_live_d819... minted for Cursor IDE (Rate: 120 RPM)',
    hash: '3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d',
    timestamp: '2026-08-21 19:30:12 UTC',
    status: 'verified'
  },
  {
    id: 'log_05',
    action: 'TAX_INVOICE_GENERATED',
    actor: 'system_billing_engine',
    ip: '10.0.1.5 [Internal Gateway]',
    details: 'Monthly tax invoice INV-2026-0801 generated for Acme AI Corp ($110.00)',
    hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    timestamp: '2026-08-21 00:00:00 UTC',
    status: 'verified'
  }
];

export const SEED_BUDGET_ALERTS: BudgetAlertsConfig = {
  budgetCapUsd: 500,
  alert50: true,
  alert75: true,
  alert90: true,
  alert100: true,
  emailAlerts: true,
  emailAddress: 'engineering-alerts@acme.ai',
  slackEnabled: true,
  slackWebhook: 'https://hooks.slack.com/services/T00/B00/XXXXX',
  haltOnOverspend: false
};

export const SEED_AUTO_RELOAD: AutoReloadConfig = {
  enabled: true,
  thresholdUsd: 10,
  reloadAmountUsd: 50,
  monthlyReloadCapUsd: 500,
  emailAlerts: true
};
