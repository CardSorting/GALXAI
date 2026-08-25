-- ============================================================================
-- GALXAI: Teams, Seats, Cost Centers & Enterprise Governance Mesh
-- Supabase PostgreSQL Core Schema Migration
-- Version: 14.0.0
-- ============================================================================

-- 1. ORGANIZATIONS & TEAM WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS galx_organizations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(128) NOT NULL UNIQUE,
    tier VARCHAR(32) NOT NULL DEFAULT 'small-business' CHECK (tier IN ('developer', 'small-business', 'enterprise')),
    seat_capacity INT NOT NULL DEFAULT 10 CHECK (seat_capacity >= 1),
    billing_email VARCHAR(255) NOT NULL,
    default_role VARCHAR(32) NOT NULL DEFAULT 'developer' CHECK (default_role IN ('owner', 'admin', 'developer', 'billing', 'viewer')),
    jurisdiction VARCHAR(10) NOT NULL DEFAULT 'us' CHECK (jurisdiction IN ('us', 'eu')),
    sso_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    security_policy JSONB NOT NULL DEFAULT '{"enforce2FA": true, "sessionTimeoutHours": 24, "apiKeyMaxAgeDays": 90, "allowedIpCidrs": []}'::jsonb,
    spend_safety_policy JSONB NOT NULL DEFAULT '{"globalMonthlyCapUsd": 3500, "emergencyFreezeActive": false, "throttleAction": "hard"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TEAM MEMBERS & SEAT ROSTER TABLE
CREATE TABLE IF NOT EXISTS galx_organization_members (
    id VARCHAR(64) PRIMARY KEY,
    org_id VARCHAR(64) NOT NULL REFERENCES galx_organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(255) DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'developer' CHECK (role IN ('owner', 'admin', 'developer', 'billing', 'viewer')),
    avatar_bg VARCHAR(255) DEFAULT NULL,
    assigned_keys_count INT NOT NULL DEFAULT 1 CHECK (assigned_keys_count >= 0),
    monthly_spend_usd NUMERIC(14,6) NOT NULL DEFAULT 0.0 CHECK (monthly_spend_usd >= 0),
    monthly_spend_cap_usd NUMERIC(14,6) NOT NULL DEFAULT 150.0 CHECK (monthly_spend_cap_usd >= 0),
    throttle_mode VARCHAR(16) NOT NULL DEFAULT 'hard' CHECK (throttle_mode IN ('hard', 'soft')),
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'invited')),
    sso_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    department VARCHAR(128) NOT NULL DEFAULT 'Engineering',
    cost_center_code VARCHAR(64) DEFAULT NULL,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_galx_org_member_email UNIQUE (org_id, email)
);

-- 3. GL COST CENTERS & SQUAD BUDGETS TABLE
CREATE TABLE IF NOT EXISTS galx_team_cost_centers (
    id VARCHAR(64) PRIMARY KEY,
    org_id VARCHAR(64) NOT NULL REFERENCES galx_organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL,
    lead_email VARCHAR(255) NOT NULL,
    keys_count INT NOT NULL DEFAULT 1 CHECK (keys_count >= 0),
    monthly_budget_cap_usd NUMERIC(14,6) NOT NULL CHECK (monthly_budget_cap_usd > 0),
    current_spend_usd NUMERIC(14,6) NOT NULL DEFAULT 0.0 CHECK (current_spend_usd >= 0),
    auto_throttle_mode VARCHAR(16) NOT NULL DEFAULT 'hard' CHECK (auto_throttle_mode IN ('hard', 'soft')),
    color VARCHAR(64) NOT NULL DEFAULT 'bg-amber-400',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_galx_org_cost_center_code UNIQUE (org_id, code)
);

-- 4. TEAM INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS galx_team_invitations (
    id VARCHAR(64) PRIMARY KEY,
    org_id VARCHAR(64) NOT NULL REFERENCES galx_organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'developer' CHECK (role IN ('owner', 'admin', 'developer', 'billing', 'viewer')),
    spend_cap_usd NUMERIC(14,6) NOT NULL DEFAULT 150.0 CHECK (spend_cap_usd >= 0),
    invited_by_email VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    invite_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. GOVERNANCE & SOC 2 AUDIT EVENTS TABLE
CREATE TABLE IF NOT EXISTS galx_governance_audit_events (
    id VARCHAR(64) PRIMARY KEY,
    org_id VARCHAR(64) NOT NULL REFERENCES galx_organizations(id) ON DELETE CASCADE,
    actor_name VARCHAR(255) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    category VARCHAR(32) NOT NULL CHECK (category IN ('members', 'roles', 'caps', 'sso', 'security', 'settings')),
    details TEXT NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    user_agent TEXT DEFAULT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES & QUERY OPTIMIZATION (Foreign Key Invariant Protection)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_galx_orgs_slug ON galx_organizations(slug);
CREATE INDEX IF NOT EXISTS idx_galx_orgs_tier ON galx_organizations(tier);

CREATE INDEX IF NOT EXISTS idx_galx_members_org_id ON galx_organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_galx_members_user_id ON galx_organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_galx_members_email ON galx_organization_members(email);
CREATE INDEX IF NOT EXISTS idx_galx_members_role ON galx_organization_members(role);
CREATE INDEX IF NOT EXISTS idx_galx_members_status ON galx_organization_members(status);
CREATE INDEX IF NOT EXISTS idx_galx_members_cost_center ON galx_organization_members(org_id, cost_center_code);

CREATE INDEX IF NOT EXISTS idx_galx_cost_centers_org_id ON galx_team_cost_centers(org_id);
CREATE INDEX IF NOT EXISTS idx_galx_cost_centers_code ON galx_team_cost_centers(code);

CREATE INDEX IF NOT EXISTS idx_galx_invites_org_id ON galx_team_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_galx_invites_token ON galx_team_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_galx_invites_email ON galx_team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_galx_invites_status ON galx_team_invitations(status);

CREATE INDEX IF NOT EXISTS idx_galx_audit_org_category ON galx_governance_audit_events(org_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_galx_audit_created_at ON galx_governance_audit_events(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE galx_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_organizations FORCE ROW LEVEL SECURITY;

ALTER TABLE galx_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_organization_members FORCE ROW LEVEL SECURITY;

ALTER TABLE galx_team_cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_team_cost_centers FORCE ROW LEVEL SECURITY;

ALTER TABLE galx_team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_team_invitations FORCE ROW LEVEL SECURITY;

ALTER TABLE galx_governance_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE galx_governance_audit_events FORCE ROW LEVEL SECURITY;

-- 1. Service Role Full Access
CREATE POLICY "Service role full access on galx_organizations"
    ON galx_organizations FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on galx_organization_members"
    ON galx_organization_members FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on galx_team_cost_centers"
    ON galx_team_cost_centers FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on galx_team_invitations"
    ON galx_team_invitations FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on galx_governance_audit_events"
    ON galx_governance_audit_events FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 2. Authenticated Organization Member Isolation
CREATE POLICY "Authenticated members can view their organization"
    ON galx_organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM galx_organization_members m
            WHERE m.org_id = galx_organizations.id
            AND (m.user_id = auth.uid()::text OR m.email = auth.jwt() ->> 'email')
            AND m.status = 'active'
        )
    );

CREATE POLICY "Authenticated members can view team roster"
    ON galx_organization_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM galx_organization_members m
            WHERE m.org_id = galx_organization_members.org_id
            AND (m.user_id = auth.uid()::text OR m.email = auth.jwt() ->> 'email')
            AND m.status = 'active'
        )
    );

CREATE POLICY "Authenticated members can view cost centers"
    ON galx_team_cost_centers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM galx_organization_members m
            WHERE m.org_id = galx_team_cost_centers.org_id
            AND (m.user_id = auth.uid()::text OR m.email = auth.jwt() ->> 'email')
            AND m.status = 'active'
        )
    );

CREATE POLICY "Authenticated admins can view invitations"
    ON galx_team_invitations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM galx_organization_members m
            WHERE m.org_id = galx_team_invitations.org_id
            AND (m.user_id = auth.uid()::text OR m.email = auth.jwt() ->> 'email')
            AND m.role IN ('owner', 'admin')
            AND m.status = 'active'
        )
    );

CREATE POLICY "Authenticated members can view audit logs"
    ON galx_governance_audit_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM galx_organization_members m
            WHERE m.org_id = galx_governance_audit_events.org_id
            AND (m.user_id = auth.uid()::text OR m.email = auth.jwt() ->> 'email')
            AND m.status = 'active'
        )
    );

-- ============================================================================
-- STORED PROCEDURES & ATOMIC SECURITY FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION galx_record_governance_event(
    p_org_id VARCHAR(64),
    p_actor_name VARCHAR(255),
    p_actor_email VARCHAR(255),
    p_action VARCHAR(255),
    p_category VARCHAR(32),
    p_details TEXT,
    p_ip_address VARCHAR(64) DEFAULT '127.0.0.1',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VARCHAR(64)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_event_id VARCHAR(64);
BEGIN
    v_event_id := 'evt_' || encode(gen_random_bytes(12), 'hex');
    
    INSERT INTO galx_governance_audit_events (
        id, org_id, actor_name, actor_email, action, category, details, ip_address, metadata, created_at
    ) VALUES (
        v_event_id, p_org_id, p_actor_name, p_actor_email, p_action, p_category, p_details, p_ip_address, p_metadata, NOW()
    );
    
    RETURN v_event_id;
END;
$$;
