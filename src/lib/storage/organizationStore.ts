'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  WorkspaceOrganization,
  TeamMember,
  TeamCostCenter,
  TeamInvite,
  SecurityPolicy,
  SpendSafetyPolicy,
  GovernanceAuditEvent,
  SsoDirectoryConfig,
  RoleType,
  ThrottleMode,
  DEFAULT_ORGANIZATION,
  SEED_MEMBERS,
  SEED_COST_CENTERS,
  SEED_INVITES,
  SEED_AUDIT_EVENTS
} from '@/lib/data/organizationData';

const STORAGE_KEYS = {
  ORG: 'galxai_org_profile_v1',
  MEMBERS: 'galxai_org_members_v1',
  COST_CENTERS: 'galxai_org_cost_centers_v1',
  INVITES: 'galxai_org_invites_v1',
  AUDIT: 'galxai_org_audit_v1',
};

const SYNC_EVENT = 'galxai_org_state_change';

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

export function useOrganizationStore() {
  const [org, setOrgState] = useState<WorkspaceOrganization>(DEFAULT_ORGANIZATION);
  const [members, setMembersState] = useState<TeamMember[]>(SEED_MEMBERS);
  const [costCenters, setCostCentersState] = useState<TeamCostCenter[]>(SEED_COST_CENTERS);
  const [invites, setInvitesState] = useState<TeamInvite[]>(SEED_INVITES);
  const [auditEvents, setAuditEventsState] = useState<GovernanceAuditEvent[]>(SEED_AUDIT_EVENTS);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadFromStorage = useCallback(() => {
    setOrgState(getStoredJson(STORAGE_KEYS.ORG, DEFAULT_ORGANIZATION));
    setMembersState(getStoredJson(STORAGE_KEYS.MEMBERS, SEED_MEMBERS));
    setCostCentersState(getStoredJson(STORAGE_KEYS.COST_CENTERS, SEED_COST_CENTERS));
    setInvitesState(getStoredJson(STORAGE_KEYS.INVITES, SEED_INVITES));
    setAuditEventsState(getStoredJson(STORAGE_KEYS.AUDIT, SEED_AUDIT_EVENTS));
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

  // Append audit event
  const recordAuditEvent = useCallback((action: string, category: GovernanceAuditEvent['category'], details: string) => {
    const newEvent: GovernanceAuditEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      orgId: org.id,
      actorName: 'Alex Rivera',
      actorEmail: 'alex@acme.ai',
      action,
      category,
      details,
      ipAddress: '198.51.100.24',
      timestamp: 'Just now',
    };
    const updated = [newEvent, ...auditEvents];
    setAuditEventsState(updated);
    setStoredJson(STORAGE_KEYS.AUDIT, updated);
  }, [auditEvents, org.id]);

  // Organization Updates
  const updateOrganization = useCallback((updates: Partial<WorkspaceOrganization>) => {
    const updatedOrg = { ...org, ...updates };
    setOrgState(updatedOrg);
    setStoredJson(STORAGE_KEYS.ORG, updatedOrg);
    recordAuditEvent('Updated Organization Settings', 'settings', `Changed workspace settings for ${updatedOrg.name}`);
  }, [org, recordAuditEvent]);

  // Modify Capacity
  const setSeatCapacity = useCallback((newCapacity: number) => {
    const updatedOrg = { ...org, seatCapacity: newCapacity };
    setOrgState(updatedOrg);
    setStoredJson(STORAGE_KEYS.ORG, updatedOrg);
    recordAuditEvent('Modified Seat Capacity', 'caps', `Adjusted organization seat capacity to ${newCapacity} seats`);
  }, [org, recordAuditEvent]);

  // Member Management
  const updateMemberRole = useCallback((memberId: string, newRole: RoleType) => {
    const updated = members.map(m => {
      if (m.id === memberId) {
        return { ...m, role: newRole };
      }
      return m;
    });
    setMembersState(updated);
    setStoredJson(STORAGE_KEYS.MEMBERS, updated);
    const target = members.find(m => m.id === memberId);
    recordAuditEvent('Changed Member Role', 'roles', `Promoted/demoted ${target?.email || memberId} to ${newRole.toUpperCase()}`);
  }, [members, recordAuditEvent]);

  const updateMemberSpendCap = useCallback((memberId: string, newCap: number, mode?: ThrottleMode) => {
    const updated = members.map(m => {
      if (m.id === memberId) {
        return {
          ...m,
          monthlySpendCapUsd: newCap,
          throttleMode: mode || m.throttleMode
        };
      }
      return m;
    });
    setMembersState(updated);
    setStoredJson(STORAGE_KEYS.MEMBERS, updated);
    const target = members.find(m => m.id === memberId);
    recordAuditEvent('Modified Member Spend Cap', 'caps', `Updated monthly limit for ${target?.email || memberId} to $${newCap.toFixed(2)} USD`);
  }, [members, recordAuditEvent]);

  const removeMember = useCallback((memberId: string) => {
    const target = members.find(m => m.id === memberId);
    const updated = members.filter(m => m.id !== memberId);
    setMembersState(updated);
    setStoredJson(STORAGE_KEYS.MEMBERS, updated);
    recordAuditEvent('Revoked Team Seat', 'members', `Removed ${target?.email || memberId} from active seat roster`);
  }, [members, recordAuditEvent]);

  // Invites
  const createInvites = useCallback((emails: string[], role: RoleType, spendCapUsd: number) => {
    const newInvites: TeamInvite[] = emails.map((email, idx) => {
      const tok = `galx_inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      return {
        id: `inv_${Date.now()}_${idx}`,
        orgId: org.id,
        email,
        role,
        spendCapUsd,
        invitedBy: 'alex@acme.ai (You)',
        invitedAt: 'Just now',
        expiresInDays: 7,
        status: 'pending',
        inviteToken: tok,
        magicLinkUrl: `https://galx.ai/join/acme-ai?token=${tok}`,
      };
    });

    const updated = [...newInvites, ...invites];
    setInvitesState(updated);
    setStoredJson(STORAGE_KEYS.INVITES, updated);
    recordAuditEvent('Dispatched Invitations', 'members', `Sent ${emails.length} new team invitations with role ${role.toUpperCase()}`);
  }, [invites, org.id, recordAuditEvent]);

  const revokeInvite = useCallback((inviteId: string) => {
    const target = invites.find(i => i.id === inviteId);
    const updated = invites.filter(i => i.id !== inviteId);
    setInvitesState(updated);
    setStoredJson(STORAGE_KEYS.INVITES, updated);
    recordAuditEvent('Revoked Invitation', 'members', `Cancelled pending invitation for ${target?.email || inviteId}`);
  }, [invites, recordAuditEvent]);

  // Cost Centers
  const createCostCenter = useCallback((name: string, code: string, leadEmail: string, monthlyBudgetCap: number) => {
    const newCenter: TeamCostCenter = {
      id: `team_${Date.now()}`,
      orgId: org.id,
      name,
      code,
      leadEmail,
      keysCount: 1,
      monthlyBudgetCap,
      currentSpend: 0,
      autoThrottleMode: 'hard',
      color: 'bg-amber-400',
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [...costCenters, newCenter];
    setCostCentersState(updated);
    setStoredJson(STORAGE_KEYS.COST_CENTERS, updated);
    recordAuditEvent('Created Cost Center', 'caps', `Provisioned new GL Cost Center ${code} (${name}) with $${monthlyBudgetCap} budget`);
  }, [costCenters, org.id, recordAuditEvent]);

  // Security Policies
  const updateSecurityPolicy = useCallback((updates: Partial<SecurityPolicy>) => {
    const updatedPolicy = { ...org.securityPolicy, ...updates };
    const updatedOrg = { ...org, securityPolicy: updatedPolicy };
    setOrgState(updatedOrg);
    setStoredJson(STORAGE_KEYS.ORG, updatedOrg);
    recordAuditEvent('Updated Security Policy', 'security', 'Modified 2FA or IP allowlist security rules');
  }, [org, recordAuditEvent]);

  const addAllowedIpCidr = useCallback((cidr: string) => {
    const updatedRanges = [...org.securityPolicy.allowedIpCidrs, cidr];
    updateSecurityPolicy({ allowedIpCidrs: updatedRanges });
  }, [org.securityPolicy.allowedIpCidrs, updateSecurityPolicy]);

  const removeAllowedIpCidr = useCallback((index: number) => {
    const updatedRanges = org.securityPolicy.allowedIpCidrs.filter((_, i) => i !== index);
    updateSecurityPolicy({ allowedIpCidrs: updatedRanges });
  }, [org.securityPolicy.allowedIpCidrs, updateSecurityPolicy]);

  // Spend Safety & Emergency Kill Switch
  const toggleEmergencyFreeze = useCallback((active: boolean) => {
    const updatedSpendPolicy = { ...org.spendSafetyPolicy, emergencyFreezeActive: active };
    const updatedOrg = { ...org, spendSafetyPolicy: updatedSpendPolicy };
    setOrgState(updatedOrg);
    setStoredJson(STORAGE_KEYS.ORG, updatedOrg);
    recordAuditEvent(
      active ? 'Emergency Inference Freeze Activated' : 'Emergency Inference Freeze Lifted',
      'security',
      active ? 'All API key execution temporarily frozen across workspace' : 'Inference routing resumed normal operations'
    );
  }, [org, recordAuditEvent]);

  return {
    isLoaded,
    org,
    members,
    costCenters,
    invites,
    auditEvents,
    // Methods
    updateOrganization,
    setSeatCapacity,
    updateMemberRole,
    updateMemberSpendCap,
    removeMember,
    createInvites,
    revokeInvite,
    createCostCenter,
    updateSecurityPolicy,
    addAllowedIpCidr,
    removeAllowedIpCidr,
    toggleEmergencyFreeze,
    recordAuditEvent,
  };
}
