export type RoleType = 'owner' | 'admin' | 'developer' | 'billing' | 'viewer';
export type TierType = 'developer' | 'small-business' | 'enterprise';
export type JurisdictionType = 'us' | 'eu';
export type ThrottleMode = 'hard' | 'soft';

export interface TeamMember {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: RoleType;
  avatarBg: string;
  assignedKeysCount: number;
  monthlySpendUsd: number;
  monthlySpendCapUsd: number;
  status: 'active' | 'suspended' | 'invited';
  ssoEnabled: boolean;
  twoFactorEnabled: boolean;
  lastActiveAt: string;
  department: string;
  costCenterCode: string;
  throttleMode: ThrottleMode;
  joinedAt: string;
}

export interface TeamCostCenter {
  id: string;
  orgId: string;
  name: string;
  code: string;
  leadEmail: string;
  keysCount: number;
  monthlyBudgetCap: number;
  currentSpend: number;
  autoThrottleMode: ThrottleMode;
  color: string;
  createdAt: string;
}

export interface TeamInvite {
  id: string;
  orgId: string;
  email: string;
  role: RoleType;
  spendCapUsd: number;
  invitedBy: string;
  invitedAt: string;
  expiresInDays: number;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  inviteToken: string;
  magicLinkUrl: string;
}

export interface SecurityPolicy {
  enforce2FA: boolean;
  twoFactorGracePeriodDays: number;
  sessionTimeoutHours: number;
  apiKeyMaxAgeDays: number;
  allowedIpCidrs: string[];
  requireSso: boolean;
  zeroRetentionEnforced: boolean;
}

export interface SpendSafetyPolicy {
  globalMonthlyCapUsd: number;
  currentMonthSpendUsd: number;
  emergencyFreezeActive: boolean;
  defaultMemberSpendCapUsd: number;
  throttleAction: ThrottleMode;
  alertEmailRecipients: string[];
}

export interface SsoDirectoryConfig {
  domain: string;
  domainVerified: boolean;
  dnsTxtRecord: string;
  idpProvider: 'okta' | 'google' | 'azure';
  acsUrl: string;
  entityId: string;
  scimEndpoint: string;
  scimToken: string;
  isConnected: boolean;
  lastSyncAt: string;
}

export interface GovernanceAuditEvent {
  id: string;
  orgId: string;
  actorName: string;
  actorEmail: string;
  action: string;
  category: 'members' | 'roles' | 'caps' | 'sso' | 'security' | 'settings';
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface WorkspaceOrganization {
  id: string;
  name: string;
  slug: string;
  tier: TierType;
  seatCapacity: number;
  billingEmail: string;
  defaultRole: RoleType;
  jurisdiction: JurisdictionType;
  createdAt: string;
  ssoConfig: SsoDirectoryConfig;
  securityPolicy: SecurityPolicy;
  spendSafetyPolicy: SpendSafetyPolicy;
}

export const DEFAULT_ORGANIZATION: WorkspaceOrganization = {
  id: 'org_acme_corp',
  name: 'Acme AI Corporation',
  slug: 'acme-ai',
  tier: 'small-business',
  seatCapacity: 10,
  billingEmail: 'finance@acme.ai',
  defaultRole: 'developer',
  jurisdiction: 'us',
  createdAt: '2026-01-15T08:00:00Z',
  ssoConfig: {
    domain: 'acme.ai',
    domainVerified: true,
    dnsTxtRecord: 'galx-verify=9f82a1b3c4d5e6f7',
    idpProvider: 'okta',
    acsUrl: 'https://galx.ai/auth/v1/saml/acs/acme-ai',
    entityId: 'https://galx.ai/auth/v1/saml/metadata/acme-ai',
    scimEndpoint: 'https://galx.ai/scim/v2/acme-ai',
    scimToken: 'galx_scim_live_99a8b7c6d5e4f3a2',
    isConnected: true,
    lastSyncAt: '10 minutes ago',
  },
  securityPolicy: {
    enforce2FA: true,
    twoFactorGracePeriodDays: 3,
    sessionTimeoutHours: 24,
    apiKeyMaxAgeDays: 90,
    allowedIpCidrs: [
      '198.51.100.0/24 (HQ Corporate VPN)',
      '203.0.113.42/32 (SF Engineering Office)'
    ],
    requireSso: true,
    zeroRetentionEnforced: true,
  },
  spendSafetyPolicy: {
    globalMonthlyCapUsd: 3500,
    currentMonthSpendUsd: 527.20,
    emergencyFreezeActive: false,
    defaultMemberSpendCapUsd: 150,
    throttleAction: 'hard',
    alertEmailRecipients: ['finance@acme.ai', 'security@acme.ai'],
  },
};

export const SEED_MEMBERS: TeamMember[] = [
  {
    id: 'mem_1',
    orgId: 'org_acme_corp',
    name: 'Alex Rivera',
    email: 'alex@acme.ai',
    role: 'owner',
    avatarBg: 'bg-zinc-800 text-amber-300 border border-amber-500/30',
    assignedKeysCount: 3,
    monthlySpendUsd: 284.50,
    monthlySpendCapUsd: 1000.00,
    status: 'active',
    ssoEnabled: true,
    twoFactorEnabled: true,
    lastActiveAt: 'Just now',
    department: 'Executive / Engineering',
    costCenterCode: 'CC-ENG-101',
    throttleMode: 'soft',
    joinedAt: '2026-01-15',
  },
  {
    id: 'mem_2',
    orgId: 'org_acme_corp',
    name: 'Elena Rostova',
    email: 'elena@acme.ai',
    role: 'admin',
    avatarBg: 'bg-zinc-800 text-cyan-400 border border-cyan-500/30',
    assignedKeysCount: 2,
    monthlySpendUsd: 142.20,
    monthlySpendCapUsd: 500.00,
    status: 'active',
    ssoEnabled: true,
    twoFactorEnabled: true,
    lastActiveAt: '20 minutes ago',
    department: 'Platform Architecture',
    costCenterCode: 'CC-ENG-101',
    throttleMode: 'hard',
    joinedAt: '2026-01-18',
  },
  {
    id: 'mem_3',
    orgId: 'org_acme_corp',
    name: 'Marcus Chen',
    email: 'marcus@acme.ai',
    role: 'developer',
    avatarBg: 'bg-zinc-800 text-emerald-400 border border-emerald-500/30',
    assignedKeysCount: 4,
    monthlySpendUsd: 68.40,
    monthlySpendCapUsd: 250.00,
    status: 'active',
    ssoEnabled: true,
    twoFactorEnabled: true,
    lastActiveAt: '1 hour ago',
    department: 'Frontend & DX',
    costCenterCode: 'CC-ENG-101',
    throttleMode: 'hard',
    joinedAt: '2026-02-01',
  },
  {
    id: 'mem_4',
    orgId: 'org_acme_corp',
    name: 'Sarah Jenkins',
    email: 'sarah@acme.ai',
    role: 'billing',
    avatarBg: 'bg-zinc-800 text-amber-400 border border-amber-500/20',
    assignedKeysCount: 0,
    monthlySpendUsd: 0.00,
    monthlySpendCapUsd: 50.00,
    status: 'active',
    ssoEnabled: true,
    twoFactorEnabled: true,
    lastActiveAt: 'Yesterday',
    department: 'Finance & FinOps',
    costCenterCode: 'CC-OPS-501',
    throttleMode: 'soft',
    joinedAt: '2026-02-05',
  },
  {
    id: 'mem_5',
    orgId: 'org_acme_corp',
    name: 'Devin Vance',
    email: 'devin@acme.ai',
    role: 'developer',
    avatarBg: 'bg-zinc-800 text-cyan-400 border border-cyan-500/20',
    assignedKeysCount: 1,
    monthlySpendUsd: 32.10,
    monthlySpendCapUsd: 200.00,
    status: 'active',
    ssoEnabled: true,
    twoFactorEnabled: false,
    lastActiveAt: '3 days ago',
    department: 'AI Agent Swarm',
    costCenterCode: 'CC-DS-204',
    throttleMode: 'hard',
    joinedAt: '2026-02-10',
  },
  {
    id: 'mem_6',
    orgId: 'org_acme_corp',
    name: 'Chloe Tan',
    email: 'chloe@acme.ai',
    role: 'developer',
    avatarBg: 'bg-zinc-800 text-purple-400 border border-purple-500/20',
    assignedKeysCount: 1,
    monthlySpendUsd: 0.00,
    monthlySpendCapUsd: 150.00,
    status: 'invited',
    ssoEnabled: true,
    twoFactorEnabled: false,
    lastActiveAt: 'Pending Accept',
    department: 'Product Prototyping',
    costCenterCode: 'CC-PRD-405',
    throttleMode: 'hard',
    joinedAt: '2026-02-20',
  },
];

export const SEED_COST_CENTERS: TeamCostCenter[] = [
  {
    id: 'team_eng',
    orgId: 'org_acme_corp',
    name: 'Core Engineering / AI Coding (Cursor)',
    code: 'CC-ENG-101',
    leadEmail: 'eng-lead@acme.ai',
    keysCount: 6,
    monthlyBudgetCap: 1500,
    currentSpend: 495.10,
    autoThrottleMode: 'hard',
    color: 'bg-amber-400',
    createdAt: '2026-01-15',
  },
  {
    id: 'team_ds',
    orgId: 'org_acme_corp',
    name: 'Data Science & ML Research Swarm',
    code: 'CC-DS-204',
    leadEmail: 'ml-lead@acme.ai',
    keysCount: 4,
    monthlyBudgetCap: 2500,
    currentSpend: 1240.00,
    autoThrottleMode: 'hard',
    color: 'bg-cyan-400',
    createdAt: '2026-01-20',
  },
  {
    id: 'team_support',
    orgId: 'org_acme_corp',
    name: 'Autonomous Customer Support Agents',
    code: 'CC-CS-302',
    leadEmail: 'support-ops@acme.ai',
    keysCount: 2,
    monthlyBudgetCap: 800,
    currentSpend: 190.00,
    autoThrottleMode: 'soft',
    color: 'bg-emerald-400',
    createdAt: '2026-02-01',
  },
  {
    id: 'team_product',
    orgId: 'org_acme_corp',
    name: 'Product Prototyping Fleet',
    code: 'CC-PRD-405',
    leadEmail: 'pm-lead@acme.ai',
    keysCount: 3,
    monthlyBudgetCap: 500,
    currentSpend: 85.00,
    autoThrottleMode: 'hard',
    color: 'bg-indigo-400',
    createdAt: '2026-02-05',
  },
];

export const SEED_INVITES: TeamInvite[] = [
  {
    id: 'inv_101',
    orgId: 'org_acme_corp',
    email: 'marcus.lee@acme.ai',
    role: 'developer',
    spendCapUsd: 150,
    invitedBy: 'alex@acme.ai',
    invitedAt: '1 day ago',
    expiresInDays: 6,
    status: 'pending',
    inviteToken: 'galx_inv_tok_88f91a',
    magicLinkUrl: 'https://galx.ai/join/acme-ai?token=galx_inv_tok_88f91a',
  },
  {
    id: 'inv_102',
    orgId: 'org_acme_corp',
    email: 'samira.patel@acme.ai',
    role: 'developer',
    spendCapUsd: 200,
    invitedBy: 'alex@acme.ai',
    invitedAt: '3 days ago',
    expiresInDays: 4,
    status: 'pending',
    inviteToken: 'galx_inv_tok_77c22b',
    magicLinkUrl: 'https://galx.ai/join/acme-ai?token=galx_inv_tok_77c22b',
  },
];

export const SEED_AUDIT_EVENTS: GovernanceAuditEvent[] = [
  {
    id: 'evt_101',
    orgId: 'org_acme_corp',
    actorName: 'Alex Rivera',
    actorEmail: 'alex@acme.ai',
    action: 'Modified Member Spend Cap',
    category: 'caps',
    details: 'Adjusted monthly spend cap for devin@acme.ai to $200.00 USD (Hard Freeze mode)',
    ipAddress: '198.51.100.24',
    timestamp: '15 minutes ago',
  },
  {
    id: 'evt_102',
    orgId: 'org_acme_corp',
    actorName: 'Alex Rivera',
    actorEmail: 'alex@acme.ai',
    action: 'Dispatched Team Invite',
    category: 'members',
    details: 'Sent invitation token to marcus.lee@acme.ai with Developer role ($150 cap)',
    ipAddress: '198.51.100.24',
    timestamp: '1 hour ago',
  },
  {
    id: 'evt_103',
    orgId: 'org_acme_corp',
    actorName: 'Elena Rostova',
    actorEmail: 'elena@acme.ai',
    action: 'Minted Gateway API Key',
    category: 'security',
    details: 'Generated production key galx_live_9a8f.. for ML Swarm in CC-DS-204',
    ipAddress: '203.0.113.42',
    timestamp: '3 hours ago',
  },
  {
    id: 'evt_104',
    orgId: 'org_acme_corp',
    actorName: 'Okta SCIM Sync Engine',
    actorEmail: 'scim-bot@galx.ai',
    action: 'Automated SCIM Directory Sync',
    category: 'sso',
    details: 'Synchronized 6 member profiles and validated domain record @acme.ai',
    ipAddress: '10.0.4.12',
    timestamp: 'Yesterday at 4:15 PM',
  },
  {
    id: 'evt_105',
    orgId: 'org_acme_corp',
    actorName: 'Alex Rivera',
    actorEmail: 'alex@acme.ai',
    action: 'Enforced Mandatory 2FA',
    category: 'security',
    details: 'Enabled WebAuthn / TOTP security requirement with a 3-day grace period',
    ipAddress: '198.51.100.24',
    timestamp: '2 days ago',
  },
];
